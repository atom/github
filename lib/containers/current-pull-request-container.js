import React from 'react';
import PropTypes from 'prop-types';
import {graphql} from 'react-relay';
import QueryRenderer from '../controllers/query-renderer';
import {Disposable} from 'event-kit';

import {autobind} from '../helpers';
import {
  RemotePropType, RemoteSetPropType, BranchSetPropType, OperationStateObserverPropType, EndpointPropType,
} from '../prop-types';
import IssueishListController, {BareIssueishListController} from '../controllers/issueish-list-controller';
import CreatePullRequestTile from '../views/create-pull-request-tile';
import RelayNetworkLayerManager from '../relay-network-layer-manager';

export default class CurrentPullRequestContainer extends React.Component {
  static propTypes = {
    // Relay payload
    repository: PropTypes.shape({
      id: PropTypes.string.isRequired,
      defaultBranchRef: PropTypes.shape({
        prefix: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
      }),
    }).isRequired,

    // Connection
    endpoint: EndpointPropType.isRequired,
    token: PropTypes.string.isRequired,

    // Search constraints
    limit: PropTypes.number,

    // Repository model attributes
    remoteOperationObserver: OperationStateObserverPropType.isRequired,
    remote: RemotePropType.isRequired,
    remotes: RemoteSetPropType.isRequired,
    branches: BranchSetPropType.isRequired,
    aheadCount: PropTypes.number,
    pushInProgress: PropTypes.bool.isRequired,

    // Actions
    onOpenIssueish: PropTypes.func.isRequired,
    onCreatePr: PropTypes.func.isRequired,
  }

  static defaultProps = {
    limit: 5,
  }

  constructor(props) {
    super(props);
    autobind(this, 'renderQueryResult', 'renderEmptyTile');

    this.sub = new Disposable();
  }

  async componentDidMount() {
    this.setState({environment: await RelayNetworkLayerManager.getHubKit()});
  }

  render() {
    const head = this.props.branches.getHeadBranch();
    if (!head.isPresent()) {
      return this.renderEmptyResult();
    }
    const push = head.getPush();
    if (!push.isPresent() || !push.isRemoteTracking()) {
      return this.renderEmptyResult();
    }
    const pushRemote = this.props.remotes.withName(push.getRemoteName());
    if (!pushRemote.isPresent() || !pushRemote.isGithubRepo()) {
      return this.renderEmptyResult();
    }

    const query = graphql`
      query currentPullRequestContainerQuery($headOwner: String!, $headName: String!, $headRef: String!, $first: Int!) {
        repository(owner: $headOwner, name: $headName) {
          ref(qualifiedName: $headRef) {
            associatedPullRequests(first: $first, states: [OPEN]) {
              totalCount
              nodes {
                ...issueishListController_results
              }
            }
          }
        }
      }
    `;
    const variables = {
      headOwner: pushRemote.getOwner(),
      headName: pushRemote.getRepo(),
      headRef: push.getRemoteRef(),
      first: this.props.limit,
    };

    return (
      <QueryRenderer
        variables={variables}
        query={query}
        render={this.renderQueryResult}
      />
    );
  }

  renderEmptyResult() {
    this.sub.dispose();
    this.sub = this.props.remoteOperationObserver.onDidComplete(() => this.forceUpdate());

    return <BareIssueishListController isLoading={false} {...this.controllerProps()} />;
  }

  renderQueryResult({error, props, retry}) {
    if (retry) {
      this.sub.dispose();
      this.sub = this.props.remoteOperationObserver.onDidComplete(retry);
    }

    if (error) {
      return (
        <BareIssueishListController
          isLoading={false}
          error={error}
          {...this.controllerProps()}
        />
      );
    }

    if (props === null) {
      return (
        <BareIssueishListController
          isLoading={true}
          {...this.controllerProps()}
        />
      );
    }

    if (!props.repository || !props.repository.ref) {
      return <BareIssueishListController isLoading={false} {...this.controllerProps()} />;
    }

    const associatedPullRequests = props.repository.ref.associatedPullRequests;

    return (
      <IssueishListController
        total={associatedPullRequests.totalCount}
        results={associatedPullRequests.nodes}
        isLoading={false}
        resultFilter={issueish => issueish.getHeadRepositoryID() === this.props.repository.id}
        {...this.controllerProps()}
      />
    );
  }

  renderEmptyTile() {
    return (
      <CreatePullRequestTile
        repository={this.props.repository}
        remote={this.props.remote}
        branches={this.props.branches}
        aheadCount={this.props.aheadCount}
        pushInProgress={this.props.pushInProgress}
        onCreatePr={this.props.onCreatePr}
      />
    );
  }

  componentWillUnmount() {
    this.sub.dispose();
  }

  controllerProps() {
    return {
      title: 'Checked out pull request',
      onOpenIssueish: this.props.onOpenIssueish,
      emptyComponent: this.renderEmptyTile,
    };
  }
}
