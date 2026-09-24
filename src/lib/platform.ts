/**
 * True on iPhone, iPad and iPod. iPadOS Safari reports itself as a Mac, so a
 * "Macintosh" UA with a multi-touch screen counts too.
 */
export function isIOS(userAgent: string, maxTouchPoints = 0): boolean {
  if (/iphone|ipad|ipod/i.test(userAgent)) return true;
  return /macintosh/i.test(userAgent) && maxTouchPoints > 1;
}
