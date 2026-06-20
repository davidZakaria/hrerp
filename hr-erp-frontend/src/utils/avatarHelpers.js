import { useEffect, useState } from 'react';
import API_URL from '../config/api';

/**
 * Load avatar image with auth header (uploads are protected).
 */
export function useAuthenticatedAvatar(profilePicture) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    let objectUrl = null;
    let cancelled = false;

    async function load() {
      if (!profilePicture) {
        setSrc(null);
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        setSrc(null);
        return;
      }

      const url = profilePicture.startsWith('http')
        ? profilePicture
        : `${API_URL}${profilePicture}`;

      try {
        const res = await fetch(url, { headers: { 'x-auth-token': token } });
        if (!res.ok || cancelled) return;
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch {
        if (!cancelled) setSrc(null);
      }
    }

    load();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [profilePicture]);

  return src;
}

export function persistProfilePicture(profilePicture) {
  if (profilePicture) {
    localStorage.setItem('profilePicture', profilePicture);
  } else {
    localStorage.removeItem('profilePicture');
  }
}
