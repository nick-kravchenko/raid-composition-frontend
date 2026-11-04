import { InjectionToken } from '@angular/core';

export const API_BASE = new InjectionToken<string>('API_BASE');

/**
 * API base URL for the browser. Local development talks to the backend on its own port; every
 * other host serves the API from the same origin as the frontend.
 */
export function browserApiBase(location: Pick<Location, 'hostname' | 'origin'>): string {
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    return 'http://localhost:8000/api/v1';
  }
  return `${location.origin}/api/v1`;
}
