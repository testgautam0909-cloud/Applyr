import { GoogleGenerativeAI } from '@google/generative-ai';

export enum ModelRole {
    EXTRACTION = 'EXTRACTION',
    COMPARISON = 'COMPARISON',
    VALIDATION = 'VALIDATION',
    ENRICHMENT = 'ENRICHMENT',
}

interface ModelDef {
    id: string;
    isGemma: boolean;
}

interface KeySlot {
    index: number;
    key: string;
    modelCooldowns: Map<string, number>;
}

type ErrorKind = 'DAILY' | 'MINUTE' | 'TRANSIENT' | 'FATAL';

const MODELS: Record<string, ModelDef> = {
    'gemini-2.0-flash': { id: 'gemini-2.0-flash', isGemma: false },
    'gemini-1.5-flash': { id: 'gemini-1.5-flash', isGemma: false },
    'gemini-1.5-flash-8b': { id: 'gemini-1.5-flash-8b', isGemma: false },
    'gemma-3-27b-it': { id: 'gemma-3-27b-it', isGemma: true },
    'gemma-3-12b-it': { id: 'gemma-3-12b-it', isGemma: true },
    'gemma-3-4b-it': { id: 'gemma-3-4b-it', isGemma: true },
};

// ─── Role → Model Chains (best → fallback) ────────────────────────────────────
// Each role has 6 models — exhausts ALL options before failing
const CHAINS: Record<ModelRole, string[]> = {
    [ModelRole.EXTRACTION]: [
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemma-3-27b-it',
        'gemma-3-12b-it',
        'gemini-1.5-flash-8b',
        'gemma-3-4b-it',
    ],
    [ModelRole.COMPARISON]: [
        'gemma-3-27b-it',
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemma-3-12b-it',
        'gemini-1.5-flash-8b',
        'gemma-3-4b-it',
    ],
    [ModelRole.VALIDATION]: [
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemma-3-27b-it',
        'gemma-3-12b-it',
        'gemini-1.5-flash-8b',
        'gemma-3-4b-it',
    ],
    [ModelRole.ENRICHMENT]: [
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemma-3-27b-it',
        'gemma-3-12b-it',
        'gemini-1.5-flash-8b',
        'gemma-3-4b-it',
    ],
};

// ─── Cooldowns per error type ────────────────────────────────────────────────
const COOLDOWNS: Record<ErrorKind, number> = {
    DAILY: 23 * 60 * 60 * 1000, // 23h  — key+model dead for the day
    MINUTE: 65 * 1000,            // 65s  — RPM limit
    TRANSIENT: 6 * 1000,            // 6s   — 503/overload
    FATAL: 0,                    // 0    — bad prompt/auth, skip instantly
};

function classifyError(msg: string): ErrorKind {
    const m = msg.toLowerCase();
    if (m.includes('per day') || (m.includes('quota') && !m.includes('minute'))) return 'DAILY';
    if (m.includes('503') || m.includes('overloaded') || m.includes('service unavailable')) return 'TRANSIENT';
    if (m.includes('429') || m.includes('rate') || m.includes('too many')) return 'MINUTE';
    return 'FATAL';
}

// ─── Concurrency Limiter ──────────────────────────────────────────────────────
// Prevents Promise.all from blasting 6+ requests to the same key/model at once.
// Max 3 concurrent AI calls across the whole process.
class Semaphore {
    private running = 0;
    private queue: (() => void)[] = [];

    constructor(private max: number) { }

    async acquire(): Promise<void> {
        if (this.running < this.max) { this.running++; return; }
        return new Promise(resolve => this.queue.push(() => { this.running++; resolve(); }));
    }

    release() {
        this.running = Math.max(0, this.running - 1);
        if (this.queue.length > 0) this.queue.shift()!();
    }
}

// ─── Logger ───────────────────────────────────────────────────────────────────
function log(level: 'INFO' | 'WARN' | 'ERROR', role: string, keyIdx: number, modelId: string, msg: string) {
    const ts = new Date().toISOString().slice(11, 19);
    const icon = level === 'INFO' ? '✓' : level === 'WARN' ? '⚠' : '✗';
    const line = `[${ts}][ModelRouter][${role}][KEY-${keyIdx}][${modelId}] ${icon} ${msg}`;
    if (level === 'ERROR') console.error(line);
    else if (level === 'WARN') console.warn(line);
    else console.log(line);
}

// ─── ModelRouter ──────────────────────────────────────────────────────────────
export class ModelRouter {
    private slots: KeySlot[];
    // Max 3 concurrent AI calls — prevents burning all 3 keys simultaneously
    private sem = new Semaphore(3);

    constructor(apiKeys: string[]) {
        if (!apiKeys?.length) throw new Error('ModelRouter: no API keys provided');
        this.slots = apiKeys.map((key, i) => ({
            index: i + 1,
            key,
            modelCooldowns: new Map(),
        }));
        console.log(`[ModelRouter] Initialized with ${this.slots.length} key(s) | max concurrency: 3`);
    }

    // ── Is this key+model pair available right now? ──────────────────────────
    private isAvailable(slot: KeySlot, modelId: string): boolean {
        const until = slot.modelCooldowns.get(modelId) ?? 0;
        if (until > 0 && Date.now() > until) {
            slot.modelCooldowns.delete(modelId); // expired — clear it
            return true;
        }
        return until === 0;
    }

    // ── Apply cooldown to a specific key+model pair ──────────────────────────
    private applyCooldown(slot: KeySlot, modelId: string, kind: ErrorKind) {
        const ms = COOLDOWNS[kind];
        if (!ms) return;
        slot.modelCooldowns.set(modelId, Date.now() + ms);
    }

    // ── Are ALL keys on cooldown for this model? ─────────────────────────────
    private allKeysOnCooldown(modelId: string): boolean {
        return this.slots.every(s => !this.isAvailable(s, modelId));
    }

    // ── How long until the soonest key recovers for this model? ─────────────
    private soonestRecovery(modelId: string): number {
        const now = Date.now();
        const waits = this.slots
            .map(s => (s.modelCooldowns.get(modelId) ?? 0) - now)
            .filter(w => w > 0);
        return waits.length ? Math.min(...waits) : 0;
    }

    private sleep(ms: number) {
        return new Promise<void>(r => setTimeout(r, ms));
    }

    // ─── Core Call ───────────────────────────────────────────────────────────
    async call(role: ModelRole, prompt: string, wantJson = false, temperature = 0.1): Promise<string> {
        const chain = CHAINS[role];
        let lastError: Error | null = null;

        for (let modelIdx = 0; modelIdx < chain.length; modelIdx++) {
            const modelId = chain[modelIdx]!;
            const def = MODELS[modelId];
            const isLastModel = modelIdx === chain.length - 1;

            if (!def) continue;

            // ── All keys on cooldown for this model? ──────────────────────
            if (this.allKeysOnCooldown(modelId)) {
                const wait = this.soonestRecovery(modelId);

                if (!isLastModel) {
                    // There are more models to try — don't wait, skip NOW
                    console.warn(`[ModelRouter][${role}][${modelId}] All keys cooling (${Math.ceil(wait / 1000)}s) — skipping to next model`);
                    continue;
                }

                // Last model in chain — worth waiting if cooldown is short
                if (wait > 0 && wait < 90_000) {
                    console.warn(`[ModelRouter][${role}][${modelId}] Last model, waiting ${Math.ceil(wait / 1000)}s for key recovery...`);
                    await this.sleep(wait + 500);
                } else {
                    console.error(`[ModelRouter][${role}] All models in chain exhausted (daily limits hit)`);
                    break;
                }
            }

            // ── Try each available key for this model ────────────────────
            for (const slot of this.slots) {
                if (!this.isAvailable(slot, modelId)) continue;

                // Acquire concurrency slot (blocks if 3 calls already in-flight)
                await this.sem.acquire();
                log('INFO', role, slot.index, modelId, `Calling...`);

                try {
                    const genConfig: Record<string, any> = { temperature };
                    if (wantJson && !def.isGemma) genConfig.responseMimeType = 'application/json';

                    const model = new GoogleGenerativeAI(slot.key).getGenerativeModel({
                        model: modelId,
                        generationConfig: genConfig,
                    });

                    const result = await model.generateContent(prompt);
                    const text = result.response.text();
                    this.sem.release();

                    if (!text?.trim()) throw new Error('Empty response from model');
                    log('INFO', role, slot.index, modelId, `Success (${text.length} chars)`);
                    return text;

                } catch (err: any) {
                    this.sem.release();
                    lastError = err;
                    const errMsg = err.message ?? String(err);
                    const kind = classifyError(errMsg);

                    log('WARN', role, slot.index, modelId, `${kind}: ${errMsg.slice(0, 120)}`);
                    this.applyCooldown(slot, modelId, kind);

                    if (kind === 'FATAL') {
                        // Bad prompt/auth — no point trying other keys, go to next model
                        log('ERROR', role, slot.index, modelId, `Fatal error — moving to next model`);
                        break;
                    }

                    if (kind === 'TRANSIENT') await this.sleep(COOLDOWNS.TRANSIENT);
                    // MINUTE/DAILY: key is now cooled, loop picks next available key
                }
            }

            // After exhausting all keys for this model, log and let outer loop try next model
            if (this.allKeysOnCooldown(modelId) && !isLastModel) {
                console.warn(`[ModelRouter][${role}][${modelId}] All keys exhausted → falling to next model in chain`);
            }
        }

        const msg = `[ModelRouter] All ${chain.length} models in chain exhausted for role ${role}`;
        console.error(msg);
        throw lastError ?? new Error(msg);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────
    async callJSON<T = any>(role: ModelRole, prompt: string, temperature = 0.1): Promise<T> {
        const raw = await this.call(role, prompt, true, temperature);
        return ModelRouter.parseJSON<T>(raw);
    }

    async callText(role: ModelRole, prompt: string, temperature = 0.1): Promise<string> {
        return this.call(role, prompt, false, temperature);
    }

    // ─── Statics ─────────────────────────────────────────────────────────────
    static parseJSON<T = any>(raw: string): T {
        if (!raw?.trim()) throw new Error('Empty model response');
        const cleaned = raw
            .replace(/^```(?:json)?\s*/im, '')
            .replace(/\s*```\s*$/im, '')
            .trim();
        try { return JSON.parse(cleaned); }
        catch {
            const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
            if (match) { try { return JSON.parse(match[1]!); } catch { /* fall through */ } }
            throw new Error(`Cannot parse JSON: ${cleaned.slice(0, 300)}`);
        }
    }

    static toArr(val: any): string[] {
        if (!val) return [];
        if (Array.isArray(val)) return val.map(String).filter(s => s.trim().length > 1);
        if (typeof val === 'string' && val.trim().length > 1) return [val.trim()];
        return [];
    }

    static toScore(val: any): number {
        const n = Number(val);
        return isNaN(n) ? 0 : Math.min(100, Math.max(0, Math.round(n)));
    }
}