import {createSpecBuilderClass} from './base';
import {nextID} from '../id-sequence';

export const UserBuilder = createSpecBuilderClass('User', {
  __typename: {default: 'User'},
  id: {default: nextID},
  login: {default: 'someone'},
  avatarUrl: {default: 'https://avatars3.githubusercontent.com/u/17565?s=32&v=4'},
  url: {default: f => {
    const login = f.login || 'login';
    return `https://github.com/${login}`;
  }},
});

export function userBuilder(...nodes) {
  return UserBuilder.onFragmentQuery(nodes);
}
