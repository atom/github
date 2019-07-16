import React, {useContext} from 'react';

export const AtomContext = React.createContext(null);

export function useAtomEnv() {
  const atomEnv = useContext(AtomContext);
  if (atomEnv === null) {
    throw new Error('AtomContext is required');
  }
  return atomEnv;
}
