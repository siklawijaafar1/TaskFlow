/**
 * auth.js — Authentication API calls (R05, R25)
 * All fetch() calls are centralised here.
 * Cookies are managed by the browser automatically (httpOnly, SameSite=Lax).
 */
import { api } from './client';

export const authApi = {
  // New endpoint (Checkpoint 2)
  signup:   (data) => api.post('/auth/signup', data),
  // Backward-compat alias (Checkpoint 1 forms still use this)
  register: (data) => api.post('/auth/signup', data),
  login:    (data) => api.post('/auth/login', data),
  logout:   ()     => api.post('/auth/logout'),
  me:       ()     => api.get('/auth/me'),
};
