import {
  InventoryStatus,
  UserStateResponse,
  HoldResponse,
  PaymentProcessRequest,
} from '@sneakdrop/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export async function getInventoryStatus(): Promise<InventoryStatus> {
  const res = await fetch(`${API_BASE}/inventory/status`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch inventory status');
  return res.json();
}

export async function getUserState(userId: string): Promise<UserStateResponse> {
  const res = await fetch(`${API_BASE}/reservations/user/${userId}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch user state');
  return res.json();
}

export async function requestHold(userId: string): Promise<HoldResponse> {
  const res = await fetch(`${API_BASE}/reservations/hold`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  const data = await res.json();
  if (!res.ok && !data.queued) {
    throw new Error(data.message || 'Failed to request hold');
  }
  return data;
}

export async function cancelHold(reservationId: string, userId: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/reservations/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reservationId, userId }),
  });
  return res.json();
}

export async function joinQueue(userId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/queue/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  return res.json();
}

export async function leaveQueue(userId: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/queue/leave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  return res.json();
}

export async function processPayment(params: {
  userId: string;
  reservationId: string;
  simulateFailure?: boolean;
  simulateDelayMs?: number;
  duplicate?: boolean;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/payments/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Payment failed');
  }
  return data;
}

export async function resetInventory(totalStock: number = 20): Promise<any> {
  const res = await fetch(`${API_BASE}/inventory/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ totalStock }),
  });
  return res.json();
}
