import { isPlatformServer } from '@angular/common';
import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID, REQUEST } from '@angular/core';

// REQUEST token is from @angular/core (Angular 21.2.x)
export const cookieForwarderInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isPlatformServer(inject(PLATFORM_ID))) {
    return next(req);
  }

  const serverRequest = inject(REQUEST, { optional: true });
  if (!serverRequest) {
    return next(req);
  }

  const cookie = serverRequest.headers.get('cookie');
  if (!cookie) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { Cookie: cookie } }));
};
