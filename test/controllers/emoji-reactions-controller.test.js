import React from 'react';
import {shallow} from 'enzyme';

import {BareEmojiReactionsController} from '../../lib/controllers/emoji-reactions-controller';
import EmojiReactionsView from '../../lib/views/emoji-reactions-view';
import {issueBuilder} from '../builder/graphql/issue';

import reactableQuery from '../../lib/controllers/__generated__/emojiReactionsController_reactable.graphql';

describe('EmojiReactionsController', function() {
  let atomEnv;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function buildApp(override = {}) {
    const props = {
      relay: {
        environment: {},
      },
      reactable: issueBuilder(reactableQuery).build(),
      tooltips: atomEnv.tooltips,
      ...override,
    };

    return <BareEmojiReactionsController {...props} />;
  }

  it('renders an EmojiReactionView and passes props', function() {
    const extra = Symbol('extra');
    const wrapper = shallow(buildApp({extra}));

    assert.strictEqual(wrapper.find(EmojiReactionsView).prop('extra'), extra);
  });
});
