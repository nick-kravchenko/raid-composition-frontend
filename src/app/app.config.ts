import { DOCUMENT } from '@angular/common';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  APP_INITIALIZER,
  ApplicationConfig,
  inject,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import {
  provideClientHydration,
  withEventReplay,
  withNoIncrementalHydration,
} from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { API_BASE, browserApiBase } from './app.tokens';
import { AuthService } from './auth/auth.service';
import { csrfInterceptor } from './csrf.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(withEventReplay(), withNoIncrementalHydration()),
    provideHttpClient(withFetch(), withInterceptors([csrfInterceptor])),
    { provide: API_BASE, useFactory: () => browserApiBase(inject(DOCUMENT).location) },
    {
      provide: APP_INITIALIZER,
      useFactory: (auth: AuthService) => () => auth.loadSession().catch(() => {}),
      deps: [AuthService],
      multi: true,
    },
  ],
};
