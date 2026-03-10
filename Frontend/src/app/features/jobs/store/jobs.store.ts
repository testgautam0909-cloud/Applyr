import { computed, inject, effect } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState, withHooks } from '@ngrx/signals';
import { JobsService } from '../services/jobs.service';
import { JobApplication, JobStatus } from '../models/job.model';

interface JobsState {
    searchTerm: string;
    statusFilter: JobStatus[];
    sortColumn: keyof JobApplication | 'createdAt';
    sortDirection: 'asc' | 'desc';
    pageSize: number;
    currentPage: number;
}

const INITIAL_STATE: JobsState = {
    searchTerm: '',
    statusFilter: [],
    sortColumn: 'createdAt',
    sortDirection: 'desc',
    pageSize: 10,
    currentPage: 0,
};

export const JobsStore = signalStore(
    { providedIn: 'root' },
    withState(INITIAL_STATE),
    withComputed((state, service = inject(JobsService)) => {
        const displayedJobs = computed(() => {
            const jobs = [...service.jobs()];
            const col = state.sortColumn();
            const dir = state.sortDirection();

            jobs.sort((a, b) => {
                const aVal = String(a[col] ?? '');
                const bVal = String(b[col] ?? '');
                const cmp = aVal.localeCompare(bVal);
                return dir === 'asc' ? cmp : -cmp;
            });

            return jobs;
        });

        const totalCount = computed(() => service.total());

        const statusCounts = computed(() => {
            const jobs = service.jobs();
            const counts: Record<string, number> = {
                all: service.total()
            };
            Object.values(JobStatus).forEach(status => {
                counts[status] = jobs.filter(j => j.status === status).length;
            });
            return counts;
        });

        const totalApplications = computed(() => {
            return service.jobs().filter(j => j.status !== JobStatus.DISCOVERY && j.status !== JobStatus.NOT_APPLIED).length;
        });

        const activeInterviews = computed(() => {
            const activeStatuses = [JobStatus.PHONE_SCREEN, JobStatus.INTERVIEWING, JobStatus.TECHNICAL_TEST, JobStatus.FINAL_ROUND];
            return service.jobs().filter(j => activeStatuses.includes(j.status)).length;
        });

        const offersReceived = computed(() => {
            return service.jobs().filter(j => j.status === JobStatus.OFFER_RECEIVED).length;
        });

        const successRate = computed(() => {
            const total = totalApplications();
            if (total === 0) return '0%';
            return Math.round((offersReceived() / total) * 100) + '%';
        });

        const upcomingRemindersCount = computed(() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return service.jobs().filter(j => {
                if (!j.reminderDate) return false;
                const rDate = new Date(j.reminderDate);
                return rDate >= today;
            }).length;
        });

        return {
            displayedJobs,
            statusCounts,
            totalCount,
            pagedJobs: displayedJobs,
            totalApplications,
            activeInterviews,
            offersReceived,
            successRate,
            upcomingRemindersCount
        };
    }),
    withMethods((store, service = inject(JobsService)) => ({
        setSearchTerm(term: string): void {
            patchState(store, { searchTerm: term, currentPage: 0 });
        },
        setStatusFilter(status: JobStatus[]): void {
            patchState(store, { statusFilter: status, currentPage: 0 });
        },
        setSort(column: keyof JobApplication): void {
            const currentCol = store.sortColumn();
            const currentDir = store.sortDirection();
            if (currentCol === column) {
                patchState(store, { sortDirection: currentDir === 'asc' ? 'desc' : 'asc' });
            } else {
                patchState(store, { sortColumn: column, sortDirection: 'asc' });
            }
        },
        setPage(pageIndex: number): void {
            patchState(store, { currentPage: pageIndex });
        },
        setPageSize(pageSize: number): void {
            patchState(store, { pageSize, currentPage: 0 });
        },
        async refresh(): Promise<void> {
            await service.fetchJobs({
                search: store.searchTerm(),
                status: store.statusFilter(),
                page: store.currentPage() + 1,
                pageSize: store.pageSize(),
            });
        }
    })),
    withHooks({
        onInit(store) {
            effect(() => {
                const search = store.searchTerm();
                const status = store.statusFilter();
                const page = store.currentPage();
                const pageSize = store.pageSize();

                store.refresh();
            });
        },
    })
);
