import {createSpecBuilderClass} from './helpers';

export const UserBuilder = createSpecBuilderClass('UserBuilder', {
  login: {default: 'someone'},
  avatarUrl: {default: 'https://avatars3.githubusercontent.com/u/17565?s=32&v=4'},
});

export function userBuilder(node) {
  return new UserBuilder(node);
}
