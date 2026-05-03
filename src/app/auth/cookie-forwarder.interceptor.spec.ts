import { HttpRequest } from '@angular/common/http';
import { PLATFORM_ID, REQUEST } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { cookieForwarderInterceptor } from './cookie-forwarder.interceptor';


describe('cookieForwarderInterceptor', () => {
  const baseReq = new HttpRequest('GET', 'http://localhost:8000/api/v1/auth/session');

  describe('server platform with cookie present', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          { provide: PLATFORM_ID, useValue: 'server' },
          {
            provide: REQUEST,
            useValue: new Request('http://localhost:4200/guilds', {
              headers: { cookie: 'session=abc123; csrf=tok' },
            }),
          },
        ],
      });
    });

    it('adds Cookie header to outgoing request', () => {
      let captured!: HttpRequest<unknown>;
      TestBed.runInInjectionContext(() => {
        cookieForwarderInterceptor(baseReq, (r) => {
          captured = r as HttpRequest<unknown>;
          return { subscribe: () => ({}) } as never;
        });
      });
      expect(captured.headers.get('Cookie')).toBe('session=abc123; csrf=tok');
    });
  });

  describe('browser platform', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          { provide: PLATFORM_ID, useValue: 'browser' },
          {
            provide: REQUEST,
            useValue: new Request('http://localhost:4200/', {
              headers: { cookie: 'session=abc123' },
            }),
          },
        ],
      });
    });

    it('passes original request through unmodified', () => {
      let captured!: HttpRequest<unknown>;
      TestBed.runInInjectionContext(() => {
        cookieForwarderInterceptor(baseReq, (r) => {
          captured = r as HttpRequest<unknown>;
          return { subscribe: () => ({}) } as never;
        });
      });
      expect(captured).toBe(baseReq);
      expect(captured.headers.get('Cookie')).toBeNull();
    });
  });

  describe('server platform with null REQUEST token', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: REQUEST, useValue: null },
        ],
      });
    });

    it('passes original request through unmodified', () => {
      let captured!: HttpRequest<unknown>;
      TestBed.runInInjectionContext(() => {
        cookieForwarderInterceptor(baseReq, (r) => {
          captured = r as HttpRequest<unknown>;
          return { subscribe: () => ({}) } as never;
        });
      });
      expect(captured).toBe(baseReq);
      expect(captured.headers.get('Cookie')).toBeNull();
    });
  });

  describe('server platform with no cookie header', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: REQUEST, useValue: new Request('http://localhost:4200/') },
        ],
      });
    });

    it('passes original request through unmodified', () => {
      let captured!: HttpRequest<unknown>;
      TestBed.runInInjectionContext(() => {
        cookieForwarderInterceptor(baseReq, (r) => {
          captured = r as HttpRequest<unknown>;
          return { subscribe: () => ({}) } as never;
        });
      });
      expect(captured).toBe(baseReq);
      expect(captured.headers.get('Cookie')).toBeNull();
    });
  });
});
