import type { VenmoPlatform as Platform } from './venmo.js';

export type CameraErrorKind = 'denied' | 'missing' | 'busy' | 'unsupported' | 'unknown';

export interface CameraError {
  kind: CameraErrorKind;
  title: string;
  /** How to fix it, one step per line. */
  steps: string[];
  /** Whether trying again could succeed (e.g. after changing a setting). */
  retry: boolean;
}

/** False when getUserMedia is missing: HTTP page, or an in-app browser. */
export function cameraSupported(devices: MediaDevices | undefined): boolean {
  return typeof devices?.getUserMedia === 'function';
}

/** Where to re-enable camera access for this site, by platform. */
function permissionSteps(platform: Platform): string[] {
  switch (platform) {
    case 'ios':
      return [
        'Tap the aA (or ···) icon in the address bar.',
        'Open Website Settings and set Camera to Allow.',
        'Then tap Try again.',
      ];
    case 'android':
      return [
        'Tap the lock icon next to the address.',
        'Open Permissions and allow Camera.',
        'Then tap Try again.',
      ];
    default:
      return [
        'Click the camera icon in the address bar.',
        'Choose Always allow and reload if asked.',
        'Then click Try again.',
      ];
  }
}

/**
 * Turn a getUserMedia failure into something the user can act on. Browsers
 * only show the permission prompt once; after a "Don't allow" they reject
 * silently, so the page has to explain where the setting lives.
 */
export function cameraError(err: unknown, platform: Platform): CameraError {
  const name = err instanceof Error ? err.name : '';

  if (err instanceof TypeError || name === 'SecurityError') {
    return {
      kind: 'unsupported',
      title: 'Camera not available here',
      steps: ['Open this page in Safari or Chrome, or use Upload instead.'],
      retry: false,
    };
  }

  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return { kind: 'denied', title: 'Camera access is off', steps: permissionSteps(platform), retry: true };
    case 'NotFoundError':
    case 'OverconstrainedError':
      return { kind: 'missing', title: 'No camera found', steps: ['Use Upload to pick a photo instead.'], retry: false };
    case 'NotReadableError':
      return { kind: 'busy', title: 'Camera is in use', steps: ['Close other apps using the camera, then try again.'], retry: true };
    default:
      return { kind: 'unknown', title: 'Camera failed to start', steps: ['Try again, or use Upload instead.'], retry: true };
  }
}
