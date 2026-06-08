import { useContext } from 'react';

import { LocationContext, type LocationContextValues } from '../context/LocationContext.js';

export function useIPLocation(): LocationContextValues {
  const context = useContext<LocationContextValues>(LocationContext);

  return context;
}
