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

export default class CommentDecorationsContainer extends React.Component {
  static propTypes = {
    workspace: PropTypes.object.isRequired,
    commandRegistry: PropTypes.object.isRequired,
    repository: PropTypes.object.isRequired,
    loginModel: GithubLoginModelPropType.isRequired,
  };

  fetchRepositoryData = repository => {
    return yubikiri({
      branches: repository.getBranches(),
      remotes: repository.getRemotes(),
      isMerging: repository.isMerging(),
      isRebasing: repository.isRebasing(),
      isAbsent: repository.isAbsent(),
      isLoading: repository.isLoading(),
      isPresent: repository.isPresent(),
      currentRemote: repository.getCurrentRemote(),
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
      <ObserveModel model={this.props.repository} fetchData={this.fetchRepositoryData}>
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
    if (!tokenData || tokenData.token === UNAUTHENTICATED || tokenData.token === INSUFFICIENT) {
      // we're not going to prompt users to log in to render decorations for comments
      // just let it go and move on with our lives.
      return null;
    }

    if (!repoData) {
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
        $headOwner: String!,
        $headName: String!,
        $headRef: String!,
        $first: Int!) {
        repository(owner: $headOwner, name: $headName) {
          ref(qualifiedName: $headRef) {
            associatedPullRequests(first: $first, states: [OPEN]) {
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
    };

    return (
      <RelayEnvironment.Provider value={environment}>
        <QueryRenderer
          environment={environment}
          query={query}
          variables={variables}
          render={queryResult => this.renderWithGraphQLData(queryResult, {repoData})}
        />
      </RelayEnvironment.Provider>
    );
  }

  renderWithGraphQLData({error, props, retry}, repoData, token) {
    if (error) {
      console.log(error);
      return null;
    }

    if (!props) {
      // no loading spinner for you
      // just fetch silently behind the scenes like a good little container
      return null;
    }

    if (!props.repository || !props.repository.ref) {
      // let's not try too hard.
      return null;
    }

    const associatedPullRequests = props.repository.ref.associatedPullRequests.nodes;

    // only show comment decorations if we're on a checked out pull request
    // otherwise, we'd have no way of knowing which comments to show.
    // if (!this.isCheckedOutPullRequest(repoData.branches, repoData.remotes, props.repository, )) {
    //   return null;
    // }

    return (
      <CommentDecorationsController
        associatedPullRequests={associatedPullRequests}
        workspace={this.props.workspace}
        results={associatedPullRequests}
      />
    );
  }

  // Determine if we already have this PR checked out.
  // todo: if this is similar enough to pr-checkout-controller, extract a single
  // helper function to do this check.
  isCheckedOutPullRequest(branches, remotes, repository, pullRequest) {
    // determine if pullRequest.headRepository is null
    // this can happen if a repository has been deleted.
    if (!pullRequest.headRepository) {
      return false;
    }

    const headPush = branches.getHeadBranch().getPush();
    const headRemote = remotes.withName(headPush.getRemoteName());

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
      return true;
    }
    return false;
  }
}
