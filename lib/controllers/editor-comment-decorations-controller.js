import React, {Fragment} from 'react';
import PropTypes from 'prop-types';
import {Range} from 'atom';

import {EndpointPropType} from '../prop-types';
import Marker from '../atom/marker';
import Decoration from '../atom/decoration';
import CommentGutterDecorationController from '../controllers/comment-gutter-decoration-controller';

export default class EditorCommentDecorationsController extends React.Component {
  static propTypes = {
    endpoint: EndpointPropType.isRequired,
    owner: PropTypes.string.isRequired,
    repo: PropTypes.string.isRequired,
    number: PropTypes.number.isRequired,
    workdir: PropTypes.string.isRequired,

    workspace: PropTypes.object.isRequired,
    editor: PropTypes.object.isRequired,
    threadsForPath: PropTypes.arrayOf(PropTypes.shape({
      rootCommentID: PropTypes.string.isRequired,
      position: PropTypes.number,
      threadID: PropTypes.string.isRequired,
    })).isRequired,
    commentTranslationsForPath: PropTypes.shape({
      diffToFilePosition: PropTypes.shape({
        get: PropTypes.func.isRequired,
      }).isRequired,
      fileTranslations: PropTypes.shape({
        get: PropTypes.func.isRequired,
      }),
    }),
  }

  render() {
    const translations = this.props.commentTranslationsForPath;
    if (!translations) {
      return null;
    }

    return this.props.threadsForPath.map(thread => {
      if (thread.position === null) {
        return null;
      }

      const adjustedPosition = translations.diffToFilePosition.get(thread.position);
      if (!adjustedPosition) {
        return null;
      }
      // if (translations.fileTranslations) {
      //   adjustedPosition = translations.fileTranslations.get(thread.position);
      //   if (!adjustedPosition) {
      //     return null;
      //   }
      // }
      const editorRow = adjustedPosition - 1;

      return (
        <Fragment key={`github-editor-review-decoration-${thread.rootCommentID}`}>
          <Marker editor={this.props.editor} bufferRange={Range.fromObject([[editorRow, 0], [editorRow, 0]])}>
            <Decoration
              type="line"
              editor={this.props.editor}
              className="github-editorCommentHighlight"
              omitEmptyLastRow={false}
            />
          </Marker>
          <CommentGutterDecorationController
            commentRow={editorRow}
            threadId={thread.threadID}
            editor={this.props.editor}
            workspace={this.props.workspace}
            endpoint={this.props.endpoint}
            owner={this.props.owner}
            repo={this.props.repo}
            number={this.props.number}
            workdir={this.props.workdir}
            parent={this.constructor.name}
          />
        </Fragment>
      );
    });
  }
}
