import EnableableOperation from './enableable-operation';
import {GitError} from '../git-shell-out-strategy';

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

export default class PullRequestCheckoutOp extends EnableableOperation {
  constructor(options = {}) {
    const op = () => this.checkout().catch(e => {
      if (!(e instanceof GitError)) {
        throw e;
      }
    });
    super(op);
    this.op = op;
    this.options = options;
  }


  nextCheckoutOp() {
    const {repository} = this.options;
    const {pullRequest} = repository;

    if (this.options.typename !== 'PullRequest') {
      return this.disable(checkoutStates.HIDDEN, 'Cannot check out an issue');
    }

    if (this.options.isAbsent) {
      return this.disable(checkoutStates.HIDDEN, 'No repository found');
    }

    if (this.options.isLoading) {
      return this.disable(checkoutStates.DISABLED, 'Loading');
    }

    if (!this.options.isPresent) {
      return this.disable(checkoutStates.DISABLED, 'No repository found');
    }

    if (this.options.isMerging) {
      return this.disable(checkoutStates.DISABLED, 'Merge in progress');
    }

    if (this.options.isRebasing) {
      return this.disable(checkoutStates.DISABLED, 'Rebase in progress');
    }

    if (this.state.checkoutInProgress) {
      return this.disable(checkoutStates.DISABLED, 'Checking out...');
    }

    // determine if pullRequest.headRepository is null
    // this can happen if a repository has been deleted.
    if (!pullRequest.headRepository) {
      return this.disable(checkoutStates.DISABLED, 'Pull request head repository does not exist');
    }

    // Determine if we already have this PR checked out.

    const headPush = this.options.branches.getHeadBranch().getPush();
    const headRemote = this.options.remotes.withName(headPush.getRemoteName());

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
    const {repository} = this.options;
    const {pullRequest} = repository;
    const {headRepository} = pullRequest;

    const fullHeadRef = `refs/heads/${pullRequest.headRefName}`;

    let sourceRemoteName, localRefName;

    // Discover or create a remote pointing to the repo containing the pull request's head ref.
    // If the local repository already has the head repository specified as a remote, that remote will be used, so
    // that any related configuration is picked up for the fetch. Otherwise, the head repository fetch URL is used
    // directly.
    const headRemotes = this.options.remotes.matchingGitHubRepository(headRepository.owner.login, headRepository.name);
    if (headRemotes.length > 0) {
      sourceRemoteName = headRemotes[0].getName();
    } else {
      const url = {
        https: headRepository.url + '.git',
        ssh: headRepository.sshUrl,
      }[this.options.remotes.mostUsedProtocol(['https', 'ssh'])];

      // This will throw if a remote with this name already exists (and points somewhere else, or we would have found
      // it above). ¯\_(ツ)_/¯
      const remote = await this.options.addRemote(headRepository.owner.login, url);
      sourceRemoteName = remote.getName();
    }

    // Identify an existing local ref that already corresponds to the pull request, if one exists. Otherwise, generate
    // a new local ref name.
    const pullTargets = this.options.branches.getPullTargets(sourceRemoteName, fullHeadRef);
    if (pullTargets.length > 0) {
      localRefName = pullTargets[0].getName();

      // Check out the existing local ref.
      await this.options.checkout(localRefName);
      try {
        await this.options.pull(fullHeadRef, {remoteName: sourceRemoteName, ffOnly: true});
      } finally {
        // incrementCounter('checkout-pr');
      }

      return;
    }

    await this.options.fetch(fullHeadRef, {remoteName: sourceRemoteName});

    // Check out the local ref and set it up to track the head ref.
    await this.options.checkout(`pr-${pullRequest.number}/${headRepository.owner.login}/${pullRequest.headRefName}`, {
      createNew: true,
      track: true,
      startPoint: `refs/remotes/${sourceRemoteName}/${pullRequest.headRefName}`,
    });

    // incrementCounter('checkout-pr');
  }
}
