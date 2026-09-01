import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Login } from './login';
import { Auth } from '../auth';
import { GoogleAuth } from '../google-auth';
import { Router, ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

describe('Login Component', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let mockAuthService: any;
  let mockGoogleAuthService: any;
  let router: Router;

  beforeEach(async () => {
    mockAuthService = {
      login: vi.fn(),
      loginWithGoogle: vi.fn(),
      storeToken: vi.fn(),
    };
    mockGoogleAuthService = {
      initializeButton: vi.fn(),
      triggerPrompt: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        { provide: Auth, useValue: mockAuthService },
        { provide: GoogleAuth, useValue: mockGoogleAuthService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({}),
            },
          },
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true));

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the login component', () => {
    expect(component).toBeTruthy();
  });

  it('should display error message when submitting empty fields', () => {
    component.email.set('');
    component.password.set('');
    component.onSubmit();

    expect(component.errorMessage()).toBe('Please fill in all fields.');
    expect(mockAuthService.login).not.toHaveBeenCalled();
  });

  it('should call authService.login and navigate to /dashboard on success', () => {
    const fakeToken = 'test-jwt-access-token';
    mockAuthService.login.mockReturnValue(of({ access_token: fakeToken, token_type: 'bearer' }));

    component.email.set('user@example.com');
    component.password.set('secret123');
    component.onSubmit();

    expect(mockAuthService.login).toHaveBeenCalledWith('user@example.com', 'secret123');
    expect(mockAuthService.storeToken).toHaveBeenCalledWith(fakeToken);
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(component.errorMessage()).toBe('');
  });

  it('should set error message on login failure', () => {
    mockAuthService.login.mockReturnValue(throwError(() => ({ error: { detail: 'Invalid Credentials' } })));

    component.email.set('user@example.com');
    component.password.set('wrongpass');
    component.onSubmit();

    expect(mockAuthService.login).toHaveBeenCalledWith('user@example.com', 'wrongpass');
    expect(component.errorMessage()).toBe('Incorrect email or password. Please try again.');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should set error message when sessionExpired query parameter is present', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        { provide: Auth, useValue: mockAuthService },
        { provide: GoogleAuth, useValue: mockGoogleAuthService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({ sessionExpired: 'true' }),
            },
          },
        },
      ],
    }).compileComponents();

    const newFixture = TestBed.createComponent(Login);
    const newComponent = newFixture.componentInstance;
    newComponent.ngOnInit();

    expect(newComponent.errorMessage()).toBe('Your session has expired. Please sign in again.');
  });
});
