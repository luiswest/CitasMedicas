import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { environment } from '../../../environments/environment';

const API = `${environment.servidor}/auth`;
const AHORA = new Date('2026-11-19T12:00:00Z').getTime();

/** Crea un JWT sin firmar válido para JwtHelperService (solo decodifica, no verifica). */
function crearToken(payload: Record<string, unknown>): string {
  const b64 = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.firma`;
}

/** Token del usuario 7 que vence dentro de `segundos`. */
function tokenQueVenceEn(segundos: number): string {
  return crearToken({ sub: '7', username: 'ana', rol_id: 2, exp: Math.floor(AHORA / 1000) + segundos });
}

describe('AuthService', () => {
  let httpTesting: HttpTestingController;
  let router: { navigate: ReturnType<typeof vi.fn> };

  const crearServicio = () => {
    const service = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
    return service;
  };

  const guardarSesion = (token: string, tkRef = 'refresh-1') => {
    localStorage.setItem('JWT_TOKEN', token);
    localStorage.setItem('REFRESH_TOKEN', tkRef);
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(AHORA);
    localStorage.clear();
    router = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: Router, useValue: router }],
    });
  });

  afterEach(() => {
    httpTesting?.verify();
    vi.useRealTimers();
    localStorage.clear();
  });

  describe('estado inicial', () => {
    it('sin tokens: no hay sesión activa y el usuario es el usuario vacío', () => {
      const service = crearServicio();

      expect(service.isLoggedIn()).toBe(false);
      expect(service.sesionActiva()).toBe(false);
      expect(service.sesionVencida()).toBe(false);
      expect(service.userActualS().id).toBe('');
      expect(service.userActualS().rol_id).toBe(-1);
    });

    it('con un token vigente al recargar: la sesión está activa', () => {
      guardarSesion(tokenQueVenceEn(3600));
      const service = crearServicio();

      expect(service.isLoggedIn()).toBe(true);
      expect(service.sesionActiva()).toBe(true);
      expect(service.sesionVencida()).toBe(false);
    });

    it('con un token vencido: no hay sesión activa y sesionVencida() es true', () => {
      guardarSesion(tokenQueVenceEn(-10));
      const service = crearServicio();

      expect(service.isLoggedIn()).toBe(false);
      expect(service.sesionActiva()).toBe(false);
      expect(service.sesionVencida()).toBe(true);
    });

    it('con un token vigente al recargar: programa el cierre de sesión al vencer', () => {
      guardarSesion(tokenQueVenceEn(30));
      const service = crearServicio();

      // 30 s de vida - 1 s de margen = 29 s
      vi.advanceTimersByTime(28_999);
      httpTesting.expectNone(`${API}/loggout/7`);
      expect(service.sesionActiva()).toBe(true);

      vi.advanceTimersByTime(1);
      httpTesting.expectOne(`${API}/loggout/7`).flush({});
      expect(service.sesionActiva()).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('login()', () => {
    const credenciales = { username: 'ana', password: 'secreto' };

    it('hace POST a /auth/login con las credenciales', () => {
      const service = crearServicio();
      service.login(credenciales).subscribe();

      const req = httpTesting.expectOne(`${API}/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(credenciales);
      req.flush({ token: tokenQueVenceEn(3600), tkRef: 'refresh-1' });
    });

    it('si el login es correcto: emite true, guarda los tokens y actualiza el usuario', () => {
      const service = crearServicio();
      const token = tokenQueVenceEn(3600);
      let resultado: unknown;

      service.login(credenciales).subscribe((r) => (resultado = r));
      httpTesting.expectOne(`${API}/login`).flush({ token, tkRef: 'refresh-1' });

      expect(resultado).toBe(true);
      expect(localStorage.getItem('JWT_TOKEN')).toBe(token);
      expect(localStorage.getItem('REFRESH_TOKEN')).toBe('refresh-1');
      expect(service.sesionActiva()).toBe(true);
      expect(service.isLoggedIn()).toBe(true);
      expect(service.userActualS()).toEqual({ id: '7', username: 'ana', rol_id: 2 });
    });

    it('si el login falla: emite el código de estado HTTP y no guarda tokens', () => {
      const service = crearServicio();
      let resultado: unknown;

      service.login(credenciales).subscribe((r) => (resultado = r));
      httpTesting.expectOne(`${API}/login`).flush('No autorizado', { status: 401, statusText: 'Unauthorized' });

      expect(resultado).toBe(401);
      expect(localStorage.getItem('JWT_TOKEN')).toBeNull();
      expect(service.sesionActiva()).toBe(false);
    });

    it('programa el cierre de sesión 1 s antes de que venza el token', () => {
      const service = crearServicio();
      service.login(credenciales).subscribe();
      httpTesting.expectOne(`${API}/login`).flush({ token: tokenQueVenceEn(60), tkRef: 'refresh-1' });

      vi.advanceTimersByTime(58_999);
      httpTesting.expectNone(`${API}/loggout/7`);

      vi.advanceTimersByTime(1);
      httpTesting.expectOne(`${API}/loggout/7`).flush({});
      expect(service.sesionActiva()).toBe(false);
      expect(localStorage.getItem('JWT_TOKEN')).toBeNull();
    });

    it('un segundo login reemplaza el temporizador anterior', () => {
      const service = crearServicio();
      service.login(credenciales).subscribe();
      httpTesting.expectOne(`${API}/login`).flush({ token: tokenQueVenceEn(10), tkRef: 'r1' });

      service.login(credenciales).subscribe();
      httpTesting.expectOne(`${API}/login`).flush({ token: tokenQueVenceEn(3600), tkRef: 'r2' });

      // el primer temporizador (9 s) ya no debe disparar el cierre
      vi.advanceTimersByTime(60_000);
      httpTesting.expectNone(`${API}/loggout/7`);
      expect(service.sesionActiva()).toBe(true);
    });
  });

  describe('loggout()', () => {
    it('con sesión: hace DELETE a /auth/loggout/:id, borra los tokens y navega a /login', () => {
      guardarSesion(tokenQueVenceEn(3600));
      const service = crearServicio();

      service.loggout();

      const req = httpTesting.expectOne(`${API}/loggout/7`);
      expect(req.request.method).toBe('DELETE');
      req.flush({});
      expect(localStorage.getItem('JWT_TOKEN')).toBeNull();
      expect(localStorage.getItem('REFRESH_TOKEN')).toBeNull();
      expect(service.sesionActiva()).toBe(false);
      expect(service.userActualS().id).toBe('');
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('sin sesión: no hace petición al API pero igual navega a /login', () => {
      const service = crearServicio();

      service.loggout();

      httpTesting.expectNone(() => true);
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('cancela el cierre automático programado', () => {
      guardarSesion(tokenQueVenceEn(30));
      const service = crearServicio();

      service.loggout();
      httpTesting.expectOne(`${API}/loggout/7`).flush({});
      router.navigate.mockClear();

      vi.advanceTimersByTime(60_000);
      httpTesting.expectNone(() => true);
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  describe('doLogOut()', () => {
    it('limpia la sesión local sin llamar al API', () => {
      guardarSesion(tokenQueVenceEn(3600));
      const service = crearServicio();

      service.doLogOut();

      httpTesting.expectNone(() => true);
      expect(localStorage.getItem('JWT_TOKEN')).toBeNull();
      expect(service.sesionActiva()).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('no intenta borrar tokens si no existen', () => {
      const service = crearServicio();
      const removeTokens = vi.spyOn(TestBed.inject(TokenService), 'removeTokens');

      service.doLogOut();

      expect(removeTokens).not.toHaveBeenCalled();
    });
  });

  describe('refreshSession()', () => {
    it('sin sesión: emite false y no llama al API', () => {
      const service = crearServicio();
      let resultado: unknown;

      service.refreshSession().subscribe((r: unknown) => (resultado = r));

      expect(resultado).toBe(false);
      httpTesting.expectNone(() => true);
    });

    it('con el token lejos de vencer (> 20 s): emite false y no llama al API', () => {
      guardarSesion(tokenQueVenceEn(3600));
      const service = crearServicio();
      let resultado: unknown;

      service.refreshSession().subscribe((r: unknown) => (resultado = r));

      expect(resultado).toBe(false);
      httpTesting.expectNone(`${API}/refresh-session/7`);
    });

    it('con el token por vencer (<= 20 s): hace PATCH con el refresh token', () => {
      guardarSesion(tokenQueVenceEn(15), 'refresh-viejo');
      const service = crearServicio();

      service.refreshSession().subscribe();

      const req = httpTesting.expectOne(`${API}/refresh-session/7`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ tkRef: 'refresh-viejo' });
      req.flush({ token: tokenQueVenceEn(3600), tkRef: 'refresh-nuevo' });
    });

    it('si el refresco es correcto: emite true, guarda los tokens nuevos y reprograma el cierre', () => {
      guardarSesion(tokenQueVenceEn(15));
      const service = crearServicio();
      const nuevoToken = tokenQueVenceEn(3600);
      let resultado: unknown;

      service.refreshSession().subscribe((r: unknown) => (resultado = r));
      httpTesting.expectOne(`${API}/refresh-session/7`).flush({ token: nuevoToken, tkRef: 'refresh-nuevo' });

      expect(resultado).toBe(true);
      expect(localStorage.getItem('JWT_TOKEN')).toBe(nuevoToken);
      expect(localStorage.getItem('REFRESH_TOKEN')).toBe('refresh-nuevo');

      // el cierre programado con el token viejo (14 s) ya no debe disparar
      vi.advanceTimersByTime(60_000);
      httpTesting.expectNone(`${API}/loggout/7`);
      expect(service.sesionActiva()).toBe(true);
    });

    it('si la sesión se cerró antes de llegar la respuesta: ignora los tokens nuevos', () => {
      guardarSesion(tokenQueVenceEn(15));
      const service = crearServicio();

      service.refreshSession().subscribe();
      const req = httpTesting.expectOne(`${API}/refresh-session/7`);

      service.doLogOut();
      req.flush({ token: tokenQueVenceEn(3600), tkRef: 'refresh-nuevo' });

      expect(localStorage.getItem('JWT_TOKEN')).toBeNull();
      expect(service.sesionActiva()).toBe(false);
    });

    it('si el refresco falla: emite el código de estado HTTP', () => {
      guardarSesion(tokenQueVenceEn(15));
      const service = crearServicio();
      let resultado: unknown;

      service.refreshSession().subscribe((r: unknown) => (resultado = r));
      httpTesting
        .expectOne(`${API}/refresh-session/7`)
        .flush('Refresh inválido', { status: 401, statusText: 'Unauthorized' });

      expect(resultado).toBe(401);
    });
  });
});
