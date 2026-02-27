import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'jobs',
    pathMatch: 'full'
  },
  {
    path: 'jobs',
    loadComponent: () => import('./components/job-table/job-table').then(m => m.JobTable)
  },
  {
    path: '**',
    redirectTo: 'jobs'
  }
];
