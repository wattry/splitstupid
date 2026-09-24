import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { useMe, type MeApi } from '../../src/hooks/useMe.js';
import { ME_STORAGE_KEY } from '../../src/lib/me.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount(): { api: () => MeApi } {
  let latest: MeApi | undefined;
  function Probe() {
    latest = useMe(localStorage);
    return null;
  }
  const host = document.createElement('div');
  document.body.appendChild(host);
  act(() => { createRoot(host).render(React.createElement(Probe)); });
  return { api: () => latest! };
}

describe('useMe', () => {
  beforeEach(() => localStorage.clear());

  it('creates and persists a blank identity on first load', () => {
    const { api } = mount();
    expect(api().me.name).toBe('');
    expect(api().me.id).toMatch(/[0-9a-f-]{36}/);
    const stored = JSON.parse(localStorage.getItem(ME_STORAGE_KEY)!);
    expect(stored).toEqual({ v: 1, id: api().me.id, name: '' });
  });

  it('reuses the stored identity', () => {
    localStorage.setItem(ME_STORAGE_KEY, JSON.stringify({ v: 1, id: 'id-me', name: 'Ryan' }));
    const { api } = mount();
    expect(api().me).toEqual({ id: 'id-me', name: 'Ryan' });
  });

  it('replaces a corrupt identity with a fresh one', () => {
    localStorage.setItem(ME_STORAGE_KEY, '{nope');
    const { api } = mount();
    expect(api().me.name).toBe('');
    expect(JSON.parse(localStorage.getItem(ME_STORAGE_KEY)!).v).toBe(1);
  });

  it('setName persists and keeps the id', () => {
    const { api } = mount();
    const id = api().me.id;
    act(() => { api().setName('Ryan'); });
    expect(api().me).toEqual({ id, name: 'Ryan' });
    expect(JSON.parse(localStorage.getItem(ME_STORAGE_KEY)!)).toEqual({ v: 1, id, name: 'Ryan' });
  });
});
