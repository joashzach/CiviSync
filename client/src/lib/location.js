const CACHE_KEY       = 'civisync_user_location';
export const DEFAULT_LOC   = { lat: 13.0827, lng: 80.2707 };
export const DEFAULT_CENTER = [13.0827, 80.2707];

// ── Cache & Sync helpers ──────────────────────────────────────────────────────

/** Synchronously read a previously-saved location from localStorage */
export function getCachedLocation() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.lat === 'number' && typeof parsed?.lng === 'number') {
        // Purge old stale IP lookup or Mumbai coordinates
        if (
          parsed.source === 'ip' ||
          (parsed.lat >= 18.5 && parsed.lat <= 19.5 && parsed.lng >= 72.5 && parsed.lng <= 73.5)
        ) {
          localStorage.removeItem(CACHE_KEY);
          return DEFAULT_LOC;
        }
        return parsed;
      }
    }
  } catch (_) {}
  return DEFAULT_LOC;
}

export function saveLocationToCache(loc) {
  try {
    if (loc?.lat && loc?.lng) {
      localStorage.setItem(CACHE_KEY, JSON.stringify(loc));
      broadcastLocation(loc);
    }
  } catch (_) {}
}

export function broadcastLocation(loc) {
  try {
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('civisync:location_updated', { detail: loc }));
    }
  } catch (_) {}
}

/** Subscribe to live location changes across all active components/pages */
export function subscribeToLocationUpdates(callback) {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = (e) => {
    if (e.detail && callback) callback(e.detail);
  };

  const handleStorageEvent = (e) => {
    if (e.key === CACHE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed?.lat && parsed?.lng && callback) callback(parsed);
      } catch (_) {}
    }
  };

  window.addEventListener('civisync:location_updated', handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener('civisync:location_updated', handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}

// ── Core Location Detection ───────────────────────────────────────────────────

/**
 * Accurately determines the user's actual location:
 * 1. High-accuracy device GPS / Wi-Fi triangulation via browser geolocation (pinpoints exact coordinates).
 * 2. Falls back to DEFAULT_LOC (Chennai: 13.0827, 80.2707) if geolocation is denied or unavailable.
 *
 * Saves to localStorage and broadcasts to all listening components so all maps stay 100% in sync.
 */
export async function getCurrentUserLocation(options = {}) {
  const { forceGPS = false, timeout = 8000 } = options;

  // 1. High-Accuracy Browser Geolocation (Primary)
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout,
            maximumAge: forceGPS ? 0 : 30000,
          }
        );
      });

      if (position?.coords) {
        const { latitude: lat, longitude: lng, accuracy } = position.coords;
        const loc = {
          lat,
          lng,
          accuracy: accuracy || null,
          source: 'gps',
          updatedAt: Date.now(),
        };

        saveLocationToCache(loc);
        return loc;
      }
    } catch (gpsError) {
      console.warn('[Location] GPS geolocation error or denied:', gpsError?.message || gpsError);
    }
  }

  // 2. Fallback: Cached GPS location or Default Location (Chennai: 13.0827, 80.2707)
  const cached = getCachedLocation();
  const fallback = (cached?.lat && cached?.lng) ? cached : DEFAULT_LOC;
  saveLocationToCache(fallback);
  return fallback;
}
