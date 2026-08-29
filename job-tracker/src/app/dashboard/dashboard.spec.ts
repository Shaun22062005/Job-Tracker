import { ComponentFixture, TestBed } from '@angular/core';
import { Dashboard } from './dashboard';
import { ApplicationsService } from '../applications';
import { Auth } from '../auth';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { JobApplication } from '../job-application';

describe('Dashboard Component', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;
  let mockAppsService: jasmine.SpyObj<ApplicationsService>;
  let mockAuthService: jasmine.SpyObj<Auth>;
  let mockRouter: jasmine.SpyObj<Router>;

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
    mockAppsService = jasmine.createSpyObj('ApplicationsService', [
      'getApplications',
      'createApplication',
      'updateApplication',
      'toggleStar',
      'deleteApplication',
    ]);
    mockAuthService = jasmine.createSpyObj('Auth', ['logout']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    mockAppsService.getApplications.and.returnValue(of(mockApplications));

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
    expect(component.loading()).toBeFalse();
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
    mockAppsService.toggleStar.and.returnValue(of(updatedMetaApp));

    component.toggleStar(targetApp, new MouseEvent('click'));

    expect(mockAppsService.toggleStar).toHaveBeenCalledWith(2);
    const metaInState = component.applications().find((a) => a.id === 2);
    expect(metaInState?.is_starred).toBeTrue();
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
});
