import {
  HTTP_TRANSFER_CACHE_ORIGIN_MAP,
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import { mergeApplicationConfig, ApplicationConfig, Provider } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { API_BASE } from './app.tokens';
import { cookieForwarderInterceptor } from './auth/cookie-forwarder.interceptor';
import { csrfInterceptor } from './csrf.interceptor';

/**
 * SSR reaches the API through an internal address while the browser uses the public origin. The
 * map makes both resolve to the same transfer cache key, so hydration reuses the SSR responses.
 */
function transferCacheOriginMap(): Provider[] {
  const apiBaseUrl = process.env['API_BASE_URL'];
  const publicOrigin = process.env['PUBLIC_ORIGIN'];
  if (!apiBaseUrl || !publicOrigin) {
    return [];
  }
  return [
    {
      provide: HTTP_TRANSFER_CACHE_ORIGIN_MAP,
      useValue: { [new URL(apiBaseUrl).origin]: publicOrigin },
    },
  ];
}

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    provideHttpClient(withFetch(), withInterceptors([csrfInterceptor, cookieForwarderInterceptor])),
    { provide: API_BASE, useValue: process.env['API_BASE_URL'] ?? 'http://localhost:8000/api/v1' },
    ...transferCacheOriginMap(),
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
