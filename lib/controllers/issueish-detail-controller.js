import React from 'react';
import {graphql, createFragmentContainer} from 'react-relay';
import PropTypes from 'prop-types';

import {BranchSetPropType, RemoteSetPropType, ItemTypePropType, EndpointPropType} from '../prop-types';
import {GitError} from '../git-shell-out-strategy';
import EnableableOperation from '../models/enableable-operation';
import PullRequestDetailView, {checkoutStates} from '../views/pr-detail-view';
import IssueDetailView from '../views/issue-detail-view';
import CommitDetailItem from '../items/commit-detail-item';
import {incrementCounter, addEvent} from '../reporter-proxy';

export class BareIssueishDetailController extends React.Component {
  static propTypes = {
    // Relay response
    repository: PropTypes.shape({
      name: PropTypes.string.isRequired,
      owner: PropTypes.shape({
        login: PropTypes.string.isRequired,
      }).isRequired,
      pullRequest: PropTypes.any,
      issue: PropTypes.any,
    }),
    issueishNumber: PropTypes.number.isRequired,

    // Local Repository model properties
    localRepository: PropTypes.object.isRequired,
    branches: BranchSetPropType.isRequired,
    remotes: RemoteSetPropType.isRequired,
    isMerging: PropTypes.bool.isRequired,
    isRebasing: PropTypes.bool.isRequired,
    isAbsent: PropTypes.bool.isRequired,
    isLoading: PropTypes.bool.isRequired,
    isPresent: PropTypes.bool.isRequired,
    workdirPath: PropTypes.string,

    // Connection information
    endpoint: EndpointPropType.isRequired,
    token: PropTypes.string.isRequired,

    // Atom environment
    workspace: PropTypes.object.isRequired,
    commands: PropTypes.object.isRequired,
    keymaps: PropTypes.object.isRequired,
    tooltips: PropTypes.object.isRequired,
    config: PropTypes.object.isRequired,

    // Action methods
    fetch: PropTypes.func.isRequired,
    checkout: PropTypes.func.isRequired,
    pull: PropTypes.func.isRequired,
    addRemote: PropTypes.func.isRequired,
    onTitleChange: PropTypes.func.isRequired,
    switchToIssueish: PropTypes.func.isRequired,
    destroy: PropTypes.func.isRequired,

    // Item context
    itemType: ItemTypePropType.isRequired,
  }

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

  //  storing `typename` in state to avoid having to do ugly long chained lookups in several places.
  // note that whether we're rendering an Issue or a PullRequest,
  // relay returns both issue and pull request data.
  // So a pullRequest can have a __typename of `Issue` or `PullRequest`, which is // then set in state here.
  static getDerivedStateFromProps(nextProps, prevState) {
    const {repository} = nextProps;
    const typename = repository && repository.pullRequest &&
     repository.pullRequest.__typename ? repository.pullRequest.__typename : null;
    if (typename && prevState.typename !== typename) {
      return ({typename});
    } else {
      return null;
    }
  }

  componentDidMount() {
    this.updateTitle();
  }

  componentDidUpdate() {
    this.updateTitle();
  }

  updateTitle() {
    const {repository} = this.props;
    if (repository && (repository.issue || repository.pullRequest)) {
      let prefix, issueish;
      if (this.state.typename === 'PullRequest') {
        prefix = 'PR:';
        issueish = repository.pullRequest;
      } else {
        prefix = 'Issue:';
        issueish = repository.issue;
      }
      const title = `${prefix} ${repository.owner.login}/${repository.name}#${issueish.number} — ${issueish.title}`;
      this.props.onTitleChange(title);
    }
  }

  render() {
    const {repository} = this.props;
    if (!repository || !repository.issue || !repository.pullRequest) {
      return <div>Issue/PR #{this.props.issueishNumber} not found</div>; // TODO: no PRs
    }

    this.checkoutOp = this.nextCheckoutOp();
    if (this.state.typename === 'PullRequest') {
      return (
        <PullRequestDetailView
          localRepository={this.props.localRepository}
          repository={repository}
          pullRequest={repository.pullRequest}
          checkoutOp={this.checkoutOp}
          switchToIssueish={this.props.switchToIssueish}

          endpoint={this.props.endpoint}
          token={this.props.token}

          workspace={this.props.workspace}
          commands={this.props.commands}
          keymaps={this.props.keymaps}
          tooltips={this.props.tooltips}
          config={this.props.config}

          openCommit={this.openCommit}

          itemType={this.props.itemType}
          destroy={this.props.destroy}
        />
      );
    } else {
      return (
        <IssueDetailView
          repository={repository}
          issue={repository.issue}
          switchToIssueish={this.props.switchToIssueish}
        />
      );
    }
  }

  nextCheckoutOp() {
    const {repository} = this.props;
    const {pullRequest} = repository;

    if (this.state.typename !== 'PullRequest') {
      return this.checkoutOp.disable(checkoutStates.HIDDEN, 'Cannot check out an issue');
    }

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

  openCommit = async ({sha}) => {
    /* istanbul ignore if */
    if (!this.props.workdirPath) {
      return;
    }

    const uri = CommitDetailItem.buildURI(this.props.workdirPath, sha);
    await this.props.workspace.open(uri, {pending: true});
    addEvent('open-commit-in-pane', {package: 'github', from: this.constructor.name});
  }
}
// todo: we probably don't need to commit count and cursor in the issue fragment
export default createFragmentContainer(BareIssueishDetailController, {
  repository: graphql`
    fragment issueishDetailController_repository on Repository
    @argumentDefinitions(
      issueishNumber: {type: "Int!"}
      timelineCount: {type: "Int!"},
      timelineCursor: {type: "String"},
      commitCount: {type: "Int!"},
      commitCursor: {type: "String"},
      commentCount: {type: "Int!"},
      commentCursor: {type: "String"},
    ) {
      ...issueDetailView_repository
      ...prDetailView_repository
      name
      owner {
        login
      }
      issue: issueOrPullRequest(number: $issueishNumber) {
        __typename
        ... on Issue {
          title
          number
          ...issueDetailView_issue @arguments(
            timelineCount: $timelineCount,
            timelineCursor: $timelineCursor,
            commitCount: $commitCount,
            commitCursor: $commitCursor,
          )
        }
      }
      pullRequest: issueOrPullRequest(number: $issueishNumber) {
        __typename
        ... on PullRequest {
          title
          number
          headRefName
          headRepository {
            name
            owner {
              login
            }
            url
            sshUrl
          }
          ...prDetailView_pullRequest @arguments(
            timelineCount: $timelineCount,
            timelineCursor: $timelineCursor,
            commitCount: $commitCount,
            commitCursor: $commitCursor,
            commentCount: $commentCount,
            commentCursor: $commentCursor,
          )
        }
      }
    }
  `,
});
