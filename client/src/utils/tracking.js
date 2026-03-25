/**
 * Detect carrier and return the direct tracking URL for a given tracking number.
 * Patterns based on official carrier documentation.
 */
export function getTrackingUrl(trackingNumber) {
  if (!trackingNumber) return null;
  const t = trackingNumber.trim().toUpperCase().replace(/\s/g, '');

  // UPS: starts with 1Z, 18 chars total
  if (/^1Z[A-Z0-9]{16}$/i.test(t)) {
    return { carrier: 'UPS', url: `https://www.ups.com/track?tracknum=${t}` };
  }

  // USPS: 20–22 digit numeric starting with 9 (94, 93, 92, 91, 70, etc.)
  // Also catches USPS international like EA, CP, RA suffixed with US
  if (/^(9[0-4])\d{18,20}$/.test(t) || /^[0-9]{20,22}$/.test(t)) {
    return { carrier: 'USPS', url: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${t}` };
  }
  if (/^[A-Z]{2}\d{9}US$/.test(t)) {
    return { carrier: 'USPS', url: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${t}` };
  }

  // FedEx: 12, 15, or 20 digit numeric
  if (/^\d{12}$/.test(t) || /^\d{15}$/.test(t) || /^\d{20}$/.test(t)) {
    return { carrier: 'FedEx', url: `https://www.fedex.com/fedextrack/?trknbr=${t}` };
  }

  // Fallback: no carrier detected, use a universal tracker
  return { carrier: null, url: `https://parcelsapp.com/en/tracking/${t}` };
}
