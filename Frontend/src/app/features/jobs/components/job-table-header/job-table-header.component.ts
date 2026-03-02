import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'thead[app-job-table-header]',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './job-table-header.component.html',
  styles: [`
    th {
      font-size: 12px;
      font-weight: 600;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.025em;

      &.sortable {
        cursor: pointer;
        user-select: none;
        
        &:hover {
          color: #6B21A8;
        }
      }
      
      i.bi {
        font-size: 10px;
        vertical-align: middle;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JobTableHeaderComponent {
  @Input() sortColumn = '';
  @Input() sortDirection: 'asc' | 'desc' = 'asc';
  @Output() sort = new EventEmitter<string>();

  protected toggleSort(column: string): void {
    this.sort.emit(column);
  }
}
