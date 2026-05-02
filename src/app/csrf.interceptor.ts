import { DOCUMENT } from '@angular/common';
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

export const csrfInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next(req);
  }

  const document = inject(DOCUMENT);
  const token = getCookieValue(document.cookie ?? '', 'csrf');

  if (!token) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { 'X-CSRF-Token': token } }));
};

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
