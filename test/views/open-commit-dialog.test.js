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
    it("updates the commit sha automatically if it hasn't been modified", function() {
      setTextIn('.github-CommitSha atom-text-editor', 'asdf1234');

      assert.equal(wrapper.instance().getCommitSha(), 'asdf1234');
    });

    it('does update the sha if it was modified automatically', function() {
      setTextIn('.github-CommitSha atom-text-editor', 'asdf1234');
      assert.equal(wrapper.instance().getCommitSha(), 'asdf1234');

      setTextIn('.github-CommitSha atom-text-editor', 'zxcv5678');
      assert.equal(wrapper.instance().getCommitSha(), 'zxcv5678');
    });
  });

  describe('open button enablement and error state', function() {
    it('disables the open button with no commit sha', function() {
      setTextIn('.github-CommitSha atom-text-editor', '');
      wrapper.update();

      assert.isTrue(wrapper.find('button.icon-commit').prop('disabled'));
      assert.isFalse(wrapper.find('.error').exists());
    });

    it('disables the open button with an invalid commit sha', function() {
      setTextIn('.github-CommitSha atom-text-editor', 'NOOOPE');
      wrapper.update();

      assert.isTrue(wrapper.find('button.icon-commit').prop('disabled'));
      assert.strictEqual(wrapper.find('.error').text(), 'Not a valid git commit identifier');
    });

    it('disables the open button when the commit does not exist in repo', async function() {
      isValidEntry.returns(false);
      setTextIn('.github-CommitSha atom-text-editor', 'abcd1234');
      wrapper.find('button.icon-commit').simulate('click');

      await assert.async.strictEqual(wrapper.update().find('.error').text(), 'Commit with that sha does not exist in this repository');
      assert.isTrue(wrapper.find('button.icon-commit').prop('disabled'));
    });

    it('enables the open button when commit sha box is populated with a valid sha', function() {
      setTextIn('.github-CommitSha atom-text-editor', 'abcd1234');
      wrapper.update();

      assert.isFalse(wrapper.find('button.icon-commit').prop('disabled'));
      assert.isFalse(wrapper.find('.error').exists());
    });
  });

  it('calls the acceptance callback after validation', async function() {
    isValidEntry.returns(true);
    const sha = 'abcd1234';
    setTextIn('.github-CommitSha atom-text-editor', sha);

    wrapper.find('button.icon-commit').simulate('click');

    await assert.async.isTrue(didAccept.calledWith({sha}));
    wrapper.unmount();
  });

  it('calls the cancellation callback', function() {
    wrapper.find('button.github-CancelButton').simulate('click');
    assert.isTrue(didCancel.called);
    wrapper.unmount();
  });
});
