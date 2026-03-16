import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'jobs',
    pathMatch: 'full'
  },
  {
    path: 'jobs',
    loadComponent: () => import('./features/jobs/containers/jobs-page/jobs-page.component').then(m => m.JobsPageComponent)
  },
  {
    path: 'queue',
    loadComponent: () => import('./features/queue/containers/queue-page/queue-page.component').then(m => m.QueuePageComponent)
  },
  {
    path: '**',
    redirectTo: 'jobs'
  }
];
