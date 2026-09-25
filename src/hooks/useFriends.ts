import { useCallback, useEffect, useState } from 'react';
import type { Friend } from '../types.js';
import {
  addFriend,
  loadFriends,
  removeFriend,
  renameFriend,
  saveFriends,
  type FriendResult,
} from '../lib/friends.js';

export interface FriendsApi {
  friends: Friend[];
  add(name: string, id?: string): FriendResult;
  rename(id: string, name: string): FriendResult;
  remove(id: string): void;
  /** Replace the whole list, e.g. after adopting a participant as Me. */
  set(friends: Friend[]): void;
}

/**
 * The device's friend list as React state, written through to `storage`
 * (localStorage by default) on every change. `add` and `rename` return the
 * pure result so callers can show validation errors; only `ok` results are
 * applied.
 */
export function useFriends(storage: Storage = window.localStorage): FriendsApi {
  const [friends, setFriends] = useState<Friend[]>(() => loadFriends(storage));

  useEffect(() => {
    saveFriends(storage, friends);
  }, [storage, friends]);

  const add = useCallback<FriendsApi['add']>(
    (name, id) => {
      const result = addFriend(friends, name, id);
      if (result.ok) setFriends(result.friends);
      return result;
    },
    [friends]
  );

  const rename = useCallback<FriendsApi['rename']>(
    (id, name) => {
      const result = renameFriend(friends, id, name);
      if (result.ok) setFriends(result.friends);
      return result;
    },
    [friends]
  );

  const remove = useCallback<FriendsApi['remove']>(
    (id) => setFriends((list) => removeFriend(list, id)),
    []
  );

  const set = useCallback<FriendsApi['set']>((list) => setFriends(list), []);

  return { friends, add, rename, remove, set };
}
