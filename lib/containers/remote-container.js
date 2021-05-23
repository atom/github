import React from 'react';
import PropTypes from 'prop-types';
import {QueryRenderer, graphql} from 'react-relay';

import {
  RemotePropType, RemoteSetPropType, BranchSetPropType, RefresherPropType,
  EndpointPropType, TokenPropType,
} from '../prop-types';
import RelayNetworkLayerManager from '../relay-network-layer-manager';
import RemoteController from '../controllers/remote-controller';
import LoadingView from '../views/loading-view';
import QueryErrorView from '../views/query-error-view';

export default class RemoteContainer extends React.Component {
  static propTypes = {
    // Connection
    endpoint: EndpointPropType.isRequired,
    token: TokenPropType.isRequired,

    // Repository attributes
    refresher: RefresherPropType.isRequired,
    pushInProgress: PropTypes.bool.isRequired,
    workingDirectory: PropTypes.string,
    workspace: PropTypes.object.isRequired,
    remote: RemotePropType.isRequired,
    remotes: RemoteSetPropType.isRequired,
    branches: BranchSetPropType.isRequired,
    aheadCount: PropTypes.number,

    // Action methods
    handleLogin: PropTypes.func.isRequired,
    handleLogout: PropTypes.func.isRequired,
    onPushBranch: PropTypes.func.isRequired,
  }

  render() {
    const environment = RelayNetworkLayerManager.getEnvironmentForHost(this.props.endpoint, this.props.token);
    const query = graphql`
      query remoteContainerQuery($owner: String!, $name: String!) {
        repository(owner: $owner, name: $name) {
          id
          defaultBranchRef {
            prefix
            name
          }
        }
      }
    `;
    const variables = {
      owner: this.props.remote.getOwner(),
      name: this.props.remote.getRepo(),
    };

    return (
      <QueryRenderer
        environment={environment}
        variables={variables}
        query={query}
        render={this.renderWithResult}
      />
    );
  }

  renderWithResult = ({error, props, retry}) => {
    this.props.refresher.setRetryCallback(this, retry);

    if (error) {
      return (
        <QueryErrorView
          error={error}
          login={this.props.handleLogin}
          logout={this.props.handleLogout}
          retry={retry}
        />
      );
    }

    if (props === null) {
      return <LoadingView />;
    }

    return (
      <RemoteController
        endpoint={this.props.endpoint}
        token={this.props.token}

        repository={props.repository}

        workingDirectory={this.props.workingDirectory}
        workspace={this.props.workspace}
        remote={this.props.remote}
        remotes={this.props.remotes}
        branches={this.props.branches}

        aheadCount={this.props.aheadCount}
        pushInProgress={this.props.pushInProgress}

        onPushBranch={this.props.onPushBranch}
      />
    );
  }
}
