import React, {Fragment} from 'react';
import PropTypes from 'prop-types';

export default class PendingReviewView extends React.Component {
  static propTypes = {
    renderReviewCommentThread: PropTypes.func.isRequired,
  };

  render() {
    const threads = this.props.pendingCommentThreads;
    return (
      <Fragment>
        <details open
          className="github-Reviews-section comments">

          <summary className="github-Reviews-header">
            <span className="github-Reviews-title">Comments</span>
          </summary>
          {threads.length > 0 && <main className="github-Reviews-container">
            {threads.map(this.props.renderReviewCommentThread)}
          </main>}
        </details>
      </Fragment>
    );
  }

}
