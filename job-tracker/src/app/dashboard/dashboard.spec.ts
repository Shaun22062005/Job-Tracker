import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Dashboard } from './dashboard';
import { ApplicationsService } from '../applications';
import { Auth } from '../auth';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { JobApplication } from '../job-application';
import { vi } from 'vitest';

describe('Dashboard Component', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;
  let mockAppsService: any;
  let mockAuthService: any;
  let mockRouter: any;

  const mockApplications: JobApplication[] = [
    {
      id: 1,
      user_id: 101,
      company_name: 'Google',
      role: 'Senior Frontend Engineer',
      status: 'Interviewing',
      applied_date: '2026-08-01',
      is_starred: true,
      notes: 'Passed initial recruiter call',
    },
    {
      id: 2,
      user_id: 101,
      company_name: 'Meta',
      role: 'Product Engineer',
      status: 'Applied',
      applied_date: '2026-08-05',
      is_starred: false,
      notes: 'Submitted resume via referral',
    },
    {
      id: 3,
      user_id: 101,
      company_name: 'Amazon',
      role: 'Software Engineer',
      status: 'Rejected',
      applied_date: '2026-07-20',
      is_starred: false,
    },
  ];

  beforeEach(async () => {
    mockAppsService = {
      getApplications: vi.fn().mockReturnValue(of(mockApplications)),
      createApplication: vi.fn(),
      updateApplication: vi.fn(),
      toggleStar: vi.fn(),
      deleteApplication: vi.fn(),
    };
    mockAuthService = {
      logout: vi.fn(),
    };
    mockRouter = {
      navigate: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        { provide: ApplicationsService, useValue: mockAppsService },
        { provide: Auth, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the dashboard component and fetch applications on init', () => {
    expect(component).toBeTruthy();
    expect(mockAppsService.getApplications).toHaveBeenCalled();
    expect(component.applications().length).toBe(3);
    expect(component.loading()).toBe(false);
  });

  it('should compute application statistics correctly', () => {
    const stats = component.stats();
    expect(stats.total).toBe(3);
    expect(stats.starred).toBe(1);
    expect(stats.interviewing).toBe(1);
    expect(stats.applied).toBe(1);
    expect(stats.rejected).toBe(1);
    expect(stats.offered).toBe(0);
  });

  it('should filter applications by status pill selection', () => {
    component.selectedStatusFilter.set('Interviewing');
    expect(component.filteredApplications().length).toBe(1);
    expect(component.filteredApplications()[0].company_name).toBe('Google');

    component.selectedStatusFilter.set('Starred');
    expect(component.filteredApplications().length).toBe(1);
    expect(component.filteredApplications()[0].company_name).toBe('Google');
  });

  it('should filter applications by search query text', () => {
    component.selectedStatusFilter.set('All');
    component.searchQuery.set('meta');

    expect(component.filteredApplications().length).toBe(1);
    expect(component.filteredApplications()[0].company_name).toBe('Meta');
  });

  it('should call toggleStar and update local state when star is toggled', () => {
    const targetApp = mockApplications[1]; // Meta, currently is_starred: false
    const updatedMetaApp = { ...targetApp, is_starred: true };
    mockAppsService.toggleStar.mockReturnValue(of(updatedMetaApp));

    component.toggleStar(targetApp, new MouseEvent('click'));

    expect(mockAppsService.toggleStar).toHaveBeenCalledWith(2);
    const metaInState = component.applications().find((a) => a.id === 2);
    expect(metaInState?.is_starred).toBe(true);
  });

  it('should log out user and navigate to /login', () => {
    component.onLogout();
    expect(mockAuthService.logout).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should return correct slot badge class based on hierarchy', () => {
    expect(component.getSlotBadgeClass('A')).toBe('slot-a');
    expect(component.getSlotBadgeClass('B2')).toBe('slot-b2');
    expect(component.getSlotBadgeClass('B1')).toBe('slot-b1');
    expect(component.getSlotBadgeClass('C2')).toBe('slot-c2');
    expect(component.getSlotBadgeClass('C1')).toBe('slot-c1');
    expect(component.getSlotBadgeClass('C1(S)')).toBe('slot-c1s');
    expect(component.getSlotBadgeClass(null)).toBe('slot-default');
  });

  it('should pin starred applications to top and sort by slot hierarchy', () => {
    const testApps: JobApplication[] = [
      { id: 1, user_id: 1, company_name: 'Alpha', role: 'Dev', status: 'Applied', applied_date: '2026-08-01', is_starred: false, company_slot: 'A' },
      { id: 2, user_id: 1, company_name: 'Beta', role: 'Dev', status: 'Applied', applied_date: '2026-08-02', is_starred: true, company_slot: 'B2' },
      { id: 3, user_id: 1, company_name: 'Gamma', role: 'Dev', status: 'Applied', applied_date: '2026-08-03', is_starred: false, company_slot: 'C1(S)' },
      { id: 4, user_id: 1, company_name: 'Delta', role: 'Dev', status: 'Applied', applied_date: '2026-08-04', is_starred: true, company_slot: 'C1' },
      { id: 5, user_id: 1, company_name: 'Epsilon', role: 'Dev', status: 'Applied', applied_date: '2026-08-05', is_starred: false, company_slot: 'B1' },
    ];
    component.applications.set(testApps);
    const sorted = component.filteredApplications();

    // Starred cards come first, ordered by slot importance: Delta (C1), then Beta (B2)
    expect(sorted[0].company_name).toBe('Delta');
    expect(sorted[1].company_name).toBe('Beta');

    // Unstarred cards follow, ordered by slot importance: Gamma (C1(S)), then Epsilon (B1), then Alpha (A)
    expect(sorted[2].company_name).toBe('Gamma');
    expect(sorted[3].company_name).toBe('Epsilon');
    expect(sorted[4].company_name).toBe('Alpha');
  });
});
