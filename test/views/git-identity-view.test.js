import React from 'react';
import {mount} from 'enzyme';
import {TextBuffer} from 'atom';

import GitIdentityView from '../../lib/views/git-identity-view';

describe('GitIdentityView', function() {
  function buildApp(override = {}) {
    return (
      <GitIdentityView
        usernameBuffer={new TextBuffer()}
        emailBuffer={new TextBuffer()}
        close={() => {}}
        {...override}
      />
    );
  }

  it('displays buffers for username and email entry', function() {
    const usernameBuffer = new TextBuffer();
    const emailBuffer = new TextBuffer();

    const wrapper = mount(buildApp({usernameBuffer, emailBuffer}));

    function getEditor(placeholderText) {
      return wrapper.find(`AtomTextEditor[placeholderText="${placeholderText}"]`);
    }

    assert.strictEqual(getEditor('name').prop('buffer'), usernameBuffer);
    assert.strictEqual(getEditor('email address').prop('buffer'), emailBuffer);
  });

  it('triggers a callback when "Continue" is clicked', function() {
    const close = sinon.spy();
    const wrapper = mount(buildApp({close}));

    wrapper.find('.btn').simulate('click');

    assert.isTrue(close.called);
  });
});
