import { createContext } from 'react';

export interface LocationContextValues {
  state: string;
  location: string;
  ip: string;
  isLoading: boolean;
  salesTax: number;
  text: string;
}

export const defaultProps: LocationContextValues = {
  state: '',
  location: '',
  ip: '',
  text: '',
  isLoading: false,
  salesTax: 5
};

export const LocationContext = createContext<LocationContextValues>(defaultProps);
