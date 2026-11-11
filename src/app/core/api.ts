/** Public API deployed on Render. This URL has no credential or secret. */
export const API_BASE_URL = 'https://backend-ciugb-cinema.onrender.com/api';

export function apiUrl(path: string): string {
  const route = path.replace(/^\/api\/?/, '');
  return `${API_BASE_URL}/${route}`;
}
