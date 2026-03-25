const BASE_URL = process.env.REACT_APP_BASE_URL;

export const getPayoutSummary = async () => {
  const res = await fetch(`${BASE_URL}/api/v1/payouts/summary`, { credentials: 'include' });
  const data = await res.json();
  if (!res.ok) throw { code: res.status, message: data.error || 'Failed to load payout summary' };
  return data;
};

export const getPayoutHistory = async () => {
  const res = await fetch(`${BASE_URL}/api/v1/payouts`, { credentials: 'include' });
  const data = await res.json();
  if (!res.ok) throw { code: res.status, message: data.error || 'Failed to load payout history' };
  return data;
};

export const createPayout = async ({ sellerSub, amount, periodStart, periodEnd, notes }) => {
  const res = await fetch(`${BASE_URL}/api/v1/payouts`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sellerSub, amount, periodStart, periodEnd, notes }),
  });
  const data = await res.json();
  if (!res.ok) throw { code: res.status, message: data.error || 'Failed to create payout' };
  return data;
};

export const getMyEarnings = async () => {
  const res = await fetch(`${BASE_URL}/api/v1/payouts/my-earnings`, { credentials: 'include' });
  const data = await res.json();
  if (!res.ok) throw { code: res.status, message: data.error || 'Failed to load earnings' };
  return data;
};
