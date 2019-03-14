import React from 'react';
import PropTypes from 'prop-types';
import yubikiri from 'yubikiri';
import {CompositeDisposable} from 'event-kit';
import {QueryRenderer, graphql} from 'react-relay';

import {PAGE_SIZE} from '../helpers';
import {getEndpoint} from '../models/endpoint';
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
    host: PropTypes.string,
  };

  constructor(props, context) {
    super(props, context);

    this.state = {openEditors: this.props.workspace.getTextEditors()};
    this.subscriptions = new CompositeDisposable();
    // todo: use allRemotes to get the endpoint, similar to how GithubTabController does
    this.endpoint = getEndpoint('github.com');
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

  fetchRepositoryData = repository => {
    return yubikiri({
      branches: repository.getBranches(),
      remotes: repository.getRemotes(),
      isMerging: repository.isMerging(),
      isRebasing: repository.isRebasing(),
      isAbsent: repository.isAbsent(),
      isLoading: repository.isLoading(),
      isPresent: repository.isPresent(),
    });
  }

  fetchToken = loginModel => {

    const loginAccount = this.endpoint.getLoginAccount();
    return yubikiri({
      token: loginModel.getToken(loginAccount),
    });
  }

  renderWithToken = tokenData => {
    if (!tokenData || tokenData.token === UNAUTHENTICATED || tokenData.token === INSUFFICIENT) {
      // we're not going to prompt users to log in to render decorations for comments
      // just let it go and move on with our lives.
      return null;
    }
    return (
      <ObserveModel model={this.props.repository} fetchData={this.fetchRepositoryData}>
        {repoData => this.renderWithRepositoryData(repoData, tokenData.token)}
      </ObserveModel>
    );
  }

  render() {
    return (
      <ObserveModel model={this.props.loginModel} fetchData={this.fetchToken}>
        {this.renderWithToken}
      </ObserveModel>
    );
  }

  renderWithRepositoryData = (repoData, token) => {
    if (!repoData) {
      return null;
    }

    const environment = RelayNetworkLayerManager.getEnvironmentForHost(this.endpoint, token);
    const query = graphql`
      query commentDecorationsContainerQuery
      (
        $repoOwner: String!
        $repoName: String!
        $prNumber: Int!
        $reviewCount: Int!
        $reviewCursor: String
        $threadCount: Int!
        $threadCursor: String
        $commentCount: Int!
        $commentCursor: String
      ) {
        repository(owner: $repoOwner, name: $repoName) {
          ...prCheckoutController_repository
          pullRequest(number: $prNumber) {
            ...prCheckoutController_pullRequest
            ...aggregatedReviewsContainer_pullRequest @arguments(
              reviewCount: $reviewCount
              reviewCursor: $reviewCursor
              threadCount: $threadCount
              threadCursor: $threadCursor
              commentCount: $commentCount
              commentCursor: $commentCursor
            )
          }
          id
        }
      }
    `;

    const variables = {
      repoOwner: 'atom',
      repoName: 'github',
      prNumber: 1983, // fixme
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
          render={queryResult => this.renderWithResult(queryResult, {repoData})}
        />
      </RelayEnvironment.Provider>
    );
  }

  renderWithResult({error, props, retry}, repoData, token) {
    if (error) {
      console.log(error);
      return null;
    }

    if (!props) {
      // no loading spinner for you
      // just fetch silently behind the scenes like a good little container
      return null;
    }
    return (
      <AggregatedReviewsContainer pullRequest={props.repository.pullRequest}>
        {({errors, summaries, commentThreads, loading}) => {
          if (errors.length > 0) {
            console.log(errors);
          }

          const rootCommentsByPath = new Map();
          commentThreads.forEach(commentThread => {
            // there might be multiple comments in the thread but we really only
            // care about the root comment when rendering decorations
            const rootComment = commentThread.comments[0];

            if (rootCommentsByPath.get(rootComment.path)) {
              rootCommentsByPath.get(rootComment.path).push(rootComment);
            } else {
              rootCommentsByPath.set(rootComment.path, [rootComment]);
            }
          });

          const editorsWithCommentThreads = this.getEditorsWithCommentThreads(rootCommentsByPath);
          return null;
          // todo: we want something like
          // return (
          //   <Fragment>
          //     {editorsWithCommentThreads.map(editor => (
          //       <EditorCommentDecorationsController
          //         key={editor.id}
          //         commandRegistry={this.props.commandRegistry}
          //         editor={editor}
          //       />
          //     ))}
          //   </Fragment>
          // );
        }}
      </AggregatedReviewsContainer>
    );
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
