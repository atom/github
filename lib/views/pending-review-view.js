import React, {Fragment} from 'react';
import PropTypes from 'prop-types';
import AtomTextEditor from '../atom/atom-text-editor';
import RefHolder from '../models/ref-holder';

export default class PendingReviewView extends React.Component {

  static propTypes = {
    renderReviewCommentThread: PropTypes.func.isRequired,
    reviewTypesByAction: PropTypes.object.isRequired,
  };

  constructor(props) {
    super();
    this.summaryHolder = new RefHolder();
    this.state = {reviewType: null};
  }

  render() {
    return (
      <div className="github-Reviews github-PendingReviews">
        {this.renderSummarySection()}
        {this.renderCommentSection()}
      </div>
    );
  }

  onReviewTypeSelected = event => {
    this.setState({reviewType: this.props.reviewTypesByAction.get(event.target.value)});
  }

  renderSummarySection() {
    return (
      <details open className="github-Reviews-section summaries">
        <summary className="github-Reviews-header">
          <span className="github-Reviews-title">Summary</span>
        </summary>
        <main className="github-Reviews-container">
          <div className="github-PendingReviews-reviewType">
            <div className="github-PendingReviews-description">
              {this.state.reviewType ? this.state.reviewType.description : ''}
            </div>
            <select
              className="input-select"
              value={this.state.reviewType ? this.state.reviewType.action : ''}
              onChange={this.onReviewTypeSelected}>
              <option disabled value="">Review Type</option>
              {['COMMENT', 'APPROVE', 'REQUEST_CHANGES'].map(action => {
                const {label} = this.props.reviewTypesByAction.get(action);
                return (<option value={action} key={action}>{label}</option>);
              })}
            </select>
          </div>
          <AtomTextEditor
            placeholderText="Leave a comment"
            lineNumberGutterVisible={false}
            softWrapped={true}
            autoHeight={true}
            readOnly={false}
            refModel={this.summaryHolder}
          />
          <div className="github-PendingReviews-summaryFooter">
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
