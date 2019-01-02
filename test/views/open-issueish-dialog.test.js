import React from 'react';
import {mount} from 'enzyme';

import OpenIssueishDialog from '../../lib/views/open-issueish-dialog';

describe('OpenIssueishDialog', function() {
  let atomEnv, commandRegistry;
  let app, wrapper, didAccept, didCancel;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
    commandRegistry = atomEnv.commands;

    didAccept = sinon.stub();
    didCancel = sinon.stub();

    app = (
      <OpenIssueishDialog
        commandRegistry={commandRegistry}
        didAccept={didAccept}
        didCancel={didCancel}
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

  describe('entering a issueish url', function() {
    it("updates the issue url automatically if it hasn't been modified", function() {
      setTextIn('.github-IssueishUrl atom-text-editor', 'https://github.com/atom/github/pull/1807');

      assert.equal(wrapper.instance().getIssueishUrl(), 'https://github.com/atom/github/pull/1807');
    });

    it('does update the issue url if it was modified automatically', function() {
      setTextIn('.github-IssueishUrl atom-text-editor', 'https://github.com/atom/github/pull/1807');
      assert.equal(wrapper.instance().getIssueishUrl(), 'https://github.com/atom/github/pull/1807');

      setTextIn('.github-IssueishUrl atom-text-editor', 'https://github.com/atom/github/issues/1655');
      assert.equal(wrapper.instance().getIssueishUrl(), 'https://github.com/atom/github/issues/1655');
    });
  });

  describe('open button enablement', function() {
    it('disables the open button with no issue url', function() {
      setTextIn('.github-IssueishUrl atom-text-editor', '');
      wrapper.update();

      assert.isTrue(wrapper.find('button.icon-git-pull-request').prop('disabled'));
    });

    it('enables the open button when issue url box is populated', function() {
      setTextIn('.github-IssueishUrl atom-text-editor', 'https://github.com/atom/github/pull/1807');
      wrapper.update();

      assert.isFalse(wrapper.find('button.icon-git-pull-request').prop('disabled'));
    });
  });

  describe('parseUrl', function() {
    it('returns an object with repo owner, repo name, and issueish number', function() {
      setTextIn('.github-IssueishUrl atom-text-editor', 'https://github.com/atom/github/pull/1807');

      assert.deepEqual(wrapper.instance().parseUrl(), {
        repoOwner: 'atom',
        repoName: 'github',
        issueishNumber: '1807',
      });
    });
  });

  it('calls the acceptance callback', function() {
    setTextIn('.github-IssueishUrl atom-text-editor', 'https://github.com/atom/github/pull/1807');

    wrapper.find('button.icon-git-pull-request').simulate('click');

    assert.isTrue(didAccept.calledWith({
      repoOwner: 'atom',
      repoName: 'github',
      issueishNumber: '1807',
    }));
  });

  it('calls the cancellation callback', function() {
    wrapper.find('button.github-CancelButton').simulate('click');
    assert.isTrue(didCancel.called);
  });
});
