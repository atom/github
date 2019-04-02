import React, {Fragment} from 'react';
import PropTypes from 'prop-types';
import {CompositeDisposable} from 'event-kit';
import {graphql, createFragmentContainer} from 'react-relay';
import path from 'path';

import EditorCommentDecorationsController from './editor-comment-decorations-controller';
import Gutter from '../atom/gutter';
import {EndpointPropType, BranchSetPropType, RemoteSetPropType, RemotePropType} from '../prop-types';
import {toNativePathSep} from '../helpers';

export class BareCommentDecorationsController extends React.Component {
  static propTypes = {
    // Connection information
    endpoint: EndpointPropType.isRequired,
    owner: PropTypes.string.isRequired,
    repo: PropTypes.string.isRequired,

    // Atom environment
    workspace: PropTypes.object.isRequired,

    // Models
    repoData: PropTypes.shape({
      branches: BranchSetPropType.isRequired,
      remotes: RemoteSetPropType.isRequired,
      currentRemote: RemotePropType.isRequired,
      workingDirectoryPath: PropTypes.string.isRequired,
    }).isRequired,
    commentThreads: PropTypes.arrayOf(PropTypes.shape({
      comments: PropTypes.arrayOf(PropTypes.object).isRequired,
      thread: PropTypes.shape({
        id: PropTypes.string.isRequired,
      }).isRequired,
    })).isRequired,
    commentTranslations: PropTypes.shape({
      get: PropTypes.func.isRequired,
    }).isRequired,

    // Relay response
    relay: PropTypes.object.isRequired,
    pullRequests: PropTypes.arrayOf(PropTypes.shape({
      number: PropTypes.number.isRequired,
      headRefName: PropTypes.string.isRequired,
      headRefOid: PropTypes.string.isRequired,
      headRepository: PropTypes.shape({
        name: PropTypes.string.isRequired,
        owner: PropTypes.shape({
          login: PropTypes.string.isRequired,
        }).isRequired,
      }),
      repository: PropTypes.shape({
        name: PropTypes.string.isRequired,
        owner: PropTypes.shape({
          login: PropTypes.string.isRequired,
        }).isRequired,
      }).isRequired,
    })),
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
    if (this.props.pullRequests.length === 0) {
      return null;
    }
    const pullRequest = this.props.pullRequests[0];

    // only show comment decorations if we're on a checked out pull request
    // otherwise, we'd have no way of knowing which comments to show.
    if (
      !this.isCheckedOutPullRequest(
        this.props.repoData.branches,
        this.props.repoData.remotes,
        pullRequest,
      )
    ) {
      return null;
    }

    const threadDataByPath = new Map();
    const workdirPath = this.props.repoData.workingDirectoryPath;

    for (const {comments, thread} of this.props.commentThreads) {
      // Skip comment threads that are entirely minimized.
      if (comments.every(comment => comment.isMinimized)) {
        continue;
      }

      // There may be multiple comments in the thread, but we really only care about the root comment when rendering
      // decorations.
      const threadData = {
        rootCommentID: comments[0].id,
        threadID: thread.id,
        position: comments[0].position,
        fullPath: path.join(workdirPath, toNativePathSep(comments[0].path)),
      };

      if (threadDataByPath.get(threadData.fullPath)) {
        threadDataByPath.get(threadData.fullPath).push(threadData);
      } else {
        threadDataByPath.set(threadData.fullPath, [threadData]);
      }
    }

    if (threadDataByPath.size === 0) {
      return null;
    }

    const openEditorsWithCommentThreads = this.getOpenEditorsWithCommentThreads(threadDataByPath);
    return openEditorsWithCommentThreads.map(editor => (
      <Fragment key={`github-editor-decoration-${editor.id}`}>
        <Gutter
          name="github-comment-icon"
          priority={1}
          className="comment"
          editor={editor}
          type="decorated"
        />
        <EditorCommentDecorationsController
          endpoint={this.props.endpoint}
          owner={this.props.owner}
          repo={this.props.repo}
          number={pullRequest.number}
          workdir={workdirPath}
          workspace={this.props.workspace}
          editor={editor}
          fileName={editor.getPath()}
          headSha={pullRequest.headRefOid}
          threadsForPath={threadDataByPath.get(editor.getPath())}
          commentTranslationsForPath={this.props.commentTranslations.get(editor.getPath())}
        />
      </Fragment>
    ));
  }

  getOpenEditorsWithCommentThreads(threadDataByPath) {
    return this.state.openEditors.filter(editor => threadDataByPath.has(editor.getPath()));
  }

  componentWillUnmount() {
    this.subscriptions.dispose();
  }
}

export default createFragmentContainer(BareCommentDecorationsController, {
  pullRequests: graphql`
    fragment commentDecorationsController_pullRequests on PullRequest
    @relay(plural: true)
    {
      number
      headRefName
      headRefOid
      headRepository {
        name
        owner {
          login
        }
      }
      repository {
        name
        owner {
          login
        }
      }
    }
  `,
});
