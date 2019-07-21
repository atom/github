import React, {useContext} from 'react';

import WorkdirContext from '../models/workdir-context';
import WorkdirContextPool from '../models/workdir-context-pool';

export const WorkdirPoolContext = React.createContext(new WorkdirContextPool());

export const ActiveWorkdirContext = React.createContext(null);

export function useWorkdir() {
  const maybeWorkdir = useContext(ActiveWorkdirContext);
  return maybeWorkdir || WorkdirContext.absent();
}

export function useRepository() {
  const workdir = useWorkdir();
  return workdir.getRepository();
}

export function useResolutionProgress() {
  const workdir = useWorkdir();
  return workdir.getResolutionProgress();
}
