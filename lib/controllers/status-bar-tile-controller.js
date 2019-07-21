import React, {useRef, Fragment} from 'react';
import PropTypes from 'prop-types';

import {useRepository} from '../context/workdir';
import BranchView from '../views/branch-view';
import BranchMenuView from '../views/branch-menu-view';
import PushPullView from '../views/push-pull-view';
import ChangedFilesCountView from '../views/changed-files-count-view';
import GithubTileView from '../views/github-tile-view';
import Tooltip from '../atom/tooltip';
import Commands, {Command} from '../atom/commands';
import ObserveModel from '../views/observe-model';
import RefHolder from '../models/ref-holder';
import yubikiri from 'yubikiri';

export default function StatusBarTileController({toggleGitTab, toggleGitHubTab}) {
  const repository = useRepository();
  const refBranchViewRoot = useRef(new RefHolder());

  function getChangedFilesCount(data) {
    const {stagedFiles, unstagedFiles, mergeConflictFiles} = data.statusesForChangedFiles;
    const changedFiles = new Set();

    for (const filePath in unstagedFiles) {
      changedFiles.add(filePath);
    }
    for (const filePath in stagedFiles) {
      changedFiles.add(filePath);
    }
    for (const filePath in mergeConflictFiles) {
      changedFiles.add(filePath);
    }

    return changedFiles.size;
  }

  function fetchData(r) {
    return yubikiri({
      currentBranch: r.getCurrentBranch(),
      branches: r.getBranches(),
      statusesForChangedFiles: r.getStatusesForChangedFiles(),
      currentRemote: async query => r.getRemoteForBranch((await query.currentBranch).getName()),
      aheadCount: async query => r.getAheadCount((await query.currentBranch).getName()),
      behindCount: async query => r.getBehindCount((await query.currentBranch).getName()),
      originExists: async () => (await r.getRemotes()).withName('origin').isPresent(),
    });
  }

  function renderTiles(repoProps) {
    if (!repository.showStatusBarTiles()) {
      return null;
    }

    const operationStates = repository.getOperationStates();
    const pushInProgress = operationStates.isPushInProgress();
    const pullInProgress = operationStates.isPullInProgress();
    const fetchInProgress = operationStates.isFetchInProgress();

    function fetch() {
      const upstream = repoProps.currentBranch.getUpstream();
      return repository.fetch(upstream.getRemoteRef(), {remoteName: upstream.getRemoteName()});
    }

    function pull() {
      return repository.pull(repoProps.currentBranch.getName(), {
        refSpec: repoProps.currentBranch.getRefSpec('PULL'),
      });
    }

    function push() {
      return repository.push(repoProps.currentBranch.getName(), {
        force: false,
        setUpstream: !repoProps.currentRemote.isPresent(),
        refSpec: repoProps.currentBranch.getRefSpec('PUSH'),
      });
    }

    function forcePush() {
      return repository.push(repoProps.currentBranch.getName(), {
        force: true,
        setUpstream: !repoProps.currentRemote.isPresent(),
        refSpec: repoProps.currentBranch.getRefSpec('PUSH'),
      });
    }

    function checkout(branchName, options) {
      return repository.checkout(branchName, options);
    }

    return (
      <Fragment>
        <Commands target="atom-workspace">
          <Command command="github:fetch" callback={fetch} />
          <Command command="github:pull" callback={pull} />
          <Command command="github:push" callback={push} />
          <Command command="github:force-push" callback={forcePush} />
        </Commands>
        <BranchView
          refRoot={refBranchViewRoot.current.setter}
          checkout={checkout}
          currentBranch={repoProps.currentBranch}
        />
        <Tooltip
          target={refBranchViewRoot.current}
          trigger="click" className="github-StatusBarTileController-tooltipMenu">
          <BranchMenuView checkout={checkout} branches={repoProps.branches} currentBranch={repoProps.currentBranch} />
        </Tooltip>
        <PushPullView
          isSyncing={fetchInProgress || pullInProgress || pushInProgress}
          isFetching={fetchInProgress}
          isPulling={pullInProgress}
          isPushing={pushInProgress}
          push={push}
          pull={pull}
          fetch={fetch}
          currentBranch={repoProps.currentBranch}
          currentRemote={repoProps.currentRemote}
          behindCount={repoProps.behindCount}
          aheadCount={repoProps.aheadCount}
          originExists={repoProps.originExists}
        />
      </Fragment>
    );
  }

  function renderWithResult(data) {
    if (!data) {
      return null;
    }

    let changedFilesCount, mergeConflictsPresent;
    if (data.statusesForChangedFiles) {
      changedFilesCount = getChangedFilesCount(data);
      mergeConflictsPresent = Object.keys(data.statusesForChangedFiles.mergeConflictFiles).length > 0;
    } else {
      changedFilesCount = 0;
      mergeConflictsPresent = false;
    }

    const repoProps = {
      repository,
      currentBranch: data.currentBranch,
      branches: data.branches,
      currentRemote: data.currentRemote,
      aheadCount: data.aheadCount,
      behindCount: data.behindCount,
      originExists: data.originExists,
      changedFilesCount,
      mergeConflictsPresent,
    };

    return (
      <Fragment>
        {renderTiles(repoProps)}
        <GithubTileView didClick={toggleGitHubTab} />
        <ChangedFilesCountView
          didClick={toggleGitTab}
          changedFilesCount={changedFilesCount}
          mergeConflictsPresent={mergeConflictsPresent}
        />
      </Fragment>
    );
  }

  return (
    <ObserveModel model={repository} fetchData={fetchData}>
      {renderWithResult}
    </ObserveModel>
  );
}

StatusBarTileController.propTypes = {
  toggleGitTab: PropTypes.func.isRequired,
  toggleGitHubTab: PropTypes.func.isRequired,
};
