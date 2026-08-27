import { ComponentFixture, TestBed } from '@angular/core';
import { Register } from './register';
import { Auth } from '../auth';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

describe('Register Component', () => {
  let component: Register;
  let fixture: ComponentFixture<Register>;
  let mockAuthService: jasmine.SpyObj<Auth>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj('Auth', ['register']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [
        { provide: Auth, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();

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
    mockAuthService.register.and.returnValue(of({ id: 1, email: 'newuser@example.com' }));

    component.email.set('newuser@example.com');
    component.password.set('password123');
    component.onSubmit();

    expect(mockAuthService.register).toHaveBeenCalledWith('newuser@example.com', 'password123');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    expect(component.errorMessage()).toBe('');
  });

  it('should set error message on duplicate registration failure', () => {
    mockAuthService.register.and.returnValue(
      throwError(() => ({ error: { detail: 'Email already registered' } }))
    );

    component.email.set('existinguser@example.com');
    component.password.set('password123');
    component.onSubmit();

    expect(mockAuthService.register).toHaveBeenCalledWith('existinguser@example.com', 'password123');
    expect(component.errorMessage()).toBe('Email already registered');
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });
});
