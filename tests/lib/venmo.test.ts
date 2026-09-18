import { describe, it, expect } from 'vitest';
import { venmoLink } from '../../src/lib/venmo.js';

describe('venmoLink', () => {
  it('builds a pay universal link with amount and note', () => {
    const url = new URL(venmoLink({ txn: 'pay', amount: 12.5, note: 'Dinner' }));
    expect(url.origin + url.pathname).toBe('https://account.venmo.com/pay');
    expect(url.searchParams.get('txn')).toBe('pay');
    expect(url.searchParams.get('audience')).toBe('private');
    expect(url.searchParams.get('amount')).toBe('12.50');
    expect(url.searchParams.get('note')).toBe('Dinner');
    expect(url.searchParams.has('recipients')).toBe(false);
  });

  it('builds a charge link', () => {
    const url = new URL(venmoLink({ txn: 'charge', amount: 3, note: 'x' }));
    expect(url.searchParams.get('txn')).toBe('charge');
  });

  it('rounds the amount to cents', () => {
    const url = new URL(venmoLink({ txn: 'pay', amount: 10.006, note: 'x' }));
    expect(url.searchParams.get('amount')).toBe('10.01');
  });

  it('percent-encodes the note', () => {
    const link = venmoLink({ txn: 'pay', amount: 1, note: 'Pad Thai & Beer' });
    expect(link).not.toContain('Pad Thai & Beer');
    expect(new URL(link).searchParams.get('note')).toBe('Pad Thai & Beer');
  });
});
