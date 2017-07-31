import React from 'react';
import {mount} from 'enzyme';

import CredentialDialog from '../../lib/views/credential-dialog';

describe('CredentialDialog', function() {
  let atomEnv;
  let app, wrapper, didSubmit, didCancel;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();

    didSubmit = sinon.stub();
    didCancel = sinon.stub();

    app = (
      <CredentialDialog
        commandRegistry={atomEnv.commands}
        prompt="speak friend and enter"
        includeUsername={true}
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
    it('reports the current username and password', function() {
      wrapper = mount(app);

      setTextIn('.github-CredentialDialog-Username', 'someone');
      setTextIn('.github-CredentialDialog-Password', 'letmein');

      wrapper.find('.btn-primary').simulate('click');

      assert.deepEqual(didSubmit.firstCall.args[0], {
        username: 'someone',
        password: 'letmein',
      });
    });

    it('omits the username if includeUsername is false', function() {
      wrapper = mount(React.cloneElement(app, {includeUsername: false}));

      assert.isFalse(wrapper.find('.github-CredentialDialog-Username').exists());
      setTextIn('.github-CredentialDialog-Password', 'twowordsuppercase');

      wrapper.find('.btn-primary').simulate('click');

      assert.deepEqual(didSubmit.firstCall.args[0], {
        password: 'twowordsuppercase',
      });
    });
  });
});
