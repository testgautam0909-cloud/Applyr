import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { JobApplication, JobStatus, UpdateJobPayload } from '../models/job.model';
import { environment } from '../../../../environments/environment';

interface PaginatedResponse {
    jobs: JobApplication[];
    total: number;
    page: number;
    pageSize: number;
}

@Injectable({ providedIn: 'root' })
export class JobsService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/jobs`;

    private readonly _jobs = signal<JobApplication[]>([]);
    private readonly _total = signal<number>(0);
    private readonly _loading = signal<boolean>(false);
    private readonly _error = signal<string | null>(null);

    readonly jobs = this._jobs.asReadonly();
    readonly total = this._total.asReadonly();
    readonly loading = this._loading.asReadonly();
    readonly error = this._error.asReadonly();
    readonly isEmpty = computed(() => this._jobs().length === 0 && this._total() === 0);
    readonly apiBaseUrl = environment.apiUrl;

    async fetchJobs(params?: { search?: string; status?: string[]; page?: number; pageSize?: number }) {
        this._loading.set(true);
        this._error.set(null);
        try {
            const queryParams = new URLSearchParams();

            if (params?.search) {
                queryParams.append('search', params.search);
            }
            if (params?.status && params.status.length > 0) {
                params.status.forEach(s => queryParams.append('status', s));
            }

            queryParams.append('page', String(params?.page ?? 1));
            queryParams.append('pageSize', String(params?.pageSize ?? 10));

            const url = `${this.apiUrl}?${queryParams.toString()}`;

            const response = await lastValueFrom(this.http.get<PaginatedResponse>(url));
            this._jobs.set(response.jobs);
            this._total.set(response.total);
        } catch (error: any) {
            console.error('Failed to fetch jobs from API', error);
            this._error.set(error.message || 'Unknown connection error');
        } finally {
            this._loading.set(false);
        }
    }

    async updateJob(payload: UpdateJobPayload): Promise<void> {
        const { id, ...data } = payload;
        const previousJobs = [...this._jobs()];

        this._jobs.update(jobs => jobs.map(j => j.id === id ? { ...j, ...data } as JobApplication : j));

        try {
            const updatedJob = await lastValueFrom(this.http.patch<JobApplication>(`${this.apiUrl}/${id}`, data));
            this._jobs.update(jobs => jobs.map(j => j.id === id ? updatedJob : j));
        } catch (error) {
            console.error('Failed to update job, reverting', error);
            this._jobs.set(previousJobs);
        }
    }

    async updateJobField(id: string, field: keyof JobApplication, value: any): Promise<void> {
        const previousJobs = [...this._jobs()];
        this._jobs.update(jobs => jobs.map(j => j.id === id ? { ...j, [field]: value } : j));

        try {
            const updatedJob = await lastValueFrom(this.http.patch<JobApplication>(`${this.apiUrl}/${id}`, { [field]: value }));
            this._jobs.update(jobs => jobs.map(j => j.id === id ? updatedJob : j));
        } catch (error) {
            console.error('Failed to update job field, reverting', error);
            this._jobs.set(previousJobs);
        }
    }

    async updateMultipleFields(id: string, updates: Partial<JobApplication>): Promise<void> {
        const previousJobs = [...this._jobs()];
        this._jobs.update(jobs => jobs.map(j => j.id === id ? { ...j, ...updates } as JobApplication : j));

        try {
            const updatedJob = await lastValueFrom(this.http.patch<JobApplication>(`${this.apiUrl}/${id}`, updates));
            this._jobs.update(jobs => jobs.map(j => j.id === id ? updatedJob : j));
        } catch (error) {
            console.error('Failed to update multiple fields, reverting', error);
            this._jobs.set(previousJobs);
        }
    }

    async deleteJob(id: string): Promise<void> {
        try {
            await lastValueFrom(this.http.delete(`${this.apiUrl}/${id}`));
            this._jobs.update(jobs => jobs.filter(j => j.id !== id));
            this._total.update(t => Math.max(0, t - 1));
        } catch (error) {
            console.error('Failed to delete job', error);
        }
    }

    async restoreJob(job: JobApplication): Promise<void> {
        try {
            const { id, ...data } = job;
            const restoredJob = await lastValueFrom(this.http.post<JobApplication>(this.apiUrl, data));
            this._jobs.update(jobs => [restoredJob, ...jobs]);
            this._total.update(t => t + 1);
        } catch (error) {
            console.error('Failed to restore job', error);
        }
    }
}
