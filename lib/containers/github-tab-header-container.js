import React from 'react';
import PropTypes from 'prop-types';
import {QueryRenderer, graphql} from 'react-relay';

import {incrementCounter} from '../reporter-proxy';
import {
  RemotePropType, RemoteSetPropType, BranchSetPropType, OperationStateObserverPropType, EndpointPropType,
} from '../prop-types';
import RelayNetworkLayerManager from '../relay-network-layer-manager';
import {UNAUTHENTICATED, INSUFFICIENT} from '../shared/keytar-strategy';
import RemoteController from '../controllers/remote-controller';
import ObserveModel from '../views/observe-model';
import LoadingView from '../views/loading-view';
import QueryErrorView from '../views/query-error-view';
import GithubLoginView from '../views/github-login-view';
import Author, {nullAuthor} from '../models/author';
import GithubTabHeaderView from '../views/github-tab-header-view';

export default class GithubTabHeaderContainer extends React.Component {
  static propTypes = {
    // Connection
    loginModel: PropTypes.object.isRequired,
    endpoint: EndpointPropType.isRequired,

    currentWorkDir: PropTypes.string,

    handleWorkDirSelect: PropTypes.func,
    onDidChangeWorkDirs: PropTypes.func,
    onDidUpdateRepo: PropTypes.func,
  }

  render() {
    return (
      <ObserveModel model={this.props.loginModel} fetchData={this.fetchToken}>
        {this.renderWithToken}
      </ObserveModel>
    );
  }

  renderWithToken = token => {
    if (
      token == null
      || token instanceof Error
      || token === UNAUTHENTICATED
      || token === INSUFFICIENT
    ) {
      return this.renderNoResult();
    }

    const environment = RelayNetworkLayerManager.getEnvironmentForHost(this.props.endpoint, token);
    const query = graphql`
      query githubTabHeaderContainerQuery {
        viewer {
          name,
          email,
          avatarUrl,
          login
        }
      }
    `;

    return (
      <QueryRenderer
        environment={environment}
        variables={{}}
        query={query}
        render={result => this.renderWithResult(result, token)}
      />
    );
  }

  renderWithResult({error, props, retry}, token) {
    if (error || props === null) {
      return this.renderNoResult();
    }

    const {email, name, avatarUrl, login} = props.viewer;

    return (
      <GithubTabHeaderView
        currentWorkDir={this.props.workingDirectory}
        committer={new Author(email, name, login, false, avatarUrl)}
        handleWorkDirSelect={this.props.handleWorkDirSelect}
        getCurrentWorkDirs={this.props.getCurrentWorkDirs}
        onDidChangeWorkDirs={this.props.onDidChangeWorkDirs}
      />
    );
  }

  renderNoResult() {
    return (
      <GithubTabHeaderView
        currentWorkDir={this.props.workingDirectory}
        committer={nullAuthor}
        handleWorkDirSelect={this.props.handleWorkDirSelect}
        getCurrentWorkDirs={this.props.getCurrentWorkDirs}
        onDidChangeWorkDirs={this.props.onDidChangeWorkDirs}
      />
    );
  }

  fetchToken = loginModel => {
    return loginModel.getToken(this.props.endpoint.getLoginAccount());
  }
}
