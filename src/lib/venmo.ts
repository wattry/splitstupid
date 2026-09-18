/**
 * Build a Venmo pay/request link. account.venmo.com/pay accepts amount and
 * note without a recipient (venmo.com/?txn=... 404s without one). On mobile
 * the OS hands venmo.com links to the app when installed.
 *
 * `pay` sends money; `charge` requests it. The user picks the other person
 * inside Venmo.
 */
export interface VenmoLinkOptions {
  txn: 'pay' | 'charge';
  amount: number;
  note: string;
}

export function venmoLink({ txn, amount, note }: VenmoLinkOptions): string {
  const params = new URLSearchParams({
    txn,
    audience: 'private',
    amount: (Math.round(amount * 100) / 100).toFixed(2),
    note,
  });
  return `https://account.venmo.com/pay?${params.toString()}`;
}
