import React from 'react';
import PropTypes from 'prop-types';

import Octicon from '../atom/octicon';
import Marker from '../atom/marker';
import Decoration from '../atom/decoration';
import {Point, Range} from 'atom';

import translateLines from 'whats-my-line';

export default class EditorCommentDecorationsController extends React.Component {
  static propTypes = {
    editor: PropTypes.object.isRequired,
    comments: PropTypes.arrayOf(PropTypes.object).isRequired,
  }

  constructor(props) {
    super(props);
    this.state = {};
    this.translateLines();
  }

  async translateLines() {
    const lines = this.props.comments.map(comment => comment.position);
    const {workdir, fileName, headSha} = this.props;
    const translations = await translateLines(lines, workdir, fileName, headSha);
    this.setState({translations});
  }

  shouldComponentUpdate(nextProps, nextState) {
    return this.state.translations !== nextState.translations;
  }

  render() {
    if (!this.state.translations) { return null; }

    const translations = this.state.translations;
    return this.props.comments.map(comment => {
      if (comment.isMinimized || comment.position === null) {
        return null;
      }

      const newPosition = translations.get(comment.position).newPosition;

      const point = new Point(newPosition, 0);
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
          <Decoration
            type="gutter"
            gutterName="github-comment-icon"
            editor={this.props.editor}
            decorable={marker}
            omitEmptyLastRow={false}
            className="github-editorCommentGutterIcon">
            <Octicon icon="comment" />
          </Decoration>
        </Marker>
      );
    });
  }
}
