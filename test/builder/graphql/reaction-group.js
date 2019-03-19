import {createSpecBuilderClass} from './helpers';
import {createConnectionBuilderClass} from './connection';

import {UserBuilder} from './user';

export const ReactionGroupBuilder = createSpecBuilderClass('ReactionGroup', {
  content: {default: 'ROCKET'},
  users: {linked: createConnectionBuilderClass('ReactingUser', UserBuilder)},
});
