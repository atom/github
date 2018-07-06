import React from 'react';
import {graphql, createFragmentContainer} from 'react-relay';
import PropTypes from 'prop-types';

import {autobind} from '../helpers';
import {BranchSetPropType, RemoteSetPropType} from '../prop-types';
import EnableableOperation from '../models/enableable-operation';
import IssueishDetailView, {checkoutStates} from '../views/issueish-detail-view';

export class BareIssueishDetailController extends React.Component {
  static propTypes = {
    repository: PropTypes.shape({
      name: PropTypes.string.isRequired,
      owner: PropTypes.shape({
        login: PropTypes.string.isRequired,
      }).isRequired,
      issueish: PropTypes.any, // FIXME from IssueishPaneItemContainer.propTypes
    }),
    issueishNumber: PropTypes.number.isRequired,

    branches: BranchSetPropType.isRequired,
    remotes: RemoteSetPropType.isRequired,
    isMerging: PropTypes.bool.isRequired,
    isRebasing: PropTypes.bool.isRequired,

    fetch: PropTypes.func.isRequired,
    checkout: PropTypes.func.isRequired,
    pull: PropTypes.func.isRequired,
    addRemote: PropTypes.func.isRequired,
    onTitleChange: PropTypes.func.isRequired,
    switchToIssueish: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props);
    autobind(this, 'checkout');

    this.state = {
      checkoutInProgress: false,
    };

    this.checkoutOp = new EnableableOperation(this.checkout);
    this.checkoutOp.toggleState(this, 'checkoutInProgress');
  }

  componentDidMount() {
    this.updateTitle();
  }

  componentDidUpdate() {
    this.updateTitle();
  }

  updateTitle() {
    const {repository} = this.props;
    if (repository && repository.issueish) {
      const issueish = repository.issueish;
      const prefix = issueish.__typename === 'Issue' ? 'Issue:' : 'PR:';

      const title = `${prefix} ${repository.owner.login}/${repository.name}#${issueish.number} — ${issueish.title}`;
      this.props.onTitleChange(title);
    }
  }

  render() {
    const {repository} = this.props;
    if (!repository || !repository.issueish) {
      return <div>Issue/PR #{this.props.issueishNumber} not found</div>; // TODO: no PRs
    }

    this.checkoutOp = this.nextCheckoutOp();

    return (
      <IssueishDetailView
        repository={repository}
        issueish={repository.issueish}
        checkoutOp={this.checkoutOp}
        switchToIssueish={this.props.switchToIssueish}
      />
    );
  }

  nextCheckoutOp() {
    const {repository} = this.props;
    const {issueish} = repository;

    if (issueish.__typename !== 'PullRequest') {
      return this.checkoutOp.disable(checkoutStates.HIDDEN, 'Cannot check out an issue');
    }

    if (this.props.isMerging) {
      return this.checkoutOp.disable(checkoutStates.DISABLED, 'Merge in progress');
    }

    if (this.props.isRebasing) {
      return this.checkoutOp.disable(checkoutStates.DISABLED, 'Rebase in progress');
    }

    // Determine if we already have this PR checked out.

    const headPush = this.props.branches.getHeadBranch().getPush();
    const headRemote = this.props.remotes.withName(headPush.getRemoteName());

    // (detect checkout from pull/### refspec)
    const fromPullRefspec =
      headRemote.getOwner() === repository.owner.login &&
      headRemote.getRepo() === repository.name &&
      headPush.getShortRemoteRef() === `pulls/${issueish.number}/head`;

    // (detect checkout from head repository)
    const fromHeadRepo =
      headRemote.getOwner() === issueish.headRepository.owner.login &&
      headRemote.getRepo() === issueish.headRepository.name &&
      headPush.getShortRemoteRef() === issueish.headRefName;

    if (fromPullRefspec || fromHeadRepo) {
      return this.checkoutOp.disable(checkoutStates.CURRENT, 'Current');
    }

    return this.checkoutOp.enable();
  }

  async checkout() {
    const {repository} = this.props;
    const {issueish} = repository;
    const {headRepository} = issueish;

    const fullHeadRef = `refs/heads/${issueish.headRefName}`;

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
      await this.props.pull(fullHeadRef, {remoteName: sourceRemoteName, ffOnly: true});

      return;
    }

    await this.props.fetch(fullHeadRef, {remoteName: sourceRemoteName});

    // Check out the local ref and set it up to track the head ref.
    await this.props.checkout(`pr-${issueish.number}/${issueish.headRefName}`, {
      createNew: true,
      track: true,
      startPoint: `refs/remotes/${sourceRemoteName}/${issueish.headRefName}`,
    });
  }
}

export default createFragmentContainer(BareIssueishDetailController, {
  repository: graphql`
    fragment issueishDetailController_repository on Repository
    @argumentDefinitions(
      timelineCount: {type: "Int!"},
      timelineCursor: {type: "String"},
      issueishNumber: {type: "Int!"}
    ) {
      ...issueishDetailView_repository
      name
      owner {
        login
      }
      issueish: issueOrPullRequest(number: $issueishNumber) {
        __typename
        ... on Issue {
          title
          number
          ...issueishDetailView_issueish @arguments(
            timelineCount: $timelineCount,
            timelineCursor: $timelineCursor
          )
        }
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
          ...issueishDetailView_issueish @arguments(
            timelineCount: $timelineCount,
            timelineCursor: $timelineCursor
          )
        }
      }
    }
  `,
});
