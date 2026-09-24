import { useCallback, useEffect, useState } from 'react';
import type { Me } from '../types.js';
import { loadMe, newMe, saveMe } from '../lib/me.js';

export interface MeApi {
  me: Me;
  /** Store a new name. Callers validate first (see `validateMeName`). */
  setName(name: string): void;
  /** Replace the whole identity (id and name), e.g. after adopting a participant. */
  replace(me: Me): void;
}

/** The device owner's identity as state, created on first use and written through to storage. */
export function useMe(storage: Storage = window.localStorage): MeApi {
  const [me, setMe] = useState<Me>(() => loadMe(storage) ?? newMe());

  useEffect(() => {
    saveMe(storage, me);
  }, [storage, me]);

  const setName = useCallback((name: string) => setMe((cur) => ({ ...cur, name })), []);
  const replace = useCallback((next: Me) => setMe(next), []);

  return { me, setName, replace };
}
