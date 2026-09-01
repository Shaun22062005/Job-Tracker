import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Register } from './register';
import { Auth } from '../auth';
import { GoogleAuth } from '../google-auth';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

describe('Register Component', () => {
  let component: Register;
  let fixture: ComponentFixture<Register>;
  let mockAuthService: any;
  let mockGoogleAuthService: any;
  let router: Router;

  beforeEach(async () => {
    mockAuthService = {
      register: vi.fn(),
      loginWithGoogle: vi.fn(),
      storeToken: vi.fn(),
    };
    mockGoogleAuthService = {
      initializeButton: vi.fn(),
      triggerPrompt: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [
        provideRouter([]),
        { provide: Auth, useValue: mockAuthService },
        { provide: GoogleAuth, useValue: mockGoogleAuthService },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true));

    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the register component', () => {
    expect(component).toBeTruthy();
  });

  it('should display error when submitting empty registration fields', () => {
    component.email.set('');
    component.password.set('');
    component.onSubmit();

    expect(component.errorMessage()).toBe('Please fill in all fields.');
    expect(mockAuthService.register).not.toHaveBeenCalled();
  });

  it('should call authService.register and navigate to /login on success', () => {
    mockAuthService.register.mockReturnValue(of({ id: 1, email: 'newuser@example.com' }));

    component.email.set('newuser@example.com');
    component.password.set('password123');
    component.onSubmit();

    expect(mockAuthService.register).toHaveBeenCalledWith('newuser@example.com', 'password123');
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    expect(component.errorMessage()).toBe('');
  });

  it('should set error message on duplicate registration failure', () => {
    mockAuthService.register.mockReturnValue(
      throwError(() => ({ error: { detail: 'Email already registered' } }))
    );

    component.email.set('existinguser@example.com');
    component.password.set('password123');
    component.onSubmit();

    expect(mockAuthService.register).toHaveBeenCalledWith('existinguser@example.com', 'password123');
    expect(component.errorMessage()).toBe('An account with this email already exists. Please sign in instead.');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
