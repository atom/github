import React from 'react';
import PropTypes from 'prop-types';

import Marker from '../atom/marker';
import Decoration from '../atom/decoration';
import {Point, Range} from 'atom';

export default class EditorCommentDecorationsController extends React.Component {
  static propTypes = {
    editor: PropTypes.object.isRequired,
    comments: PropTypes.arrayOf(PropTypes.object).isRequired,
  }

  render() {
    return this.props.comments.map(comment => {
      if (comment.isMinimized || comment.position === null) {
        return null;
      }
      const point = new Point(comment.position, 0);
      const range = new Range(point, point);
      const marker = this.props.editor.markBufferRange(range);
      return (
        <Marker key={comment.id} editor={this.props.editor} bufferRange={range}>
          <Decoration
            type="line"
            editor={this.props.editor}
            decorable={marker}
            className="github-editorCommentHighlight"
            omitEmptyLastRow={false}
          />
        </Marker>
      );
    })
  }
}
