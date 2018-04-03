import React from 'react';
import {mount} from 'enzyme';

import CoAuthorDialog from '../../lib/views/co-author-dialog';

describe('CoAuthorDialog', function() {
  let atomEnv;
  let app, wrapper, didSubmit, didCancel;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();

    didSubmit = sinon.stub();
    didCancel = sinon.stub();

    app = (
      <CoAuthorDialog
        commandRegistry={atomEnv.commands}
        onSubmit={didSubmit}
        onCancel={didCancel}
      />
    );
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  const setTextIn = function(selector, text) {
    wrapper.find(selector).simulate('change', {target: {value: text}});
  };

  describe('confirm', function() {
    it('submits current co author name and email', function() {
      wrapper = mount(app);
      const name = 'Coauthor Name';
      const email = 'foo@bar.com';

      setTextIn('.github-CoAuthorDialog-name', name);
      setTextIn('.github-CoAuthorDialog-email', email);


      wrapper.find('.btn-primary').simulate('click');

      assert.deepEqual(didSubmit.firstCall.args[0], {
        name,
        email,
      });
    });
  });

  describe('cancel', function() {
    it('calls cancel prop when cancel is clicked', function() {
      wrapper = mount(app);
      wrapper.find('.github-CancelButton').simulate('click');
      assert.isTrue(didCancel.called);
    });

    it('calls cancel prop when `core:cancel` is triggered', function() {
      wrapper = mount(app);
      atomEnv.commands.dispatch(wrapper.find('.github-CoAuthorDialog').getNode(), 'core:cancel');
      assert.isTrue(didCancel.called);
    });
  });
});
