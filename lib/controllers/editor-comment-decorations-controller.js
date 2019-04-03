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
      digest: PropTypes.string,
    }),
  }

  constructor(props) {
    super(props);

    this.rangesByRootID = new Map();
  }

  shouldComponentUpdate(nextProps) {
    return translationDigestFrom(this.props) !== translationDigestFrom(nextProps);
  }

  render() {
    if (!this.props.commentTranslationsForPath) {
      return null;
    }

    return this.props.threadsForPath.map(thread => {
      const range = this.getRangeForThread(thread);
      if (!range) {
        return null;
      }

      return (
        <Fragment key={`github-editor-review-decoration-${thread.rootCommentID}`}>
          <Marker
            editor={this.props.editor}
            bufferRange={range}
            didChange={evt => this.markerDidChange(thread.rootCommentID, evt)}>

            <Decoration
              type="line"
              editor={this.props.editor}
              className="github-editorCommentHighlight"
              omitEmptyLastRow={false}
            />

          </Marker>
          <CommentGutterDecorationController
            commentRow={range.start.row}
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

  markerDidChange(rootCommentID, {newRange}) {
    this.rangesByRootID.set(rootCommentID, Range.fromObject(newRange));
  }

  getRangeForThread(thread) {
    const translations = this.props.commentTranslationsForPath;

    if (thread.position === null) {
      this.rangesByRootID.delete(thread.rootCommentID);
      return null;
    }

    let adjustedPosition = translations.diffToFilePosition.get(thread.position);
    if (!adjustedPosition) {
      this.rangesByRootID.delete(thread.rootCommentID);
      return null;
    }

    if (translations.fileTranslations) {
      adjustedPosition = translations.fileTranslations.get(adjustedPosition).newPosition;
      if (!adjustedPosition) {
        this.rangesByRootID.delete(thread.rootCommentID);
        return null;
      }
    }

    const editorRow = adjustedPosition - 1;

    let localRange = this.rangesByRootID.get(thread.rootCommentID);
    if (!localRange) {
      localRange = Range.fromObject([[editorRow, 0], [editorRow, 0]]);
      this.rangesByRootID.set(thread.rootCommentID, localRange);
    }
    return localRange;
  }
}

function translationDigestFrom(props) {
  const translations = props.commentTranslationsForPath;
  return translations ? translations.digest : null;
}
