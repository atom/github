import React, {Fragment} from 'react';

import EnableableOperation from './enableable-operation';
import {GitError} from '../git-shell-out-strategy';
import PullRequestDetailView from '../views/pr-detail-view';
import {incrementCounter} from '../reporter-proxy';

class CheckoutState {
  constructor(name) {
    this.name = name;
  }

  when(cases) {
    return cases[this.name] || cases.default;
  }
}

export const checkoutStates = {
  HIDDEN: new CheckoutState('hidden'),
  DISABLED: new CheckoutState('disabled'),
  BUSY: new CheckoutState('busy'),
  CURRENT: new CheckoutState('current'),
};

export default class PullRequestCheckoutOp extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      checkoutInProgress: false,
      typename: null,
    };

    this.checkoutOp = new EnableableOperation(
      () => this.checkout().catch(e => {
        if (!(e instanceof GitError)) {
          throw e;
        }
      }),
    );
    this.checkoutOp.toggleState(this, 'checkoutInProgress');
  }

  render() {
    this.checkoutOp = this.nextCheckoutOp();
    if (this.props.childComponentType === 'PullRequestDetailView') {
      return (
        <Fragment>
          <PullRequestDetailView checkoutOp={this.checkoutOp} {...this.props} />
        </Fragment>
      );
    } else {
      return null;
    }
  }

  nextCheckoutOp() {
    const {repository} = this.props;
    const {pullRequest} = repository;

    if (this.props.isAbsent) {
      return this.checkoutOp.disable(checkoutStates.HIDDEN, 'No repository found');
    }

    if (this.props.isLoading) {
      return this.checkoutOp.disable(checkoutStates.DISABLED, 'Loading');
    }

    if (!this.props.isPresent) {
      return this.checkoutOp.disable(checkoutStates.DISABLED, 'No repository found');
    }

    if (this.props.isMerging) {
      return this.checkoutOp.disable(checkoutStates.DISABLED, 'Merge in progress');
    }

    if (this.props.isRebasing) {
      return this.checkoutOp.disable(checkoutStates.DISABLED, 'Rebase in progress');
    }

    if (this.state.checkoutInProgress) {
      return this.checkoutOp.disable(checkoutStates.DISABLED, 'Checking out...');
    }

    // determine if pullRequest.headRepository is null
    // this can happen if a repository has been deleted.
    if (!pullRequest.headRepository) {
      return this.checkoutOp.disable(checkoutStates.DISABLED, 'Pull request head repository does not exist');
    }

    // Determine if we already have this PR checked out.

    const headPush = this.props.branches.getHeadBranch().getPush();
    const headRemote = this.props.remotes.withName(headPush.getRemoteName());

    // (detect checkout from pull/### refspec)
    const fromPullRefspec =
      headRemote.getOwner() === repository.owner.login &&
      headRemote.getRepo() === repository.name &&
      headPush.getShortRemoteRef() === `pull/${pullRequest.number}/head`;

    // (detect checkout from head repository)
    const fromHeadRepo =
      headRemote.getOwner() === pullRequest.headRepository.owner.login &&
      headRemote.getRepo() === pullRequest.headRepository.name &&
      headPush.getShortRemoteRef() === pullRequest.headRefName;

    if (fromPullRefspec || fromHeadRepo) {
      return this.checkoutOp.disable(checkoutStates.CURRENT, 'Current');
    }

    return this.checkoutOp.enable();
  }

  async checkout() {
    const {repository} = this.props;
    const {pullRequest} = repository;
    const {headRepository} = pullRequest;

    const fullHeadRef = `refs/heads/${pullRequest.headRefName}`;

    let sourceRemoteName, localRefName;

    // Discover or create a remote pointing to the repo containing the pull request's head ref.
    // If the local repository already has the head repository specified as a remote, that remote will be used, so
    // that any related configuration is picked up for the fetch. Otherwise, the head repository fetch URL is used
    // directly.
    const headRemotes = this.props.remotes.matchingGitHubRepository(headRepository.owner.login, headRepository.name);
    if (headRemotes.length > 0) {
      sourceRemoteName = headRemotes[0].getName();
    } else {
      const url = {
        https: headRepository.url + '.git',
        ssh: headRepository.sshUrl,
      }[this.props.remotes.mostUsedProtocol(['https', 'ssh'])];

      // This will throw if a remote with this name already exists (and points somewhere else, or we would have found
      // it above). ¯\_(ツ)_/¯
      const remote = await this.props.addRemote(headRepository.owner.login, url);
      sourceRemoteName = remote.getName();
    }

    // Identify an existing local ref that already corresponds to the pull request, if one exists. Otherwise, generate
    // a new local ref name.
    const pullTargets = this.props.branches.getPullTargets(sourceRemoteName, fullHeadRef);
    if (pullTargets.length > 0) {
      localRefName = pullTargets[0].getName();

      // Check out the existing local ref.
      await this.props.checkout(localRefName);
      try {
        await this.props.pull(fullHeadRef, {remoteName: sourceRemoteName, ffOnly: true});
      } finally {
        incrementCounter('checkout-pr');
      }

      return;
    }

    await this.props.fetch(fullHeadRef, {remoteName: sourceRemoteName});

    // Check out the local ref and set it up to track the head ref.
    await this.props.checkout(`pr-${pullRequest.number}/${headRepository.owner.login}/${pullRequest.headRefName}`, {
      createNew: true,
      track: true,
      startPoint: `refs/remotes/${sourceRemoteName}/${pullRequest.headRefName}`,
    });

    incrementCounter('checkout-pr');
  }
}
