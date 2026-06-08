import React, { useState, useEffect } from 'react';
import type { ReactElement } from 'react';
import { AxiosError } from 'axios';

import {
  LocationContext,
  LocationContextValues,
  defaultProps
} from './LocationContext.js';
import { IPLookUp } from '../lib/ip.js';
import taxRates from '../lib/stateTaxRates.json' with { type: 'json' };

export function LocationProvider(props: { children: ReactElement }): ReactElement {
  const { children } = props;
  const [location, setLocation] = useState<LocationContextValues>(defaultProps);
  const [client] = useState<IPLookUp>(new IPLookUp());

  async function getLocation() {
    try {
      if (client.location) {
        const state = client.location['region_code'];
        const ip = client.location['ip'];
        const stateTaxes = taxRates.find((rate) => rate.state === state);

        setLocation((prev) => ({
          ...prev,
          state,
          ip,
          salesTax: stateTaxes?.value ?? prev.salesTax,
          isLoading: false
        }));
      }
    } catch (e: unknown) {
      setLocation((prev) => ({ ...prev, isLoading: false }));
      if (e instanceof AxiosError) {
        const error = e as AxiosError;
        console.log('Unable to find geolocation', error.message, error.stack, error.response?.data);
      } else {
        const error = e as Error;
        console.log('Unable to find geolocation', error.message, error.stack);
      }
    }
  }

  useEffect(() => {
    getLocation();
  }, [client.ip]);

  return (<LocationContext.Provider
    value={location}
  >
    {children}
  </LocationContext.Provider>);
}