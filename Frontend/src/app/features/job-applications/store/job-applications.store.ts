import { computed, inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { JobApplicationService } from '../api/job-application.service';
import { JobApplication, JobStatus } from '../types/job-application.type';

interface JobApplicationsState {
    searchTerm: string;
    statusFilter: JobStatus[];
    sortColumn: string;
    sortDirection: 'asc' | 'desc';
    editingCell: { jobId: string; field: keyof JobApplication; index?: number } | null;
    pageSize: number;
    currentPage: number;
}

const INITIAL_STATE: JobApplicationsState = {
    searchTerm: '',
    statusFilter: [],
    sortColumn: 'appliedDate',
    sortDirection: 'desc',
    editingCell: null,
    pageSize: 10,
    currentPage: 0,
};

export const JobApplicationsStore = signalStore(
    { providedIn: 'root' },
    withState(INITIAL_STATE),
    withComputed((state, service = inject(JobApplicationService)) => ({
        filteredJobs: computed(() => {
            let jobs = [...service.jobs()];

            // Text search
            const term = state.searchTerm().toLowerCase().trim();
            if (term) {
                jobs = jobs.filter(
                    (j) =>
                        j.jobTitle.toLowerCase().includes(term) ||
                        j.company.toLowerCase().includes(term) ||
                        j.location.toLowerCase().includes(term) ||
                        j.techStack.some((t: string) => t.toLowerCase().includes(term)) ||
                        j.status.toLowerCase().includes(term)
                );
            }

            // Status filter
            const statusFilter = state.statusFilter();
            if (statusFilter && statusFilter.length > 0) {
                jobs = jobs.filter((j) => statusFilter.includes(j.status));
            }

            // Sort
            const col = state.sortColumn() as keyof typeof jobs[0];
            const dir = state.sortDirection();
            jobs.sort((a, b) => {
                const aVal = (a[col] ?? '') as string;
                const bVal = (b[col] ?? '') as string;
                const cmp = aVal.localeCompare(bVal);
                return dir === 'asc' ? cmp : -cmp;
            });

            return jobs;
        }),
        hasJobs: computed(() => service.jobs().length > 0),
        isEditing: computed(() => (jobId: string, field: string, index?: number) => {
            const current = state.editingCell();
            return current?.jobId === jobId && current?.field === field && current?.index === index;
        }),
        statusCounts: computed(() => {
            const jobs = service.jobs();
            const counts: Record<string, number> = {
                all: jobs.length
            };
            Object.values(JobStatus).forEach(status => {
                counts[status] = jobs.filter(j => j.status === status).length;
            });
            return counts;
        }),
        totalCount: computed(() => {
            // Apply same filtering logic as filteredJobs but don't return the full array
            let jobs = [...service.jobs()];

            // Text search
            const term = state.searchTerm().toLowerCase().trim();
            if (term) {
                jobs = jobs.filter(
                    (j) =>
                        j.jobTitle.toLowerCase().includes(term) ||
                        j.company.toLowerCase().includes(term) ||
                        j.location.toLowerCase().includes(term) ||
                        j.techStack.some((t: string) => t.toLowerCase().includes(term)) ||
                        j.status.toLowerCase().includes(term)
                );
            }

            // Status filter
            const statusFilter = state.statusFilter();
            if (statusFilter && statusFilter.length > 0) {
                jobs = jobs.filter((j) => statusFilter.includes(j.status));
            }

            return jobs.length;
        }),
        pagedJobs: computed(() => {
            // Apply same filtering logic as filteredJobs
            let jobs = [...service.jobs()];

            // Text search
            const term = state.searchTerm().toLowerCase().trim();
            if (term) {
                jobs = jobs.filter(
                    (j) =>
                        j.jobTitle.toLowerCase().includes(term) ||
                        j.company.toLowerCase().includes(term) ||
                        j.location.toLowerCase().includes(term) ||
                        j.techStack.some((t: string) => t.toLowerCase().includes(term)) ||
                        j.status.toLowerCase().includes(term)
                );
            }

            // Status filter
            const statusFilter = state.statusFilter();
            if (statusFilter && statusFilter.length > 0) {
                jobs = jobs.filter((j) => statusFilter.includes(j.status));
            }

            // Sort
            const col = state.sortColumn() as keyof typeof jobs[0];
            const dir = state.sortDirection();
            jobs.sort((a, b) => {
                const aVal = (a[col] ?? '') as string;
                const bVal = (b[col] ?? '') as string;
                const cmp = aVal.localeCompare(bVal);
                return dir === 'asc' ? cmp : -cmp;
            });

            const start = state.currentPage() * state.pageSize();
            const end = start + state.pageSize();
            return jobs.slice(start, end);
        })
    })),
    withMethods((store) => ({
        setSearchTerm(term: string): void {
            patchState(store, { searchTerm: term });
        },
        setStatusFilter(status: JobStatus[]): void {
            patchState(store, { statusFilter: status });
        },
        setSort(column: string): void {
            const currentCol = store.sortColumn();
            const currentDir = store.sortDirection();
            if (currentCol === column) {
                patchState(store, { sortDirection: currentDir === 'asc' ? 'desc' : 'asc' });
            } else {
                patchState(store, { sortColumn: column, sortDirection: 'asc' });
            }
        },
        setEditingCell(jobId: string, field: keyof JobApplication, index?: number): void {
            patchState(store, { editingCell: { jobId, field, index } });
        },
        clearEditingCell(): void {
            patchState(store, { editingCell: null });
        },
        setPage(pageIndex: number): void {
            patchState(store, { currentPage: pageIndex });
        },
        setPageSize(pageSize: number): void {
            patchState(store, { pageSize, currentPage: 0 }); // Reset to first page when size changes
        }
    }))
);