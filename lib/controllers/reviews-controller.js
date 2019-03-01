import React from 'react';

import ReviewsView from '../views/reviews-view';

export default class ReviewsController extends React.Component {
  render() {
    return (
      <ReviewsView
        {...this.props}
      />
    );
  }
}
