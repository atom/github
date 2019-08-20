import React from 'react';
import {shallow} from 'enzyme';

import DialogView from '../../lib/views/dialog-view';
import AutoFocus from '../../lib/autofocus';

describe('DialogView', function() {
  let atomEnv;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function buildApp(overrides = {}) {
    return (
      <DialogView
        workspace={atomEnv.workspace}
        commands={atomEnv.commands}
        autofocus={new AutoFocus()}
        inProgress={false}
        acceptEnabled={true}
        accept={() => {}}
        cancel={() => {}}
        children={<div />}
        {...overrides}
      />
    );
  }

  it('includes common dialog elements', function() {
    const wrapper = shallow(buildApp());

    assert.isTrue(wrapper.exists('Panel[location="modal"]'));
    assert.isTrue(wrapper.exists('.github-Dialog'));
    assert.isTrue(wrapper.exists('Commands'));
    assert.isTrue(wrapper.exists('main.github-DialogForm'));
    assert.isTrue(wrapper.exists('footer.github-DialogFooter'));
    assert.isTrue(wrapper.exists('.github-DialogInfo'));
    assert.isTrue(wrapper.exists('.github-DialogButtons'));
    assert.isTrue(wrapper.exists('.btn.github-Dialog-cancelButton'));
    assert.isTrue(wrapper.exists('.btn.btn-primary'));

    assert.isFalse(wrapper.exists('header.github-DialogPrompt'));
    assert.isFalse(wrapper.exists('.loading-spinner-small'));
    assert.isFalse(wrapper.exists('.error-messages'));
  });

  describe('customization', function() {
    it('includes a prompt banner if the prompt prop is provided', function() {
      const wrapper = shallow(buildApp({prompt: 'some text'}));
      assert.strictEqual(wrapper.find('header.github-DialogPrompt').text(), 'some text');
    });

    it('inserts custom form contents', function() {
      const wrapper = shallow(buildApp({
        children: <div className="custom" />,
      }));
      assert.isTrue(wrapper.exists('main .custom'));
    });

    it('displays a spinner and custom message when in progress', function() {
      const wrapper = shallow(buildApp({
        progressMessage: 'crunching numbers',
        inProgress: true,
      }));
      assert.isTrue(wrapper.exists('.loading-spinner-small'));
      assert.strictEqual(wrapper.find('.github-DialogProgress-message').text(), 'crunching numbers');
    });

    it('omits the spinner when no progress message is provided', function() {
      const wrapper = shallow(buildApp({
        inProgress: true,
      }));
      assert.isFalse(wrapper.exists('.loading-spinner-small'));
      assert.isFalse(wrapper.exists('.github-DialogProgress-message'));
    });

    it('uses a custom classes and label for the accept button', function() {
      const wrapper = shallow(buildApp({
        acceptClassName: 'icon icon-repo-clone',
        acceptText: 'Engage',
      }));

      const button = wrapper.find('.btn-primary');
      assert.isTrue(button.hasClass('icon'));
      assert.isTrue(button.hasClass('icon-repo-clone'));
      assert.strictEqual(button.text(), 'Engage');
    });
  });

  describe('tabbing', function() {
    it('defaults the tabIndex of the buttons to 0', function() {
      const wrapper = shallow(buildApp());

      assert.strictEqual(wrapper.find('.github-Dialog-cancelButton').prop('tabIndex'), 0);
      assert.strictEqual(wrapper.find('.btn-primary').prop('tabIndex'), 0);
    });

    it('customizes the tabIndex of the standard buttons', function() {
      const wrapper = shallow(buildApp({
        cancelTabIndex: 10,
        acceptTabIndex: 20,
      }));

      assert.strictEqual(wrapper.find('.github-Dialog-cancelButton').prop('tabIndex'), 10);
      assert.strictEqual(wrapper.find('.btn-primary').prop('tabIndex'), 20);
    });

    it('recaptures focus after it leaves the dialog element', function() {
      const autofocus = new AutoFocus();
      const wrapper = shallow(buildApp({autofocus}));

      sinon.spy(autofocus, 'trigger');
      wrapper.find('.github-Dialog').simulate('transitionEnd');
      assert.isTrue(autofocus.trigger.called);
    });
  });

  it('displays an error with a friendly explanation', function() {
    const e = new Error('unfriendly');
    e.userMessage = 'friendly';

    const wrapper = shallow(buildApp({error: e}));
    assert.strictEqual(wrapper.find('.error-messages li').text(), 'friendly');
  });

  it('falls back to presenting the regular error message', function() {
    const e = new Error('other');

    const wrapper = shallow(buildApp({error: e}));
    assert.strictEqual(wrapper.find('.error-messages li').text(), 'other');
  });

  it('calls the accept callback on core:confirm event', function() {
    const accept = sinon.spy();
    const wrapper = shallow(buildApp({accept}));

    wrapper.find('Command[command="core:confirm"]').prop('callback')();
    assert.isTrue(accept.called);
  });

  it('calls the accept callback on an accept button click', function() {
    const accept = sinon.spy();
    const wrapper = shallow(buildApp({accept}));

    wrapper.find('.btn-primary').simulate('click');
    assert.isTrue(accept.called);
  });

  it('calls the cancel callback on a core:cancel event', function() {
    const cancel = sinon.spy();
    const wrapper = shallow(buildApp({cancel}));

    wrapper.find('Command[command="core:cancel"]').prop('callback')();
    assert.isTrue(cancel.called);
  });

  it('calls the cancel callback on a cancel button click', function() {
    const cancel = sinon.spy();
    const wrapper = shallow(buildApp({cancel}));

    wrapper.find('.github-Dialog-cancelButton').simulate('click');
    assert.isTrue(cancel.called);
  });
});
