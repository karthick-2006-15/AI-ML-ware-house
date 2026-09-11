/**
 * Global API and WebSocket Endpoint Configuration
 * Seamlessly resolves between local development and cloud production (Vercel -> Render)
 */

// Default production Render backend URL
const PRODUCTION_BACKEND_URL = 'https://ai-ml-ware-house.onrender.com';

// Determine base API URL from environment variable, or fallback in production
const rawEnvUrl = import.meta.env.VITE_API_URL?.trim();

export const API_BASE_URL = rawEnvUrl 
  ? rawEnvUrl.replace(/\/+$/, '') 
  : (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? '' 
      : PRODUCTION_BACKEND_URL);

/**
 * Returns a fully-qualified API URL for a given endpoint path.
 * - In Production (Vercel with VITE_API_URL set): 'https://your-backend.onrender.com/api/...'
 * - In Local Development: '/api/...' (handled by Vite development proxy)
 */
export function getApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!API_BASE_URL) {
    return normalizedPath;
  }
  return `${API_BASE_URL}${normalizedPath}`;
}

/**
 * Returns a secure WebSocket URL for real-time telemetry.
 * Automatically maps http -> ws and https -> wss.
 * - In Production: 'wss://your-backend.onrender.com/ws/state'
 * - In Local Dev: 'ws://127.0.0.1:8000/ws/state'
 */
export function getWsUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (API_BASE_URL) {
    const wsBase = API_BASE_URL.replace(/^https:\/\//i, 'wss://').replace(/^http:\/\//i, 'ws://');
    return `${wsBase}${normalizedPath}`;
  }

  // Fallback on localhost
  return `ws://127.0.0.1:8000${normalizedPath}`;
}
