import {nextID} from '../id-sequence';

import {createSpecBuilderClass} from './helpers';
import {createUnionBuilderClass} from './union';
import {createConnectionBuilderClass} from './connection';
import {ReactionGroupBuilder} from './reaction-group';
import {UserBuilder} from './user';
import {CommitBuilder, CrossReferencedEventBuilder, IssueCommentBuilder} from './timeline';

export const IssueTimelineItemBuilder = createUnionBuilderClass('IssueTimelineItem', {
  beCommit: CommitBuilder,
  beCrossReferencedEvent: CrossReferencedEventBuilder,
  beIssueComment: IssueCommentBuilder,
});

export const IssueBuilder = createSpecBuilderClass('Issue', {
  __typename: {default: 'Issue'},
  id: {default: nextID},
  title: {default: 'Something is wrong'},
  number: {default: 123},
  state: {default: 'OPEN'},
  bodyHTML: {default: '<h1>HI</h1>'},
  author: {linked: UserBuilder},
  reactionGroups: {linked: ReactionGroupBuilder, plural: true, singularName: 'reactionGroup'},
  timeline: {linked: createConnectionBuilderClass('IssueTimeline', IssueTimelineItemBuilder)},
  url: {default: f => {
    const id = f.id || '1';
    return `https://github.com/atom/github/issue/${id}`;
  }},
});

export function issueBuilder(...nodes) {
  return new IssueBuilder(nodes);
}
