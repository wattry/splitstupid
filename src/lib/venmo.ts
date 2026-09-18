/**
 * Build a Venmo pay/request link. No recipient is passed; the user picks the
 * other person inside Venmo.
 *
 * - web:     https://account.venmo.com/pay?...  (venmo.com/?txn=... 404s
 *            without a recipient; account.venmo.com links open Venmo's home on
 *            Android and drop the params, hence the platform split)
 * - ios:     venmo://paycharge?...  app scheme
 * - android: intent:// wrapper around the same scheme, falling back to the
 *            web link when the app is not installed
 */
export type VenmoPlatform = 'web' | 'ios' | 'android';

export interface VenmoLinkOptions {
  txn: 'pay' | 'charge';
  amount: number;
  note: string;
}

export function detectPlatform(userAgent: string): VenmoPlatform {
  if (/android/i.test(userAgent)) return 'android';
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'ios';
  return 'web';
}

export function venmoLink({ txn, amount, note }: VenmoLinkOptions, platform: VenmoPlatform): string {
  const query = new URLSearchParams({
    txn,
    audience: 'private',
    amount: (Math.round(amount * 100) / 100).toFixed(2),
    note,
  }).toString();
  const web = `https://account.venmo.com/pay?${query}`;
  switch (platform) {
    case 'ios':
      return `venmo://paycharge?${query}`;
    case 'android':
      return `intent://paycharge?${query}#Intent;scheme=venmo;package=com.venmo;S.browser_fallback_url=${encodeURIComponent(web)};end`;
    default:
      return web;
  }
}
