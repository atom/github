import React from 'react';
import PropTypes from 'prop-types';
import {QueryRenderer, graphql} from 'react-relay';
import {Disposable} from 'event-kit';

import {autobind} from '../helpers';
import {RemotePropType, BranchSetPropType, OperationStateObserverPropType} from '../prop-types';
import IssueishListController, {BareIssueishListController} from '../controllers/issueish-list-controller';
import CreatePullRequestTile from '../views/create-pull-request-tile';
import RelayNetworkLayerManager from '../relay-network-layer-manager';

export default class CurrentPullRequestContainer extends React.Component {
  static propTypes = {
    repository: PropTypes.shape({
      id: PropTypes.string.isRequired,
      defaultBranchRef: PropTypes.shape({
        prefix: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
      }),
    }).isRequired,

    token: PropTypes.string.isRequired,
    host: PropTypes.string.isRequired,
    limit: PropTypes.number,
    remoteOperationObserver: OperationStateObserverPropType.isRequired,
    remote: RemotePropType.isRequired,
    remotesByName: PropTypes.shape({get: PropTypes.func}).isRequired,
    branches: BranchSetPropType.isRequired,
    aheadCount: PropTypes.number,
    pushInProgress: PropTypes.bool.isRequired,

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

  render() {
    const environment = RelayNetworkLayerManager.getEnvironmentForHost(this.props.host, this.props.token);

    const head = this.props.branches.getHeadBranch();
    if (!head.isPresent()) {
      return <BareIssueishListController isLoading={false} {...this.controllerProps()} />;
    }
    const push = head.getPush();
    if (!push.isPresent() || !push.isRemoteTracking()) {
      return <BareIssueishListController isLoading={false} {...this.controllerProps()} />;
    }
    const pushRemote = this.props.remotesByName.get(push.getRemoteName());
    if (!pushRemote || !pushRemote.isPresent() || !pushRemote.isGithubRepo()) {
      return <BareIssueishListController isLoading={false} {...this.controllerProps()} />;
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
        environment={environment}
        variables={variables}
        query={query}
        render={this.renderQueryResult}
      />
    );
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

  controllerProps() {
    return {
      title: 'Current pull request',
      onOpenIssueish: this.props.onOpenIssueish,
      emptyComponent: this.renderEmptyTile,
    };
  }
}
