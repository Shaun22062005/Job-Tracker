import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Auth } from './auth';
import { environment } from '../environments/environment';

describe('Auth Service', () => {
  let service: Auth;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(Auth);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should send HTTP POST on register()', () => {
    service.register('user@test.com', 'pass123').subscribe((res) => {
      expect(res).toEqual({ id: 1, email: 'user@test.com' });
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/register/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'user@test.com', plain_password: 'pass123' });
    req.flush({ id: 1, email: 'user@test.com' });
  });

  it('should send HTTP POST on login()', () => {
    service.login('user@test.com', 'pass123').subscribe((res) => {
      expect(res.access_token).toBe('test-token');
      expect(res.token_type).toBe('bearer');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'user@test.com', plain_password: 'pass123' });
    req.flush({ access_token: 'test-token', token_type: 'bearer' });
  });

  it('should send HTTP POST on loginWithGoogle()', () => {
    service.loginWithGoogle('google-id-token').subscribe((res) => {
      expect(res.access_token).toBe('jwt-token');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/google`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ id_token: 'google-id-token' });
    req.flush({ access_token: 'jwt-token', token_type: 'bearer' });
  });

  it('should store and retrieve token in localStorage', () => {
    expect(service.getToken()).toBeNull();
    service.storeToken('sample-access-token');
    expect(service.getToken()).toBe('sample-access-token');
    service.logout();
    expect(service.getToken()).toBeNull();
  });

  describe('isTokenExpired', () => {
    function createFakeJwt(payloadObj: any): string {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify(payloadObj));
      return `${header}.${payload}.fakeSignature`;
    }

    it('should return true for null or empty token', () => {
      expect(service.isTokenExpired(null)).toBe(true);
      expect(service.isTokenExpired('')).toBe(true);
    });

    it('should return true for malformed token string', () => {
      expect(service.isTokenExpired('not.a.valid.jwt.string')).toBe(true);
      expect(service.isTokenExpired('invalid-token')).toBe(true);
    });

    it('should return true if token is missing exp claim', () => {
      const tokenNoExp = createFakeJwt({ user_id: 1 });
      expect(service.isTokenExpired(tokenNoExp)).toBe(true);
    });

    it('should return true if token is expired', () => {
      const pastTime = Math.floor(Date.now() / 1000) - 300; // 5 mins ago
      const expiredToken = createFakeJwt({ user_id: 1, exp: pastTime });
      expect(service.isTokenExpired(expiredToken)).toBe(true);
    });

    it('should return false if token is active and unexpired', () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour ahead
      const validToken = createFakeJwt({ user_id: 1, exp: futureTime });
      expect(service.isTokenExpired(validToken)).toBe(false);
    });
  });

  describe('isLoggedIn', () => {
    function createFakeJwt(expSeconds: number): string {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify({ user_id: 1, exp: expSeconds }));
      return `${header}.${payload}.fakeSignature`;
    }

    it('should return false when no token is stored', () => {
      expect(service.isLoggedIn()).toBe(false);
    });

    it('should return true when a valid unexpired token is stored', () => {
      const validToken = createFakeJwt(Math.floor(Date.now() / 1000) + 3600);
      service.storeToken(validToken);
      expect(service.isLoggedIn()).toBe(true);
    });

    it('should return false and clear localStorage when stored token is expired', () => {
      const expiredToken = createFakeJwt(Math.floor(Date.now() / 1000) - 600);
      service.storeToken(expiredToken);
      expect(service.isLoggedIn()).toBe(false);
      expect(service.getToken()).toBeNull();
    });
  });
});
