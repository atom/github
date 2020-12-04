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
        canWriteLocal={true}
        setLocal={() => {}}
        setGlobal={() => {}}
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

  it('disables the local repo button when canWriteLocal is false', function() {
    const wrapper = mount(buildApp({canWriteLocal: false}));

    assert.isTrue(wrapper.find('.btn').filterWhere(each => /this repository/.test(each.text())).prop('disabled'));
  });

  it('triggers a callback when "Use for this repository" is clicked', function() {
    const setLocal = sinon.spy();
    const wrapper = mount(buildApp({setLocal}));

    wrapper.find('.btn').filterWhere(each => /this repository/.test(each.text())).simulate('click');

    assert.isTrue(setLocal.called);
  });

  it('triggers a callback when "Use for all repositories" is clicked', function() {
    const setGlobal = sinon.spy();
    const wrapper = mount(buildApp({setGlobal}));

    wrapper.find('.btn').filterWhere(each => /all repositories/.test(each.text())).simulate('click');

    assert.isTrue(setGlobal.called);
  });

  it('triggers a callback when "Cancel" is clicked', function() {
    const usernameBuffer = new TextBuffer({text: 'Me'});
    const emailBuffer = new TextBuffer({text: 'me@email.com'});
    const close = sinon.spy();
    const wrapper = mount(buildApp({usernameBuffer, emailBuffer, close}));

    wrapper.find('.btn').filterWhere(each => /Cancel/.test(each.text())).simulate('click');

    assert.isTrue(close.called);
  });
});
