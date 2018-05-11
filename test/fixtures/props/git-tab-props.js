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

export async function gitTabControllerProps(atomEnv, repository, overrides = {}) {
  const repoProps = {
    lastCommit: await repository.getLastCommit(),
    recentCommits: await repository.getRecentCommits({max: 10}),
    isMerging: await repository.isMerging(),
    isRebasing: await repository.isRebasing(),
    hasUndoHistory: await repository.hasDiscardHistory(),
    currentBranch: await repository.getCurrentBranch(),
    unstagedChanges: await repository.getUnstagedChanges(),
    stagedChanges: await repository.getStagedChanges(),
    mergeConflicts: await repository.getMergeConflicts(),
    workingDirectoryPath: repository.getWorkingDirectoryPath(),
    fetchInProgress: false,
    ...overrides,
  };

  repoProps.mergeMessage = repoProps.isMerging ? await repository.getMergeMessage() : null;

  return gitTabContainerProps(atomEnv, repository, repoProps);
}
