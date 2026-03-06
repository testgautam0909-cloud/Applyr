import { Component, Input, Output, EventEmitter, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-inline-edit',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
    ],
    templateUrl: './inline-edit.component.html',
    styleUrl: './inline-edit.component.scss'
})
export class InlineEditComponent {
    @Input({ required: true }) value: any;
    @Input() type: 'text' | 'date' | 'select' = 'text';
    @Input() options: string[] = [];
    @Input() placeholder = '';
    @Input() showIcon = true;

    @Output() save = new EventEmitter<any>();

    @ViewChild('inputField') inputField?: ElementRef<HTMLInputElement>;
    @ViewChild('selectField') selectField?: ElementRef<HTMLSelectElement>;

    protected isEditing = signal(false);
    protected editValue: any;

    protected startEdit(event?: Event): void {
        event?.stopPropagation();
        this.editValue = this.value;
        this.isEditing.set(true);

        // Auto-focus after a tick for the template to update
        setTimeout(() => {
            if (this.type === 'select') {
                this.selectField?.nativeElement.focus();
            } else {
                this.inputField?.nativeElement.focus();
                this.inputField?.nativeElement.select();
            }
        });
    }

    protected saveEdit(): void {
        if (this.editValue !== this.value) {
            this.save.emit(this.editValue);
        }
        this.isEditing.set(false);
    }

    protected cancelEdit(event?: Event): void {
        event?.stopPropagation();
        this.isEditing.set(false);
    }

    protected onBlur(): void {
        // Option 1: Save on blur
        // this.saveEdit();
        // Option 2: Just let it be, buttons will handle it. 
        // But clicking outside should probably cancel or save.
        // For now, let's keep it open so user must click check/x or press enter.
    }
}
