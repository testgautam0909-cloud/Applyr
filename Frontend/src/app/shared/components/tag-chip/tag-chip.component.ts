import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tag-chip',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="badge rounded-pill tech-tag d-inline-flex align-items-center gap-1" [class.removable]="removable">
      {{ label }}
      <button *ngIf="removable" class="btn-close btn-close-white p-0" style="width: 10px; height: 10px;"
        (click)="remove.emit($event)" type="button" aria-label="Remove">
      </button>
    </span>
  `,
  styles: [`
    .tech-tag {
      background-color: #CCFBF1;
      color: #0F766E;
      font-size: 11px;
      font-weight: 500;
      padding: 4px 10px;
      cursor: default;
      border: 1px solid color-mix(in srgb, #0F766E 10%, transparent);

      &.removable {
        padding-right: 8px;
      }
    }

    .btn-close {
        filter: invert(34%) sepia(87%) saturate(362%) hue-rotate(125deg) brightness(92%) contrast(92%);
        opacity: 0.8;
        &:hover { opacity: 1; }
    }
  `]
})
export class TagChipComponent {
  @Input({ required: true }) label!: string;
  @Input() removable = false;

  @Output() remove = new EventEmitter<Event>();
}
