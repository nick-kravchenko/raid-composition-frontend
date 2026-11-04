import { isPlatformServer } from '@angular/common';
import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { PLATFORM_ID, REQUEST, REQUEST_CONTEXT, RESPONSE_INIT, inject } from '@angular/core';
import { tap } from 'rxjs';

import { API_BASE, SsrRequestContext } from '../app.tokens';

/**
 * Makes SSR calls to the API act on behalf of the visitor: the session cookie, user agent and client
 * IP go to the API, and any cookies the API sets (such as a refreshed session) go back to the browser.
 * Hydration replays these responses from the transfer cache, so the browser would never see them.
 */
export const cookieForwarderInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isPlatformServer(inject(PLATFORM_ID)) || !req.url.startsWith(inject(API_BASE))) {
    return next(req);
  }

  const serverRequest = inject(REQUEST, { optional: true });
  if (!serverRequest) {
    return next(req);
  }

  const context = inject(REQUEST_CONTEXT, { optional: true }) as SsrRequestContext | null;
  const responseInit = inject(RESPONSE_INIT, { optional: true });

  const headers: Record<string, string> = {};
  const cookie = serverRequest.headers.get('cookie');
  const userAgent = serverRequest.headers.get('user-agent');
  if (cookie) {
    headers['Cookie'] = cookie;
  }
  if (userAgent) {
    headers['User-Agent'] = userAgent;
  }
  if (context?.clientIp) {
    headers['X-Forwarded-For'] = context.clientIp;
  }

  const forwarded = Object.keys(headers).length > 0 ? req.clone({ setHeaders: headers }) : req;

  return next(forwarded).pipe(
    tap((event) => {
      if (!responseInit || !(event instanceof HttpResponse)) {
        return;
      }
      const setCookies = event.headers.getAll('set-cookie');
      if (setCookies?.length) {
        const responseHeaders = new Headers(responseInit.headers);
        setCookies.forEach((value) => responseHeaders.append('set-cookie', value));
        responseInit.headers = responseHeaders;
      }
    }),
  );
};
