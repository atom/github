import {createSpecBuilderClass} from './base';

import {CommentBuilder, ReviewBuilder} from './pr';

const ReviewEdgeBuilder = createSpecBuilderClass('PullRequestReviewEdge', {
  node: {linked: ReviewBuilder},
});

const CommentEdgeBuilder = createSpecBuilderClass('PullRequestReviewCommentEdge', {
  node: {linked: CommentBuilder},
});

export const AddPullRequestReviewPayloadBuilder = createSpecBuilderClass('AddPullRequestReviewPayload', {
  reviewEdge: {linked: ReviewEdgeBuilder},
});

export const AddPullRequestReviewCommentPayloadBuilder = createSpecBuilderClass('AddPullRequestReviewCommentPayload', {
  commentEdge: {linked: CommentEdgeBuilder},
});

export const SubmitPullRequestReviewPayload = createSpecBuilderClass('SubmitPullRequestReviewPayload', {
  pullRequestReview: {linked: ReviewBuilder},
});
