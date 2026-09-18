const pad = (n: number) => String(n).padStart(2, '0');

/** Local-time stamp, YYYYMMDDHHmmss, so downloads sort by when they were saved. */
const stamp = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
  `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;

/** Filesystem-safe slug of the bill name; the app name when there is none. */
const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'split-stoopid';

/**
 * Name for a file the user saves from the app (processed receipt photo, JSON
 * export): `YYYYMMDDHHmmss-<bill name>.<ext>`.
 */
export function exportFileName(billName: string, ext: string, now: Date = new Date()): string {
  return `${stamp(now)}-${slug(billName)}.${ext}`;
}
