import React from 'react';
import PropTypes from 'prop-types';
import yubikiri from 'yubikiri';
import {CompositeDisposable} from 'event-kit';
import {QueryRenderer, graphql} from 'react-relay';

import {PAGE_SIZE} from '../helpers';
import ObserveModel from '../views/observe-model';
import AggregatedReviewsContainer from './aggregated-reviews-container';
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

  constructor(props, context) {
    super(props, context);

    this.state = {openEditors: this.props.workspace.getTextEditors()};
    this.subscriptions = new CompositeDisposable();
  }

  componentDidMount() {
    const updateState = () => {
      this.setState({
        openEditors: this.props.workspace.getTextEditors(),
      });
    };

    this.subscriptions.add(
      this.props.workspace.observeTextEditors(updateState),
      this.props.workspace.onDidDestroyPaneItem(updateState),
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

    return null;
    // return (
    //   <AggregatedReviewsContainer pullRequest={props.repository.pullRequest}>
    //     {({errors, summaries, commentThreads, loading}) => {
    //       if (errors.length > 0) {
    //         console.log(errors);
    //       }
    //
    //       const rootCommentsByPath = new Map();
    //       commentThreads.forEach(commentThread => {
    //         // there might be multiple comments in the thread but we really only
    //         // care about the root comment when rendering decorations
    //         const rootComment = commentThread.comments[0];
    //
    //         if (rootCommentsByPath.get(rootComment.path)) {
    //           rootCommentsByPath.get(rootComment.path).push(rootComment);
    //         } else {
    //           rootCommentsByPath.set(rootComment.path, [rootComment]);
    //         }
    //       });
    //
    //       console.log('rootCommentsByPath', rootCommentsByPath);
    //
    //       const editorsWithCommentThreads = this.getEditorsWithCommentThreads(rootCommentsByPath);
    //       return null;
    //       // todo: we want something like
    //       // return (
    //       //   <Fragment>
    //       //     {editorsWithCommentThreads.map(editor => (
    //       //       <EditorCommentDecorationsController
    //       //         key={editor.id}
    //       //         commandRegistry={this.props.commandRegistry}
    //       //         editor={editor}
    //       //       />
    //       //     ))}
    //       //   </Fragment>
    //       // );
    //     }}
    //   </AggregatedReviewsContainer>
    // );
  }

  getEditorsWithCommentThreads(rootCommentsByPath) {
    return this.state.openEditors.map(editor => {
      const path = editor.getPath();
      // TODO: editor.getPath() provides an absolute path and the comment provides a relative one
      // reconcile those paths to return only the editors that have comment threads
      return editor;
    });
  }

  componentWillUnmount() {
    this.subscriptions.dispose();
  }
}
