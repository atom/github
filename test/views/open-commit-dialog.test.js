import React from 'react';
import {mount} from 'enzyme';

import OpenCommitDialog from '../../lib/views/open-commit-dialog';

describe('OpenCommitDialog', function() {
  let atomEnv, commandRegistry;
  let app, wrapper, didAccept, didCancel, isValidEntry;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
    commandRegistry = atomEnv.commands;

    didAccept = sinon.stub();
    didCancel = sinon.stub();
    isValidEntry = sinon.stub().returns(true);

    app = (
      <OpenCommitDialog
        commandRegistry={commandRegistry}
        didAccept={didAccept}
        didCancel={didCancel}
        isValidEntry={isValidEntry}
      />
    );
    wrapper = mount(app);
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  const setTextIn = function(selector, text) {
    wrapper.find(selector).getDOMNode().getModel().setText(text);
  };

  describe('entering a commit sha', function() {
    it("updates the commit ref automatically if it hasn't been modified", function() {
      setTextIn('.github-CommitRef atom-text-editor', 'asdf1234');

      assert.equal(wrapper.instance().getCommitRef(), 'asdf1234');
    });

    it('does update the ref if it was modified automatically', function() {
      setTextIn('.github-CommitRef atom-text-editor', 'asdf1234');
      assert.equal(wrapper.instance().getCommitRef(), 'asdf1234');

      setTextIn('.github-CommitRef atom-text-editor', 'zxcv5678');
      assert.equal(wrapper.instance().getCommitRef(), 'zxcv5678');
    });
  });

  describe('open button enablement and error state', function() {
    it('disables the open button with no commit ref', function() {
      setTextIn('.github-CommitRef atom-text-editor', '');
      wrapper.update();

      assert.isTrue(wrapper.find('button.icon-commit').prop('disabled'));
      assert.isFalse(wrapper.find('.error').exists());
    });

    it('disables the open button when the commit does not exist in repo', async function() {
      isValidEntry.returns(false);
      const ref = 'abcd1234';
      setTextIn('.github-CommitRef atom-text-editor', ref);
      wrapper.find('button.icon-commit').simulate('click');

      await assert.async.strictEqual(wrapper.update().find('.error').text(), `There is no commit associated with "${ref}" in this repository`);
      assert.isTrue(wrapper.find('button.icon-commit').prop('disabled'));
    });

    it('enables the open button when commit sha box is populated with a valid sha', function() {
      setTextIn('.github-CommitRef atom-text-editor', 'abcd1234');
      wrapper.update();

      assert.isFalse(wrapper.find('button.icon-commit').prop('disabled'));
      assert.isFalse(wrapper.find('.error').exists());
    });
  });

  it('calls the acceptance callback after validation', async function() {
    isValidEntry.returns(true);
    const ref = 'abcd1234';
    setTextIn('.github-CommitRef atom-text-editor', ref);

    wrapper.find('button.icon-commit').simulate('click');

    await assert.async.isTrue(didAccept.calledWith({ref}));
    wrapper.unmount();
  });

  it('calls the cancellation callback', function() {
    wrapper.find('button.github-CancelButton').simulate('click');
    assert.isTrue(didCancel.called);
    wrapper.unmount();
  });
});
