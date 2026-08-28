import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JobApplication, JobApplicationCreate } from '../job-application';

@Component({
  selector: 'app-application-form',
  imports: [CommonModule, FormsModule],
  templateUrl: './application-form.html',
  styleUrl: './application-form.scss',
})
export class ApplicationForm implements OnInit, OnChanges {
  @Input() initialData: JobApplication | null = null;
  @Input() isSubmitting = false;

  @Output() formSubmit = new EventEmitter<JobApplicationCreate>();
  @Output() formCancel = new EventEmitter<void>();

  companyName = signal('');
  role = signal('');
  status = signal('Applied');
  companySlot = signal('');
  appliedDate = signal(new Date().toISOString().split('T')[0]);
  interviewDate = signal('');
  jobUrl = signal('');
  notes = signal('');
  errorMessage = signal('');

  statusOptions = ['Applied', 'Interviewing', 'Offered', 'Rejected', 'Bookmarked'];
  slotOptions = ['None', 'A', 'B2', 'B1', 'C2', 'C1', 'C1(S)'];

  ngOnInit() {
    this.populateForm();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['initialData']) {
      this.populateForm();
    }
  }

  private populateForm() {
    if (this.initialData) {
      this.companyName.set(this.initialData.company_name || '');
      this.role.set(this.initialData.role || '');
      this.status.set(this.initialData.status || 'Applied');
      this.companySlot.set(this.initialData.company_slot || '');
      this.appliedDate.set(this.initialData.applied_date || new Date().toISOString().split('T')[0]);
      this.interviewDate.set(this.initialData.interview_date || '');
      this.jobUrl.set(this.initialData.job_url || '');
      this.notes.set(this.initialData.notes || '');
    } else {
      this.companyName.set('');
      this.role.set('');
      this.status.set('Applied');
      this.companySlot.set('');
      this.appliedDate.set(new Date().toISOString().split('T')[0]);
      this.interviewDate.set('');
      this.jobUrl.set('');
      this.notes.set('');
    }
    this.errorMessage.set('');
  }

  onSubmit() {
    if (!this.companyName().trim()) {
      this.errorMessage.set('Company Name is required.');
      return;
    }
    if (!this.role().trim()) {
      this.errorMessage.set('Role is required.');
      return;
    }
    if (!this.appliedDate()) {
      this.errorMessage.set('Applied Date is required.');
      return;
    }

    const slotVal = this.companySlot();

    const payload: JobApplicationCreate = {
      company_name: this.companyName().trim(),
      role: this.role().trim(),
      status: this.status(),
      company_slot: slotVal && slotVal !== 'None' ? slotVal : null,
      applied_date: this.appliedDate(),
      interview_date: this.interviewDate() ? this.interviewDate() : null,
      job_url: this.jobUrl().trim() ? this.jobUrl().trim() : null,
      notes: this.notes().trim() ? this.notes().trim() : null,
    };

    this.formSubmit.emit(payload);
  }

  onCancel() {
    this.formCancel.emit();
  }
}
