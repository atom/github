import React from 'react';
import {mount} from 'enzyme';
import path from 'path';

import InitDialog from '../../lib/views/init-dialog';

describe('InitDialog', function() {
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
      <InitDialog
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
    wrapper.update();
  };

  it('defaults to your project home path', function() {
    const text = wrapper.find('atom-text-editor').getDOMNode().getModel().getText();
    assert.equal(text, path.join('home', 'me', 'codes'));
  });

  it('disables the initialize button with no project path', function() {
    setTextIn('.github-ProjectPath atom-text-editor', '');

    assert.isTrue(wrapper.find('button.icon-repo-create').prop('disabled'));
  });

  it('enables the initialize button when the project path is populated', function() {
    setTextIn('.github-ProjectPath atom-text-editor', path.join('somewhere', 'else'));

    assert.isFalse(wrapper.find('button.icon-repo-create').prop('disabled'));
  });

  it('calls the acceptance callback', function() {
    setTextIn('.github-ProjectPath atom-text-editor', '/somewhere/directory/');

    wrapper.find('button.icon-repo-create').simulate('click');

    assert.isTrue(didAccept.calledWith('/somewhere/directory/'));
  });

  it('calls the cancellation callback', function() {
    wrapper.find('button.github-CancelButton').simulate('click');
    assert.isTrue(didCancel.called);
  });
});
