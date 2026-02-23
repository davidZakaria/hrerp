/**
 * Handles session expiration (401 invalid token).
 * Clears auth data from localStorage and redirects to login.
 */
export function handleSessionExpired() {
  localStorage.removeItem('token');
  localStorage.removeItem('email');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userId');
  localStorage.removeItem('userName');
  window.location.href = '/login';
}
