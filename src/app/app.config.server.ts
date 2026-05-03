import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { API_BASE } from './app.tokens';
import { cookieForwarderInterceptor } from './auth/cookie-forwarder.interceptor';
import { csrfInterceptor } from './csrf.interceptor';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    provideHttpClient(withFetch(), withInterceptors([csrfInterceptor, cookieForwarderInterceptor])),
    { provide: API_BASE, useValue: process.env['API_BASE_URL'] ?? 'http://localhost:8000/api/v1' },
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
