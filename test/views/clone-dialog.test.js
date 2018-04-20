import React from 'react';
import {mount} from 'enzyme';
import path from 'path';

import CloneDialog from '../../lib/views/clone-dialog';

describe('CloneDialog', function() {
  let atomEnv, config, commandRegistry;
  let app, wrapper, didAccept, didCancel;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
    config = atomEnv.config;
    commandRegistry = atomEnv.commands;
    sinon.stub(config, 'get').returns(path.join('home', 'me', 'codes'));

    didAccept = sinon.stub();
    didCancel = sinon.stub();

    app = (
      <CloneDialog
        config={config}
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

  describe('entering a remote URL', function() {
    it("updates the project path automatically if it hasn't been modified", function() {
      setTextIn('.github-CloneUrl atom-text-editor', 'git@github.com:atom/github.git');

      assert.equal(wrapper.instance().getProjectPath(), path.join('home', 'me', 'codes', 'github'));
    });

    it('updates the project path for https URLs', function() {
      setTextIn('.github-CloneUrl atom-text-editor', 'https://github.com/smashwilson/slack-emojinator.git');

      assert.equal(wrapper.instance().getProjectPath(), path.join('home', 'me', 'codes', 'slack-emojinator'));
    });

    it("doesn't update the project path if it has been modified", function() {
      setTextIn('.github-ProjectPath atom-text-editor', path.join('somewhere', 'else'));
      setTextIn('.github-CloneUrl atom-text-editor', 'git@github.com:atom/github.git');

      assert.equal(wrapper.instance().getProjectPath(), path.join('somewhere', 'else'));
    });

    it('does update the project path if it was modified automatically', function() {
      setTextIn('.github-CloneUrl atom-text-editor', 'git@github.com:atom/atom1.git');
      assert.equal(wrapper.instance().getProjectPath(), path.join('home', 'me', 'codes', 'atom1'));

      setTextIn('.github-CloneUrl atom-text-editor', 'git@github.com:atom/atom2.git');
      assert.equal(wrapper.instance().getProjectPath(), path.join('home', 'me', 'codes', 'atom2'));
    });
  });

  describe('clone button enablement', function() {
    it('disables the clone button with no remote URL', function() {
      setTextIn('.github-ProjectPath atom-text-editor', path.join('somewhere', 'else'));
      setTextIn('.github-CloneUrl atom-text-editor', '');
      wrapper.update();

      assert.isTrue(wrapper.find('button.icon-repo-clone').prop('disabled'));
    });

    it('disables the clone button with no project path', function() {
      setTextIn('.github-ProjectPath atom-text-editor', '');
      setTextIn('.github-CloneUrl atom-text-editor', 'git@github.com:atom/github.git');
      wrapper.update();

      assert.isTrue(wrapper.find('button.icon-repo-clone').prop('disabled'));
    });

    it('enables the clone button when both text boxes are populated', function() {
      setTextIn('.github-ProjectPath atom-text-editor', path.join('somewhere', 'else'));
      setTextIn('.github-CloneUrl atom-text-editor', 'git@github.com:atom/github.git');
      wrapper.update();

      assert.isFalse(wrapper.find('button.icon-repo-clone').prop('disabled'));
    });
  });

  it('calls the acceptance callback', function() {
    setTextIn('.github-ProjectPath atom-text-editor', '/somewhere/directory/');
    setTextIn('.github-CloneUrl atom-text-editor', 'git@github.com:atom/atom.git');

    wrapper.find('button.icon-repo-clone').simulate('click');

    assert.isTrue(didAccept.calledWith('git@github.com:atom/atom.git', '/somewhere/directory/'));
  });

  it('calls the cancellation callback', function() {
    wrapper.find('button.github-CancelButton').simulate('click');
    assert.isTrue(didCancel.called);
  });

  describe('in progress', function() {
    beforeEach(function() {
      app = React.cloneElement(app, {inProgress: true});
      wrapper = mount(app);
    });

    it('conceals the text editors and buttons', function() {
      assert.lengthOf(wrapper.find('atom-text-editor'), 0);
      assert.lengthOf(wrapper.find('.btn'), 0);
    });

    it('displays the progress spinner', function() {
      assert.lengthOf(wrapper.find('.loading'), 1);
    });
  });
});
