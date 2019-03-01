import React from 'react';
import PropTypes from 'prop-types';
import yubikiri from 'yubikiri';
import {QueryRenderer, graphql} from 'react-relay';

import {PAGE_SIZE} from '../helpers';
import {GithubLoginModelPropType, EndpointPropType} from '../prop-types';
import {UNAUTHENTICATED, INSUFFICIENT} from '../shared/keytar-strategy';
import ObserveModel from '../views/observe-model';
import LoadingView from '../views/loading-view';
import GithubLoginView from '../views/github-login-view';
import QueryErrorView from '../views/query-error-view';
import RelayNetworkLayerManager from '../relay-network-layer-manager';
import RelayEnvironment from '../views/relay-environment';
import ReviewsController from '../controllers/reviews-controller';

export default class ReviewsContainer extends React.Component {
  static propTypes = {
    // Connection
    endpoint: EndpointPropType.isRequired,

    // Pull request selection criteria
    owner: PropTypes.string.isRequired,
    repo: PropTypes.string.isRequired,
    number: PropTypes.number.isRequired,

    // Package models
    repository: PropTypes.object.isRequired,
    loginModel: GithubLoginModelPropType.isRequired,
  }

  render() {
    return (
      <ObserveModel model={this.props.loginModel} fetchData={this.fetchToken}>
        {tokenData => this.renderWithToken(tokenData)}
      </ObserveModel>
    );
  }

  renderWithToken(token) {
    if (!token) {
      return <LoadingView />;
    }

    if (token === UNAUTHENTICATED) {
      return <GithubLoginView onLogin={this.handleLogin} />;
    }

    if (token === INSUFFICIENT) {
      return (
        <GithubLoginView onLogin={this.handleLogin}>
          <p>
            Your token no longer has sufficient authorizations. Please re-authenticate and generate a new one.
          </p>
        </GithubLoginView>
      );
    }

    return (
      <ObserveModel model={this.props.repository} fetchData={this.fetchRepositoryData}>
        {repoData => this.renderWithRepositoryData(repoData, token)}
      </ObserveModel>
    );
  }

  renderWithRepositoryData(repoData, token) {
    if (!repoData) {
      return <LoadingView />;
    }

    const environment = RelayNetworkLayerManager.getEnvironmentForHost(this.props.endpoint, token);
    const query = graphql`
      query reviewsContainerQuery
      (
        $repoOwner: String!
        $repoName: String!
        # $prNumber: Int!
        # $reviewCount: Int!
        # $reviewCursor: String
        # $commentCount: Int!
        # $commentCursor: String
      ) {
        repository(owner: $repoOwner, name: $repoName) {
          id
        }
      }
    `;
    const variables = {
      repoOwner: this.props.owner,
      repoName: this.props.repo,
      prNumber: this.props.number,
      reviewCount: PAGE_SIZE,
      reviewCursor: null,
      commentCount: PAGE_SIZE,
      commentCursor: null,
    };

    return (
      <RelayEnvironment.Provider value={environment}>
        <QueryRenderer
          environment={environment}
          query={query}
          variables={variables}
          render={queryResult => this.renderWithResult(queryResult, repoData)}
        />
      </RelayEnvironment.Provider>
    );
  }

  renderWithResult({error, props, retry}, repoData) {
    if (error) {
      return (
        <QueryErrorView
          error={error}
          login={this.handleLogin}
          retry={retry}
          logout={this.handleLogout}
        />
      );
    }

    if (!props) {
      return <LoadingView />;
    }

    return (
      <ReviewsController
        {...props}
        {...repoData}
      />
    );
  }

  fetchToken = loginModel => loginModel.getToken(this.props.endpoint.getLoginAccount());

  fetchRepositoryData = repository => {
    return yubikiri({
      branches: repository.getBranches(),
      isLoading: repository.isLoading(),
      isPresent: repository.isPresent(),
    });
  }

  handleLogin = token => this.props.loginModel.setToken(this.props.endpoint.getLoginAccount(), token);

  handleLogout = () => this.props.loginModel.removeToken(this.props.endpoint.getLoginAccount());
}
