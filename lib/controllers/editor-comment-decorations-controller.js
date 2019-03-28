import React from 'react';
import PropTypes from 'prop-types';
import {Range} from 'atom';

import {EndpointPropType} from '../prop-types';
import Marker from '../atom/marker';
import Decoration from '../atom/decoration';
import ReviewsItem from '../items/reviews-item';

import translateLines from 'whats-my-line';

export default class EditorCommentDecorationsController extends React.Component {
  static propTypes = {
    endpoint: EndpointPropType.isRequired,
    owner: PropTypes.string.isRequired,
    repo: PropTypes.string.isRequired,
    number: PropTypes.number.isRequired,
    workdir: PropTypes.string.isRequired,

    workspace: PropTypes.object.isRequired,
    editor: PropTypes.object.isRequired,
    comments: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.string.isRequired,
      position: PropTypes.number.isRequired,
      isMinimized: PropTypes.bool.isRequired,
      threadID: PropTypes.string.isRequired,
    })).isRequired,

    // Injectable for unit tests
    translateLines: PropTypes.func,
    didFinishTranslation: PropTypes.func,
  }

  static defaultProps = {
    translateLines,
    didFinishTranslation: () => {},
  }

  constructor(props) {
    super(props);
    this.state = {
      translations: null,
      positionById: null,
    };

    this.translateLines();
  }

  async translateLines() {
    const positionById = new Map();
    const lines = this.props.comments.map(comment => {
      // const filePosition = getLastLineForDiffHunk(comment.diffHunk);
      const filePosition = comment.position;
      positionById.set(comment.id, filePosition);
      return filePosition;
    });

    const {workdir, fileName, headSha} = this.props;
    const translations = await this.props.translateLines(lines, workdir, fileName, headSha);
    this.setState({translations, positionById}, this.props.didFinishTranslation);
  }

  shouldComponentUpdate(_nextProps, nextState) {
    return this.state.translations !== nextState.translations;
  }

  render() {
    if (!this.state.translations) { return null; }

    const {translations, positionById} = this.state;
    return this.props.comments.map(comment => {
      if (comment.isMinimized || comment.position === null) {
        return null;
      }
      const newPosition = translations.get(positionById.get(comment.id)).newPosition;
      const range = Range.fromObject([[newPosition - 1, 0], [newPosition - 1, 0]]);

      return (
        <Marker key={`github-editor-review-decoration-${comment.id}`} editor={this.props.editor} bufferRange={range}>
          <Decoration
            type="line"
            editor={this.props.editor}
            className="github-editorCommentHighlight"
            omitEmptyLastRow={false}
          />
          <Decoration
            type="gutter"
            gutterName="github-comment-icon"
            editor={this.props.editor}
            omitEmptyLastRow={false}
            className="github-editorCommentGutterIcon">
            <button className="icon icon-comment" onClick={() => this.openThread(comment.threadID)} />
          </Decoration>
        </Marker>
      );
    });
  }

  async openThread(threadID) {
    const uri = ReviewsItem.buildURI(
      this.props.endpoint.getHost(),
      this.props.owner,
      this.props.repo,
      this.props.number,
      this.props.workdir,
    );
    const reviewsItem = await this.props.workspace.open(uri, {searchAllPanes: true});
    reviewsItem.jumpToThread(threadID);
  }
}
