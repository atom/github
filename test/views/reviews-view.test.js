import React from 'react';
import {shallow} from 'enzyme';

import ReviewsView from '../../lib/views/reviews-view';

describe('ReviewsView', function() {
  let atomEnv;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function buildApp(override = {}) {
    const props = {
      ...override,
    };

    return <ReviewsView {...props} />;
  }

  it('renders something', function() {
    const wrapper = shallow(buildApp());
    assert.isTrue(wrapper.exists('div'));
  });
});
