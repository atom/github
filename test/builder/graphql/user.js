import {createSpecBuilderClass} from './helpers';

export const UserBuilder = createSpecBuilderClass('User', {
  login: {default: 'someone'},
  avatarUrl: {default: 'https://avatars3.githubusercontent.com/u/17565?s=32&v=4'},
  url: {default: f => {
    const login = f.login || 'login';
    return `https://github.com/${login}`;
  }},
});

export function userBuilder(...nodes) {
  return new UserBuilder(nodes);
}
