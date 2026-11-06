import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import API from '@/services/api';

// A banned account with an unexpired token gets 403 AUTH_ACCOUNT_BANNED: the
// session ends (tokens cleared, back to /auth). Other 403s are not a ban.

function respondWith(status: number, data: unknown) {
  API.defaults.adapter = (config: InternalAxiosRequestConfig) =>
    Promise.reject(
      new AxiosError('fail', String(status), config, null, {
        status, statusText: '', headers: {}, config: { ...config, headers: new AxiosHeaders() }, data,
      }),
    );
}

let href = '/opportunities';
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  href = '/opportunities';
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, pathname: '/opportunities', get href() { return href; }, set href(v: string) { href = v; } },
  });
});

describe('API client', () => {
  it('ends the session on 403 AUTH_ACCOUNT_BANNED', async () => {
    localStorage.setItem('authToken', 't');
    localStorage.setItem('refreshToken', 'r');
    const onChange = vi.fn();
    window.addEventListener('screna-auth-change', onChange);
    respondWith(403, { status: 'ERROR', errorCode: 'AUTH_ACCOUNT_BANNED' });
    await expect(API.post('/careers/applications/a/interview', {})).rejects.toBeTruthy();
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(onChange).toHaveBeenCalled();
    expect(href).toBe('/auth');
  });

  it('keeps the session on any other 403', async () => {
    localStorage.setItem('authToken', 't');
    respondWith(403, { status: 'ERROR', errorCode: 'INSUFFICIENT_INTERVIEW_QUOTA' });
    await expect(API.post('/careers/applications/a/interview', {})).rejects.toBeTruthy();
    expect(localStorage.getItem('authToken')).toBe('t');
    expect(href).toBe('/opportunities');
  });
});
