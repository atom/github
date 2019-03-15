import React from 'react';
import {CompositeDisposable} from 'event-kit';

import {PAGE_SIZE} from '../helpers';
import AggregatedReviewsContainer from '../containers/aggregated-reviews-container';

export default class CommentDecorationsController extends React.Component {
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

  render() {
    console.log('props inside of CommentDecorationsController', this.props);
    return null;
  //  return (
  //    <AggregatedReviewsContainer pullRequest={props.repository.pullRequest}>
  //      {({errors, summaries, commentThreads, loading}) => {
  //        if (errors.length > 0) {
  //          console.log(errors);
  //        }
  //
  //        const rootCommentsByPath = new Map();
  //        commentThreads.forEach(commentThread => {
  //           // there might be multiple comments in the thread but we really only
  //           // care about the root comment when rendering decorations
  //          const rootComment = commentThread.comments[0];
  //
  //          if (rootCommentsByPath.get(rootComment.path)) {
  //            rootCommentsByPath.get(rootComment.path).push(rootComment);
  //          } else {
  //            rootCommentsByPath.set(rootComment.path, [rootComment]);
  //          }
  //        });
  //
  //        console.log('rootCommentsByPath', rootCommentsByPath);
  //
  //        const editorsWithCommentThreads = this.getEditorsWithCommentThreads(rootCommentsByPath);
  //        return null;
  //         todo: we want something like
  //         return (
  //           <Fragment>
  //             {editorsWithCommentThreads.map(editor => (
  //               <EditorCommentDecorationsController
  //                 key={editor.id}
  //                 commandRegistry={this.props.commandRegistry}
  //                 editor={editor}
  //               />
  //             ))}
  //           </Fragment>
  //         );
  //      }}
  //    </AggregatedReviewsContainer>
  //  );
  // }
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
