import {createSpecBuilderClass, defer} from './helpers';
import {nextID} from '../id-sequence';

import {RefBuilder} from './ref';
import {UserBuilder} from './user';

const IssueishBuilder = defer('./issueish', 'IssueishBuilder');

export const RepositoryBuilder = createSpecBuilderClass('RepositoryBuilder', {
  id: {default: nextID},
  name: {default: 'the-repository'},
  url: {default: f => `https://github.com/${f.owner.login}/${f.name}`},
  sshUrl: {default: f => `git@github.com:${f.owner.login}/${f.name}.git`},
  owner: {linked: UserBuilder},
  defaultBranchRef: {linked: RefBuilder},
  ref: {linked: RefBuilder},
  issueish: {linked: IssueishBuilder},
});

export function repositoryBuilder(...nodes) {
  return new RepositoryBuilder(nodes);
}
