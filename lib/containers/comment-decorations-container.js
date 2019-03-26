import React from 'react';
import PropTypes from 'prop-types';
import yubikiri from 'yubikiri';
import {QueryRenderer, graphql} from 'react-relay';

import CommentDecorationsController from '../controllers/comment-decorations-controller';
import ObserveModel from '../views/observe-model';
import RelayEnvironment from '../views/relay-environment';
import {GithubLoginModelPropType} from '../prop-types';
import {UNAUTHENTICATED, INSUFFICIENT} from '../shared/keytar-strategy';
import RelayNetworkLayerManager from '../relay-network-layer-manager';
import {PAGE_SIZE} from '../helpers';

export default class CommentDecorationsContainer extends React.Component {
  static propTypes = {
    workspace: PropTypes.object.isRequired,
    localRepository: PropTypes.object.isRequired,
    loginModel: GithubLoginModelPropType.isRequired,
  };

  fetchRepositoryData = repository => {
    return yubikiri({
      branches: repository.getBranches(),
      remotes: repository.getRemotes(),
      currentRemote: repository.getCurrentGitHubRemote(),
      workingDirectoryPath: repository.getWorkingDirectoryPath(),
    });
  }

  fetchToken = (loginModel, repoData) => {
    if (!repoData) {
      return null;
    }

    const endpoint = repoData.currentRemote.getEndpoint();

    if (!endpoint) {
      return null;
    }
    return yubikiri({
      token: loginModel.getToken(endpoint.getLoginAccount()),
    });
  }

  render() {
    return (
      <ObserveModel model={this.props.localRepository} fetchData={this.fetchRepositoryData}>
        {repoData => this.renderWithRepositoryData(repoData)}
      </ObserveModel>
    );
  }

  renderWithRepositoryData(repoData) {
    if (!repoData) {
      return null;
    }

    return (
      <ObserveModel
        model={this.props.loginModel}
        fetchParams={[repoData, this.props.loginModel]}
        fetchData={this.fetchToken}>
        {token => this.renderWithToken(repoData, token)}
      </ObserveModel>
    );
  }

  renderWithToken = (repoData, tokenData) => {
    if (!repoData || !tokenData || tokenData.token === UNAUTHENTICATED || tokenData.token === INSUFFICIENT) {
      // we're not going to prompt users to log in to render decorations for comments
      // just let it go and move on with our lives.
      return null;
    }

    const head = repoData.branches.getHeadBranch();
    if (!head.isPresent) {
      return null;
    }

    const push = head.getPush();
    if (!push.isPresent() || !push.isRemoteTracking()) {
      return null;
    }

    const pushRemote = repoData.remotes.withName(push.getRemoteName());
    if (!pushRemote.isPresent() || !pushRemote.isGithubRepo()) {
      return null;
    }

    const endpoint = repoData.currentRemote.getEndpoint();
    const environment = RelayNetworkLayerManager.getEnvironmentForHost(endpoint, tokenData.token);
    const query = graphql`
      query commentDecorationsContainerQuery(
        $headOwner: String!
        $headName: String!
        $headRef: String!
        $reviewCount: Int!
        $reviewCursor: String
        $threadCount: Int!
        $threadCursor: String
        $commentCount: Int!
        $commentCursor: String
        $first: Int!) {
        repository(owner: $headOwner, name: $headName) {
          ref(qualifiedName: $headRef) {
            associatedPullRequests(
              first: $first, states: [OPEN]) {
              totalCount
              nodes {
                ...commentDecorationsController_results
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
      first: 1,
      reviewCount: PAGE_SIZE,
      reviewCursor: null,
      threadCount: PAGE_SIZE,
      threadCursor: null,
      commentCount: PAGE_SIZE,
      commentCursor: null,
    };

    return (
      <RelayEnvironment.Provider value={environment}>
        <QueryRenderer
          environment={environment}
          query={query}
          variables={variables}
          render={queryResult => this.renderWithGraphQLData({
            endpoint,
            owner: variables.headOwner,
            repo: variables.headName,
            ...queryResult,
          }, repoData)}
        />
      </RelayEnvironment.Provider>
    );
  }

  renderWithGraphQLData({error, props, endpoint, owner, repo}, repoData) {
    if (error) {
      // eslint-disable-next-line no-console
      console.warn(`error fetching CommentDecorationsContainer data: ${error}`);
      return null;
    }

    if (!props || !props.repository || !props.repository.ref) {
      // no loading spinner for you
      // just fetch silently behind the scenes like a good little container
      return null;
    }


    const associatedPullRequests = props.repository.ref.associatedPullRequests.nodes;

    return (
      <CommentDecorationsController
        endpoint={endpoint}
        owner={owner}
        repo={repo}
        workspace={this.props.workspace}
        localRepository={repoData}
        results={associatedPullRequests}
      />
    );
  }
}
