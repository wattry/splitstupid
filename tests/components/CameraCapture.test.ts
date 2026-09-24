import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import CameraCapture from '../../src/CameraCapture.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const setMediaDevices = (value: unknown) =>
  Object.defineProperty(navigator, 'mediaDevices', { value, configurable: true });

const rejectWith = (name: string) => {
  const getUserMedia = vi.fn(() => Promise.reject(Object.assign(new Error(name), { name })));
  setMediaDevices({ getUserMedia });
  return getUserMedia;
};

async function mount(onUpload = vi.fn()) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  await act(async () => {
    createRoot(host).render(
      React.createElement(CameraCapture, { count: 0, max: 9, onCapture: () => {}, onClose: () => {}, onUpload })
    );
  });
  return { host, onUpload };
}

const click = (el: Element) => act(async () => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
const button = (host: Element, label: string) =>
  [...host.querySelectorAll('button')].find((b) => b.textContent === label);

afterEach(() => { document.body.innerHTML = ''; });

describe('CameraCapture errors', () => {
  it('permission denied: shows the title, the steps, and a Try again button that asks again', async () => {
    const getUserMedia = rejectWith('NotAllowedError');
    const { host } = await mount();
    expect(host.querySelector('.camera__error-title')?.textContent).toBe('Camera access is off');
    expect(host.querySelectorAll('.camera__error li').length).toBeGreaterThan(1);
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    await click(button(host, 'Try again')!);
    expect(getUserMedia).toHaveBeenCalledTimes(2);
  });

  it('no getUserMedia at all: unsupported message, no Try again', async () => {
    setMediaDevices(undefined);
    const { host } = await mount();
    expect(host.querySelector('.camera__error-title')?.textContent).toBe('Camera not available here');
    expect(button(host, 'Try again')).toBeUndefined();
  });

  it('Use Upload hands off to the file picker', async () => {
    rejectWith('NotFoundError');
    const { host, onUpload } = await mount();
    await click(button(host, 'Use Upload')!);
    expect(onUpload).toHaveBeenCalled();
  });

  it('Capture is disabled while in an error state', async () => {
    rejectWith('NotAllowedError');
    const { host } = await mount();
    expect((button(host, 'Capture') as HTMLButtonElement).disabled).toBe(true);
  });
});
