import { describe, it, expect } from 'vitest';
import { venmoLink, detectPlatform } from '../../src/lib/venmo.js';

const opts = { txn: 'pay' as const, amount: 12.5, note: 'Dinner' };

describe('venmoLink', () => {
  it('builds a web link for desktop with amount and note, no recipient', () => {
    const url = new URL(venmoLink(opts, 'web'));
    expect(url.origin + url.pathname).toBe('https://account.venmo.com/pay');
    expect(url.searchParams.get('txn')).toBe('pay');
    expect(url.searchParams.get('audience')).toBe('private');
    expect(url.searchParams.get('amount')).toBe('12.50');
    expect(url.searchParams.get('note')).toBe('Dinner');
    expect(url.searchParams.has('recipients')).toBe(false);
  });

  it('builds a charge link', () => {
    const url = new URL(venmoLink({ ...opts, txn: 'charge' }, 'web'));
    expect(url.searchParams.get('txn')).toBe('charge');
  });

  it('rounds the amount to cents', () => {
    const url = new URL(venmoLink({ ...opts, amount: 10.006 }, 'web'));
    expect(url.searchParams.get('amount')).toBe('10.01');
  });

  it('percent-encodes the note', () => {
    const link = venmoLink({ ...opts, note: 'Pad Thai & Beer' }, 'web');
    expect(link).not.toContain('Pad Thai & Beer');
    expect(new URL(link).searchParams.get('note')).toBe('Pad Thai & Beer');
  });

  it('uses the venmo:// app scheme on iOS', () => {
    const link = venmoLink(opts, 'ios');
    expect(link).toBe('venmo://paycharge?txn=pay&audience=private&amount=12.50&note=Dinner');
  });

  it('uses an Android intent with the web link as fallback', () => {
    const link = venmoLink(opts, 'android');
    expect(link.startsWith('intent://paycharge?txn=pay&audience=private&amount=12.50&note=Dinner#Intent;')).toBe(true);
    expect(link).toContain('scheme=venmo;');
    expect(link).toContain('package=com.venmo;');
    expect(link).toContain(
      `S.browser_fallback_url=${encodeURIComponent(venmoLink(opts, 'web'))};`
    );
    expect(link.endsWith(';end')).toBe(true);
  });
});

describe('detectPlatform', () => {
  it('identifies Android', () => {
    expect(detectPlatform('Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/120')).toBe('android');
  });
  it('identifies iPhone and iPad', () => {
    expect(detectPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe('ios');
    expect(detectPlatform('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe('ios');
  });
  it('falls back to web', () => {
    expect(detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)')).toBe('web');
    expect(detectPlatform('')).toBe('web');
  });
});
