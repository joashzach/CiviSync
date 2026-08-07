export function getStatusBadgeClass(status) {
  switch (status) {
    case 'Pending': return 'badge badge-pending';
    case 'Assigned': return 'badge badge-assigned';
    case 'In Progress': return 'badge badge-progress';
    case 'Resolved': return 'badge badge-resolved';
    default: return 'badge';
  }
}

export function getSeverityBadgeClass(severity) {
  switch (severity) {
    case 'Low': return 'badge badge-low';
    case 'Medium': return 'badge badge-medium';
    case 'High': return 'badge badge-high';
    case 'Critical': return 'badge badge-critical';
    default: return 'badge';
  }
}

export function getMarkerColor(status) {
  switch (status) {
    case 'Pending':     return '#D97706';
    case 'Assigned':   return '#2563EB';
    case 'In Progress': return '#7C3AED';
    case 'Resolved':   return '#16A34A';
    default:           return '#94A3B8';
  }
}

export function formatDistanceKm(km) {
  if (km < 1) return `${Math.round(km * 1000)}m away`;
  return `${km.toFixed(1)}km away`;
}

export function truncate(str, n = 60) {
  return str?.length > n ? str.slice(0, n) + '…' : str;
}
