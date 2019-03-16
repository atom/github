import React from 'react';
import PropTypes from 'prop-types';
import {CompositeDisposable} from 'event-kit';
import {graphql, createFragmentContainer} from 'react-relay';

import {GithubLoginModelPropType} from '../prop-types';
import AggregatedReviewsContainer from '../containers/aggregated-reviews-container';

export class BareCommentDecorationsController extends React.Component {

  static propTypes = {
    workspace: PropTypes.object.isRequired,
    localRepository: PropTypes.object.isRequired,

    // Relay response
    relay: PropTypes.object.isRequired,
    results: PropTypes.arrayOf(PropTypes.object),
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
  isCheckedOutPullRequest(branches, remotes, pullRequest) {
    // determine if pullRequest.headRepository is null
    // this can happen if a repository has been deleted.
    if (!pullRequest.headRepository) {
      return false;
    }

    const {repository} = pullRequest;

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

  render() {
    const pullRequest = this.props.results[0];

    // only show comment decorations if we're on a checked out pull request
    // otherwise, we'd have no way of knowing which comments to show.
    if (!this.isCheckedOutPullRequest(
      this.props.localRepository.branches,
      this.props.localRepository.remotes,
      pullRequest)) {
      return null;
    }

    return (
      <AggregatedReviewsContainer pullRequest={pullRequest}>
        {({errors, summaries, commentThreads, loading}) => {
          if (errors.length > 0) {
            // eslint-disable-next-line no-console
            console.warn(`error fetching CommentDecorationsController data: ${errors}`);
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
          console.log(rootCommentsByPath)

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

export default createFragmentContainer(BareCommentDecorationsController, {
  results: graphql`
    fragment commentDecorationsController_results on PullRequest
    @relay(plural: true)
    {
      ...aggregatedReviewsContainer_pullRequest @arguments(
        reviewCount: $reviewCount
        reviewCursor: $reviewCursor
        threadCount: $threadCount
        threadCursor: $threadCursor
        commentCount: $commentCount
        commentCursor: $commentCursor
      )
      number
      headRefName
      headRepository {
        name
        owner {
          login
        }
      }

      repository {
        id
        owner {
          login
        }
      }
    }
  `,
});
