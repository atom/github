import ResolutionProgress from '../../../lib/models/conflicts/resolution-progress';

function noop() {}

export function gitTabItemProps(atomEnv, repository, overrides = {}) {
  return {
    repository,
    workspace: atomEnv.workspace,
    commandRegistry: atomEnv.commands,
    grammars: atomEnv.grammars,
    resolutionProgress: new ResolutionProgress(),
    notificationManager: atomEnv.notifications,
    config: atomEnv.config,
    project: atomEnv.project,
    tooltips: atomEnv.tooltips,
    confirm: noop,
    ensureGitTab: noop,
    refreshResolutionProgress: noop,
    undoLastDiscard: noop,
    discardWorkDirChangesForPaths: noop,
    openFiles: noop,
    initializeRepo: noop,
    ...overrides
  };
}

export function gitTabContainerProps(atomEnv, repository, overrides = {}) {
  return gitTabItemProps(atomEnv, repository, overrides);
}
