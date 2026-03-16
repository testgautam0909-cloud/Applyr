import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { QueueItem } from '../models/queue.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class QueueService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/queue`;

    fetchQueue(): Observable<QueueItem[]> {
        return this.http.get<QueueItem[]>(this.apiUrl);
    }

    addToQueue(data: { url: string; html: string; executionURL?: string }): Observable<QueueItem> {
        return this.http.post<QueueItem>(this.apiUrl, { ...data, status: 'pending' });
    }

    updateQueueItem(id: string, data: Partial<QueueItem>): Observable<QueueItem> {
        return this.http.put<QueueItem>(`${this.apiUrl}/${id}`, data);
    }

    deleteQueueItem(id: string): Observable<QueueItem> {
        return this.http.delete<QueueItem>(`${this.apiUrl}/${id}`);
    }
}
