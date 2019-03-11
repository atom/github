import React from 'react';
import {shallow} from 'enzyme';

import ReviewsController from '../../lib/controllers/reviews-controller';
import ReviewsView from '../../lib/views/reviews-view';
import {multiFilePatchBuilder} from '../builder/patch';

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
      repository: {
        pullRequest: {},
      },
      multiFilePatch: multiFilePatchBuilder().build(),
      owner: 'atom',
      repo: 'github',
      number: 1995,
      workdir: __dirname,
      workspace: atomEnv.workspace,
      config: atomEnv.config,
      commands: atomEnv.commands,
      ...override,
    };

    return <ReviewsController {...props} />;
  }

  it('renders a ReviewsView inside a PullRequestCheckoutController', function() {
    const extra = Symbol('extra');
    const wrapper = shallow(buildApp({extra}));
    assert.isTrue(wrapper.exists('PullRequestCheckoutController'));
    assert.strictEqual(wrapper.find('PullRequestCheckoutController').prop('childComponent'), ReviewsView);
    assert.strictEqual(wrapper.find('PullRequestCheckoutController').prop('extra'), extra);
  });

  describe('context lines', function() {
    it('defaults to 4 lines of context', function() {
      const wrapper = shallow(buildApp());
      assert.strictEqual(wrapper.find('PullRequestCheckoutController').prop('contextLines'), 4);
    });

    it('increases context lines with moreContext', function() {
      const wrapper = shallow(buildApp());
      wrapper.find('PullRequestCheckoutController').prop('moreContext')();

      assert.strictEqual(wrapper.find('PullRequestCheckoutController').prop('contextLines'), 5);
    });

    it('decreases context lines with lessContext', function() {
      const wrapper = shallow(buildApp());
      wrapper.find('PullRequestCheckoutController').prop('lessContext')();

      assert.strictEqual(wrapper.find('PullRequestCheckoutController').prop('contextLines'), 3);
    });

    it('ensures that at least one context line is present', function() {
      const wrapper = shallow(buildApp());
      for (let i = 0; i < 3; i++) {
        wrapper.find('PullRequestCheckoutController').prop('lessContext')();
      }

      assert.strictEqual(wrapper.find('PullRequestCheckoutController').prop('contextLines'), 1);

      wrapper.find('PullRequestCheckoutController').prop('lessContext')();
      assert.strictEqual(wrapper.find('PullRequestCheckoutController').prop('contextLines'), 1);
    });
  });
});
