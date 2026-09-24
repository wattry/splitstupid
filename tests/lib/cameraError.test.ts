import { describe, it, expect } from 'vitest';
import { cameraError, cameraSupported } from '../../src/lib/cameraError.js';

const err = (name: string) => Object.assign(new Error(name), { name });

describe('cameraSupported', () => {
  it('is false when mediaDevices is missing (insecure context, in-app browser)', () => {
    expect(cameraSupported(undefined)).toBe(false);
    expect(cameraSupported({} as MediaDevices)).toBe(false);
  });

  it('is true when getUserMedia exists', () => {
    expect(cameraSupported({ getUserMedia: () => Promise.reject() } as unknown as MediaDevices)).toBe(true);
  });
});

describe('cameraError', () => {
  it('denied on iOS: explains the aA menu and allows retry', () => {
    const r = cameraError(err('NotAllowedError'), 'ios');
    expect(r.kind).toBe('denied');
    expect(r.title).toBe('Camera access is off');
    expect(r.steps.join(' ')).toMatch(/aA/);
    expect(r.steps.join(' ')).toMatch(/Camera/);
    expect(r.retry).toBe(true);
  });

  it('denied on Android: explains the lock icon', () => {
    const r = cameraError(err('NotAllowedError'), 'android');
    expect(r.kind).toBe('denied');
    expect(r.steps.join(' ')).toMatch(/lock/i);
  });

  it('denied on desktop: explains the address-bar camera icon', () => {
    const r = cameraError(err('NotAllowedError'), 'web');
    expect(r.kind).toBe('denied');
    expect(r.steps.join(' ')).toMatch(/address bar/i);
  });

  it('no camera found cannot be retried', () => {
    const r = cameraError(err('NotFoundError'), 'web');
    expect(r.kind).toBe('missing');
    expect(r.retry).toBe(false);
  });

  it('camera in use by another app can be retried', () => {
    const r = cameraError(err('NotReadableError'), 'ios');
    expect(r.kind).toBe('busy');
    expect(r.retry).toBe(true);
  });

  it('unsupported context suggests Safari/Chrome or Upload', () => {
    const r = cameraError(new TypeError('x'), 'ios');
    expect(r.kind).toBe('unsupported');
    expect(r.retry).toBe(false);
    expect(r.steps.join(' ')).toMatch(/Safari/);
  });

  it('anything else is a generic failure with retry', () => {
    const r = cameraError(err('AbortError'), 'web');
    expect(r.kind).toBe('unknown');
    expect(r.retry).toBe(true);
  });
});
