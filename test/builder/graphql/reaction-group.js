import {createSpecBuilderClass, createConnectionBuilderClass} from './base';

import {UserBuilder} from './user';

export const ReactionGroupBuilder = createSpecBuilderClass('ReactionGroup', {
  content: {default: 'ROCKET'},
  users: {linked: createConnectionBuilderClass('ReactingUser', UserBuilder)},
});
