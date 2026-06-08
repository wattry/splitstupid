import { createContext } from 'react';

export interface LocationContextValues {
  state: string;
  location: string;
  ip: string;
  isLoading: boolean;
  salesTax: number;
}

export const defaultProps: LocationContextValues = {
  state: '',
  location: '',
  ip: '',
  isLoading: true,
  salesTax: 5
};

export const LocationContext = createContext<LocationContextValues>(defaultProps);
