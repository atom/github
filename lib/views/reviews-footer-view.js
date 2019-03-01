import React from 'react';
import PropTypes from 'prop-types';


export default class ReviewsFooterView extends React.Component {
  static propTypes = {
    commentsResolved: PropTypes.number.isRequired,
    totalComments: PropTypes.number.isRequired,

    // Controller actions
    openReviews: PropTypes.func.isRequired,
  };

  render() {
    return (
      <footer>
        <span className="github-PrDetailView-footerTitle">
          Reviews
        </span>
        <span className="github-PrDetailViewReviews">
          <span className="github-PrDetailViewReview-count">
          Resolved{' '}
            <span className="github-PrDetailViewReviews-countNr">
              {this.props.commentsResolved}
            </span>
            {' '}of{' '}
            <span className="github-Reviews-countNr">
              {this.props.totalComments}
            </span>{' '}comments
          </span>
          <progress className="github-PrDetailViewReviews-progessBar"
            value={this.props.commentsResolved} max={this.props.totalComments}>
            {' '}comments{' '}
          </progress>
        </span>
        <button className="github-PrDetailViewReviews-openReviewsButton btn"
          onClick={this.props.openReviews}>Open reviews</button>
        <button className="github-PrDetailView-reviewChangesButton btn btn-primary">Review changes</button>
      </footer>
    );
  }
}
