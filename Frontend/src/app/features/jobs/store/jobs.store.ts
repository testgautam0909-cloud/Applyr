import { computed, inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { JobsService } from '../services/jobs.service';
import { JobApplication, JobStatus } from '../models/job.model';

interface JobsState {
    searchTerm: string;
    statusFilter: JobStatus[];
    sortColumn: keyof JobApplication;
    sortDirection: 'asc' | 'desc';
    pageSize: number;
    currentPage: number;
}

const INITIAL_STATE: JobsState = {
    searchTerm: '',
    statusFilter: [],
    sortColumn: 'appliedDate',
    sortDirection: 'desc',
    pageSize: 10,
    currentPage: 0,
};

export const JobsStore = signalStore(
    { providedIn: 'root' },
    withState(INITIAL_STATE),
    withComputed((state, service = inject(JobsService)) => {
        const filteredJobs = computed(() => {
            let jobs = [...service.jobs()];

            const term = state.searchTerm().toLowerCase().trim();
            if (term) {
                jobs = jobs.filter(
                    (j) =>
                        j.jobTitle.toLowerCase().includes(term) ||
                        j.company.toLowerCase().includes(term) ||
                        j.location.toLowerCase().includes(term) ||
                        j.status.toLowerCase().includes(term)
                );
            }

            const statusFilter = state.statusFilter();
            if (statusFilter && statusFilter.length > 0) {
                jobs = jobs.filter((j) => statusFilter.includes(j.status));
            }

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

        const statusCounts = computed(() => {
            const jobs = service.jobs();
            const counts: Record<string, number> = {
                all: jobs.length
            };
            Object.values(JobStatus).forEach(status => {
                counts[status] = jobs.filter(j => j.status === status).length;
            });
            return counts;
        });

        const totalCount = computed(() => {
            let jobs = [...service.jobs()];
            const term = state.searchTerm().toLowerCase().trim();
            if (term) {
                jobs = jobs.filter(
                    (j) =>
                        j.jobTitle.toLowerCase().includes(term) ||
                        j.company.toLowerCase().includes(term) ||
                        j.location.toLowerCase().includes(term) ||
                        j.status.toLowerCase().includes(term)
                );
            }
            const statusFilter = state.statusFilter();
            if (statusFilter && statusFilter.length > 0) {
                jobs = jobs.filter((j) => statusFilter.includes(j.status));
            }
            return jobs.length;
        });

        const pagedJobs = computed(() => {
            const filtered = filteredJobs();
            const start = state.currentPage() * state.pageSize();
            const end = start + state.pageSize();
            return filtered.slice(start, end);
        });

        return {
            filteredJobs,
            statusCounts,
            totalCount,
            pagedJobs
        };
    }),
    withMethods((store) => ({
        setSearchTerm(term: string): void {
            patchState(store, { searchTerm: term });
        },
        setStatusFilter(status: JobStatus[]): void {
            patchState(store, { statusFilter: status });
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
        }
    }))
);
