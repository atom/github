import {PullRequestBuilder} from './pr';
import {IssueBuilder} from './issue';

import {createUnionBuilderClass} from './union';

export const IssueishBuilder = createUnionBuilderClass('Issueish', {
  beIssue: IssueBuilder,
  bePullRequest: PullRequestBuilder,
  default: 'beIssue',
});
