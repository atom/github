import {createSpecBuilderClass, createConnectionBuilderClass, createUnionBuilderClass, defer} from './base';
import {nextID} from '../id-sequence';

const RepositoryBuilder = defer('../repository', 'RepositoryBuilder');

export const RepositoryConnectionBuilder = createConnectionBuilderClass('Repository', RepositoryBuilder);

export const UserBuilder = createSpecBuilderClass('User', {
  __typename: {default: 'User'},
  id: {default: nextID},
  login: {default: 'someone'},
  avatarUrl: {default: 'https://avatars3.githubusercontent.com/u/17565?s=32&v=4'},
  url: {default: f => {
    const login = f.login || 'login';
    return `https://github.com/${login}`;
  }},
  company: {default: 'GitHub'},
  repositories: {linked: RepositoryConnectionBuilder},
},
'Node & Actor & RegistryPackageOwner & RegistryPackageSearch & ProjectOwner ' +
  '& RepositoryOwner & UniformResourceLocatable',
);

export const OrganizationMemberConnectionBuilder = createConnectionBuilderClass('OrganizationMember', UserBuilder);

export const OrganizationBuilder = createSpecBuilderClass('Organization', {
  login: {default: 'someone'},
  avatarUrl: {default: 'https://avatars3.githubusercontent.com/u/17565?s=32&v=4'},
  repositories: {linked: RepositoryConnectionBuilder},
  membersWithRole: {linked: OrganizationMemberConnectionBuilder},
},
'Node & Actor & RegistryPackageOwner & RegistryPackageSearch & ProjectOwner ' +
  '& RepositoryOwner & UniformResourceLocatable & MemberStatusable',
);

export const RepositoryOwnerBuilder = createUnionBuilderClass('RepositoryOwner', {
  beUser: UserBuilder,
  beOrganization: OrganizationBuilder,
  default: 'beUser',
});

export function userBuilder(...nodes) {
  return UserBuilder.onFragmentQuery(nodes);
}

export function organizationBuilder(...nodes) {
  return OrganizationBuilder.onFragmentQuery(nodes);
}
