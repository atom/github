import React from 'react';
import {shallow} from 'enzyme';

import PullRequestReviewsController from '../../lib/controllers/pr-reviews-controller';

describe('PullRequestReviewsController', function() {
  function buildApp(opts, overrideProps = {}) {
    const o = {
      relayHasMore: () => { return false; },
      relayLoadMore: () => {},
      relayIsLoading: () => { return false; },
      reveiwSpecs: [],
      reviewStartCursor: 0,
      ...opts,
    };

    const review = {
      edges: o.reviewItemSpecs.map((spec, i) => ({
        cursor: `result${i}`,
        node: {
          id: spec.id,
          __typename: spec.kind,
        },
      })),
      pageInfo: {
        startCursor: `result${o.reviewStartCursor}`,
        endCursor: `result${o.reviewStartCursor + o.reviewItemSpecs.length}`,
        hasNextPage: o.reviewStartCursor + o.reviewItemSpecs.length < o.reviewItemTotal,
        hasPreviousPage: o.reviewStartCursor !== 0,
      },
      totalCount: o.reviewItemTotal,
    };

    const props = {
      relay: {
        hasMore: o.relayHasMore,
        loadMore: o.relayLoadMore,
        isLoading: o.relayIsLoading,
      },
      getBufferRowForDiffPosition: () => {},
      pullRequest: review,
      ...overrideProps,
    };
    return <PullRequestReviewsController {...props} />;
  }
  it('renders a PullRequestReviewCommentsContainer for every review', function() {

  });

  it('renders a PullRequestReviewCommentsView', function() {

  });

  it('groups the comments into threads once all the data has been fetched', function() {

  });
});
