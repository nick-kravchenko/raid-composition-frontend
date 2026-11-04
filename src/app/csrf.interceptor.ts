import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpEvent, HttpInterceptorFn } from '@angular/common/http';
import { PLATFORM_ID, inject } from '@angular/core';
import { Observable, catchError, map, of, switchMap, throwError } from 'rxjs';

import { API_BASE } from './app.tokens';

const CSRF_REJECTION_CODES = new Set(['auth.csrf_required', 'auth.csrf_invalid']);

/**
 * Attaches the CSRF token to API mutations. The token cookie is only issued at login and expires
 * while the session keeps sliding, so a missing or rejected token is renewed from the session instead
 * of failing the request.
 */
export const csrfInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next(req);
  }

  const apiBase = inject(API_BASE);
  const isApiMutation = req.url.startsWith(apiBase);
  // The Discord callback creates the session, so there is nothing to protect or renew yet.
  const isLogin = req.url.startsWith(`${apiBase}/auth/discord/`);
  if (!isApiMutation || isLogin || !isPlatformBrowser(inject(PLATFORM_ID))) {
    return next(req);
  }

  const document = inject(DOCUMENT);
  const http = inject(HttpClient);
  const readToken = () => getCookieValue(document.cookie ?? '', 'csrf');

  const renewToken = (): Observable<string | null> =>
    http.get(`${apiBase}/auth/csrf`, { withCredentials: true, responseType: 'text' }).pipe(
      catchError(() => of(null)),
      map(() => readToken()),
    );

  const send = (token: string | null, canRenew: boolean): Observable<HttpEvent<unknown>> =>
    next(token ? req.clone({ setHeaders: { 'X-CSRF-Token': token } }) : req).pipe(
      catchError((error: unknown) =>
        canRenew && isCsrfRejection(error)
          ? renewToken().pipe(switchMap((renewed) => send(renewed, false)))
          : throwError(() => error),
      ),
    );

  const token = readToken();
  return token ? send(token, true) : renewToken().pipe(switchMap((renewed) => send(renewed, true)));
};

function isCsrfRejection(error: unknown): boolean {
  return (
    error instanceof HttpErrorResponse &&
    error.status === 403 &&
    CSRF_REJECTION_CODES.has(error.error?.error?.code)
  );
}

function getCookieValue(cookieString: string, name: string): string | null {
  const prefix = `${name}=`;
  for (const entry of cookieString.split(';')) {
    const trimmed = entry.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }
  return null;
}
