import { ComponentFixture, TestBed } from '@angular/core';
import { Login } from './login';
import { Auth } from '../auth';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

describe('Login Component', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let mockAuthService: jasmine.SpyObj<Auth>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj('Auth', ['login', 'storeToken']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        { provide: Auth, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();

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
    mockAuthService.login.and.returnValue(of({ access_token: fakeToken, token_type: 'bearer' }));

    component.email.set('user@example.com');
    component.password.set('secret123');
    component.onSubmit();

    expect(mockAuthService.login).toHaveBeenCalledWith('user@example.com', 'secret123');
    expect(mockAuthService.storeToken).toHaveBeenCalledWith(fakeToken);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(component.errorMessage()).toBe('');
  });

  it('should set error message on login failure', () => {
    mockAuthService.login.and.returnValue(throwError(() => ({ error: { detail: 'Invalid Credentials' } })));

    component.email.set('user@example.com');
    component.password.set('wrongpass');
    component.onSubmit();

    expect(mockAuthService.login).toHaveBeenCalledWith('user@example.com', 'wrongpass');
    expect(component.errorMessage()).toBe('Invalid Credentials');
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });
});
