import {createSpecBuilderClass} from './helpers';

export const OwnerBuilder = createSpecBuilderClass('OwnerBuilder', {
  login: {default: 'the-owner'},
});

export const RepositoryBuilder = createSpecBuilderClass('RepositoryBuilder', {
  name: {default: 'the-repository'},
  url: {default: f => `https://github.com/${f.owner.login}/${f.name}`},
  sshUrl: {default: f => `git@github.com:${f.owner.login}/${f.name}.git`},
  owner: {linked: OwnerBuilder},
});

export function repositoryBuilder(...nodes) {
  return new RepositoryBuilder(nodes);
}
