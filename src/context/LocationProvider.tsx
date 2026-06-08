import React, { useState, useEffect } from 'react';
import type { ReactElement } from 'react';

import {
  LocationContext,
  type LocationContextValues,
  defaultProps
} from './LocationContext.js';
import { IPLookUp } from '../lib/ip.js';
import taxRates from '../lib/stateTaxRates.json' with { type: 'json' };

const client = new IPLookUp();

export function LocationProvider(props: { children: ReactElement }): ReactElement {
  const { children } = props;
  // Cached location is available synchronously, so there's nothing to wait for.
  const [location, setLocation] = useState<LocationContextValues>(() => ({
    ...defaultProps,
    isLoading: !client.location
  }));

  useEffect(() => {
    let cancelled = false;

    // Merge whatever the client currently knows into context and stop loading.
    const apply = () => {
      if (cancelled) return;

      const loc = client.location;
      if (!loc) {
        setLocation((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      const stateTaxes = taxRates.find((rate) => rate.state === loc.region_code);
      setLocation((prev) => {
        // Already showing this exact location (e.g. fresh result matches the
        // cache) — leave state as-is so nothing downstream re-renders/resets.
        const unchanged =
          !prev.isLoading &&
          prev.state === loc.region_code &&
          prev.ip === loc.ip;
        if (unchanged) return prev;

        return {
          ...prev,
          state: loc.region_code,
          ip: loc.ip,
          salesTax: stateTaxes?.value ?? prev.salesTax,
          text: `${loc.city}, ${loc.region}`,
          isLoading: false
        };
      });
    };

    // Paint cached data right away, then refresh once the lookup settles —
    // overwriting only if the user's location actually changed.
    if (client.location) apply();
    client.ready.finally(apply);

    return () => { cancelled = true; };
  }, []);

  return (<LocationContext.Provider
    value={location}
  >
    {children}
  </LocationContext.Provider>);
}