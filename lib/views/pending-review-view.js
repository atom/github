import React, {Fragment} from 'react';
import PropTypes from 'prop-types';
import AtomTextEditor from '../atom/atom-text-editor';
import RefHolder from '../models/ref-holder';

export default class PendingReviewView extends React.Component {
  static propTypes = {
    renderReviewCommentThread: PropTypes.func.isRequired,
  };

  constructor(props) {
    super();
    this.summaryHolder = new RefHolder();
  }

  render() {
    return (
      <div className="github-Reviews github-PendingReviews">
        {this.renderSummarySection()}
        {this.renderCommentSection()}
      </div>
    );
  }

  renderSummarySection() {
    return (
      <details open className="github-Reviews-section summaries">
        <summary className="github-Reviews-header">
          <span className="github-Reviews-title">Summary</span>
        </summary>
        <main className="github-Reviews-container">
          <AtomTextEditor
            placeholderText="Leave a comment"
            lineNumberGutterVisible={false}
            softWrapped={true}
            autoHeight={true}
            readOnly={false}
            refModel={this.summaryHolder}
          />
          <div className="github-PendingReviews-summaryFooter">
            <div className="github-PendingReviews-reviewType">
              <select className="input-select">
                <option value="comment">Comment</option>
                <option value="approve">Approve</option>
                <option value="request-changes">Request changes</option>
              </select>
            </div>
            <button className="btn btn-primary">Submit review</button>
          </div>
        </main>
      </details>
    );
  }

  renderCommentSection() {
    const threads = this.props.pendingCommentThreads;
    return (
      <details open className="github-Reviews-section comments">
        <summary className="github-Reviews-header">
          <span className="github-Reviews-title">Comments</span>
        </summary>
        {threads.length > 0 && <main className="github-Reviews-container">
          {threads.map(this.props.renderReviewCommentThread)}
        </main>}
      </details>
    )
  }

}
