import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { useFriends, type FriendsApi } from '../../src/hooks/useFriends.js';
import { FRIENDS_STORAGE_KEY } from '../../src/lib/friends.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Mount a probe component and hand back a live view of the hook's API. */
function mount(): { api: () => FriendsApi } {
  let latest: FriendsApi | undefined;
  function Probe() {
    latest = useFriends(localStorage);
    return null;
  }
  const host = document.createElement('div');
  document.body.appendChild(host);
  act(() => { createRoot(host).render(React.createElement(Probe)); });
  return { api: () => latest! };
}

describe('useFriends', () => {
  beforeEach(() => localStorage.clear());

  it('starts from what is in storage', () => {
    localStorage.setItem(FRIENDS_STORAGE_KEY, JSON.stringify({ v: 1, friends: [{ id: 'a', name: 'Sam' }] }));
    const { api } = mount();
    expect(api().friends).toEqual([{ id: 'a', name: 'Sam' }]);
  });

  it('adds and persists', () => {
    const { api } = mount();
    let result: ReturnType<FriendsApi['add']>;
    act(() => { result = api().add('Alex'); });
    expect(result!.ok).toBe(true);
    expect(api().friends.map((f) => f.name)).toEqual(['Alex']);
    expect(JSON.parse(localStorage.getItem(FRIENDS_STORAGE_KEY)!).friends).toHaveLength(1);
  });

  it('returns the error and changes nothing on a duplicate', () => {
    const { api } = mount();
    act(() => { api().add('Alex'); });
    let result: ReturnType<FriendsApi['add']>;
    act(() => { result = api().add('alex'); });
    expect(result!.ok).toBe(false);
    expect(api().friends).toHaveLength(1);
  });

  it('renames and removes, persisting each', () => {
    const { api } = mount();
    act(() => { api().add('Alex', 'id-a'); });
    act(() => { api().rename('id-a', 'Alex K'); });
    expect(api().friends).toEqual([{ id: 'id-a', name: 'Alex K' }]);
    act(() => { api().remove('id-a'); });
    expect(api().friends).toEqual([]);
    expect(JSON.parse(localStorage.getItem(FRIENDS_STORAGE_KEY)!).friends).toEqual([]);
  });
});
