import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../auth';
import { ApplicationsService } from '../applications';
import { JobApplication, JobApplicationCreate } from '../job-application';
import { ApplicationForm } from '../application-form/application-form';
import { GlowingCard } from '../glowing-card/glowing-card';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, FormsModule, ApplicationForm, GlowingCard],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  applications = signal<JobApplication[]>([]);
  loading = signal<boolean>(true);
  errorMessage = signal<string>('');

  searchQuery = signal<string>('');
  selectedStatusFilter = signal<string>('All');

  showFormModal = signal<boolean>(false);
  editingApplication = signal<JobApplication | null>(null);
  isSubmitting = signal<boolean>(false);

  deleteConfirmAppId = signal<number | null>(null);

  statusFilters = ['All', 'Starred', 'Applied', 'Interviewing', 'Offered', 'Rejected', 'Bookmarked'];

  stats = computed(() => {
    const list = this.applications();
    return {
      total: list.length,
      starred: list.filter((a) => a.is_starred).length,
      applied: list.filter((a) => a.status === 'Applied').length,
      interviewing: list.filter((a) => a.status === 'Interviewing').length,
      offered: list.filter((a) => a.status === 'Offered').length,
      rejected: list.filter((a) => a.status === 'Rejected').length,
      bookmarked: list.filter((a) => a.status === 'Bookmarked').length,
    };
  });

  filteredApplications = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const filter = this.selectedStatusFilter();
    const filtered = this.applications().filter((app) => {
      const matchesSearch =
        !query ||
        app.company_name.toLowerCase().includes(query) ||
        app.role.toLowerCase().includes(query) ||
        (app.notes && app.notes.toLowerCase().includes(query));

      let matchesStatus = true;
      if (filter === 'Starred') {
        matchesStatus = !!app.is_starred;
      } else if (filter !== 'All') {
        matchesStatus = app.status === filter;
      }

      return matchesSearch && matchesStatus;
    });

    const slotWeight: Record<string, number> = {
      'C1(S)': 6,
      'C1': 5,
      'C2': 4,
      'B1': 3,
      'B2': 2,
      'A': 1,
    };

    return filtered.sort((a, b) => {
      // 1. Starred priority: Starred cards are pinned to the top
      const aStarred = a.is_starred ? 1 : 0;
      const bStarred = b.is_starred ? 1 : 0;
      if (bStarred !== aStarred) {
        return bStarred - aStarred;
      }

      // 2. Slot priority: Higher importance slots come first
      const aSlot = a.company_slot ? (slotWeight[a.company_slot] || 0) : 0;
      const bSlot = b.company_slot ? (slotWeight[b.company_slot] || 0) : 0;
      if (bSlot !== aSlot) {
        return bSlot - aSlot;
      }

      // 3. Fallback: Most recent applied date or ID first
      const dateComparison = (b.applied_date || '').localeCompare(a.applied_date || '');
      if (dateComparison !== 0) {
        return dateComparison;
      }
      return b.id - a.id;
    });
  });

  constructor(
    private applicationsService: ApplicationsService,
    private authService: Auth,
    private router: Router
  ) {}

  ngOnInit() {
    this.fetchApplications();
  }

  fetchApplications() {
    this.loading.set(true);
    this.errorMessage.set('');
    this.applicationsService.getApplications().subscribe({
      next: (data) => {
        this.applications.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        if (err?.status === 401) {
          this.authService.logout();
          this.router.navigate(['/login'], { queryParams: { sessionExpired: 'true' } });
          return;
        }
        this.errorMessage.set(err?.error?.detail || 'Failed to load applications');
        this.loading.set(false);
      },
    });
  }

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  openCreateModal() {
    this.editingApplication.set(null);
    this.showFormModal.set(true);
  }

  openEditModal(app: JobApplication) {
    this.editingApplication.set(app);
    this.showFormModal.set(true);
  }

  closeModal() {
    this.showFormModal.set(false);
    this.editingApplication.set(null);
  }

  handleFormSubmit(payload: JobApplicationCreate) {
    this.isSubmitting.set(true);
    const editing = this.editingApplication();

    if (editing) {
      this.applicationsService.updateApplication(editing.id, payload).subscribe({
        next: (updatedApp) => {
          this.applications.update((apps) =>
            apps.map((a) => (a.id === updatedApp.id ? updatedApp : a))
          );
          this.isSubmitting.set(false);
          this.closeModal();
        },
        error: (err) => {
          this.errorMessage.set(err?.error?.detail || 'Failed to update application');
          this.isSubmitting.set(false);
        },
      });
    } else {
      this.applicationsService.createApplication(payload).subscribe({
        next: (newApp) => {
          this.applications.update((apps) => [newApp, ...apps]);
          this.isSubmitting.set(false);
          this.closeModal();
        },
        error: (err) => {
          this.errorMessage.set(err?.error?.detail || 'Failed to create application');
          this.isSubmitting.set(false);
        },
      });
    }
  }

  toggleStar(app: JobApplication, event: MouseEvent) {
    event.stopPropagation();
    // Optimistic UI update
    const previousStarred = app.is_starred;
    this.applications.update((apps) =>
      apps.map((a) => (a.id === app.id ? { ...a, is_starred: !previousStarred } : a))
    );

    this.applicationsService.toggleStar(app.id).subscribe({
      next: (updatedApp) => {
        this.applications.update((apps) =>
          apps.map((a) => (a.id === updatedApp.id ? updatedApp : a))
        );
      },
      error: (err) => {
        // Revert on error
        this.applications.update((apps) =>
          apps.map((a) => (a.id === app.id ? { ...a, is_starred: previousStarred } : a))
        );
        this.errorMessage.set(err?.error?.detail || 'Failed to update star status');
      },
    });
  }

  promptDelete(id: number) {
    this.deleteConfirmAppId.set(id);
  }

  cancelDelete() {
    this.deleteConfirmAppId.set(null);
  }

  confirmDelete() {
    const id = this.deleteConfirmAppId();
    if (!id) return;

    this.applicationsService.deleteApplication(id).subscribe({
      next: () => {
        this.applications.update((apps) => apps.filter((a) => a.id !== id));
        this.deleteConfirmAppId.set(null);
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.detail || 'Failed to delete application');
        this.deleteConfirmAppId.set(null);
      },
    });
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'Applied':
        return 'badge-applied';
      case 'Interviewing':
        return 'badge-interviewing';
      case 'Offered':
        return 'badge-offered';
      case 'Rejected':
        return 'badge-rejected';
      case 'Bookmarked':
        return 'badge-bookmarked';
      default:
        return 'badge-default';
    }
  }

  getSlotBadgeClass(slot?: string | null): string {
    switch (slot) {
      case 'A':
        return 'slot-a';
      case 'B2':
        return 'slot-b2';
      case 'B1':
        return 'slot-b1';
      case 'C2':
        return 'slot-c2';
      case 'C1':
        return 'slot-c1';
      case 'C1(S)':
        return 'slot-c1s';
      default:
        return 'slot-default';
    }
  }
}