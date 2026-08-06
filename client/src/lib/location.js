/**
 * Utility to detect user's current location seamlessly.
 * 1. Primary: IP-based Geolocation (accurate to user's city/network IP).
 * 2. Secondary: Browser Geolocation.
 * 3. Silent — NO popups or toast notifications.
 */
export async function getCurrentUserLocation() {
  // First attempt IP location for fast city-level accuracy
  const ipLoc = await getIpLocation();
  if (ipLoc && ipLoc.lat && ipLoc.lng && (ipLoc.lat !== 12.9716 || ipLoc.lng !== 77.5946)) {
    return ipLoc;
  }

  // Fallback to browser geolocation if available
  return new Promise((resolve) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => resolve(ipLoc || { lat: 12.9716, lng: 77.5946 }),
        { enableHighAccuracy: true, timeout: 4000, maximumAge: 60000 }
      );
    } else {
      resolve(ipLoc || { lat: 12.9716, lng: 77.5946 });
    }
  });
}

export async function getIpLocation() {
  // Provider 1: ipapi.co
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        return { lat: data.latitude, lng: data.longitude, city: data.city, region: data.region };
      }
    }
  } catch (err) {
    // Silent fail
  }

  // Provider 2: ip-api.com
  try {
    const res = await fetch('https://ip-api.com/json/');
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.lat === 'number' && typeof data.lon === 'number') {
        return { lat: data.lat, lng: data.lon, city: data.city, region: data.regionName };
      }
    }
  } catch (err) {
    // Silent fail
  }

  // Provider 3: ipinfo.io
  try {
    const res = await fetch('https://ipinfo.io/json');
    if (res.ok) {
      const data = await res.json();
      if (data && data.loc) {
        const [latStr, lngStr] = data.loc.split(',');
        const lat = parseFloat(latStr);
        const lng = parseFloat(lngStr);
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng, city: data.city, region: data.region };
        }
      }
    }
  } catch (err) {
    // Silent fail
  }

  return { lat: 12.9716, lng: 77.5946 };
}
