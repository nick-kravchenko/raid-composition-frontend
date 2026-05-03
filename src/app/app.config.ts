import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { APP_INITIALIZER, ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { API_BASE } from './app.tokens';
import { AuthService } from './auth/auth.service';
import { csrfInterceptor } from './csrf.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch(), withInterceptors([csrfInterceptor])),
    { provide: API_BASE, useValue: 'http://localhost:8000/api/v1' },
    {
      provide: APP_INITIALIZER,
      useFactory: (auth: AuthService) => () => auth.loadSession().catch(() => {}),
      deps: [AuthService],
      multi: true,
    },
  ],
};
