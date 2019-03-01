import React from 'react';
import {shallow} from 'enzyme';

import ReviewsController from '../../lib/controllers/reviews-controller';

describe('ReviewsController', function() {
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

    return <ReviewsController {...props} />;
  }

  it('renders a ReviewsView', function() {
    const extra = Symbol('extra');
    const wrapper = shallow(buildApp({extra}));
    assert.isTrue(wrapper.exists('ReviewsView'));
    assert.strictEqual(wrapper.find('ReviewsView').prop('extra'), extra);
  });
});
