import React from 'react';
import {shallow} from 'enzyme';

import GithubTabHeaderController from '../../lib/controllers/github-tab-header-controller';
import {nullAuthor} from '../../lib/models/author';
import {Disposable} from 'atom';

describe('GithubTabHeaderController', function() {
  function *createWorkdirs(workdirs) {
    for (const workdir of workdirs) {
      yield workdir;
    }
  }

  function buildApp(overrides) {
    const atomEnv = global.buildAtomEnvironment();

    const props = {
      config: atomEnv.config,
      user: nullAuthor,
      getCurrentWorkDirs: () => createWorkdirs([]),
      onDidUpdateRepo: () => new Disposable(),
      onDidChangeWorkDirs: () => new Disposable(),
      handleWorkDirSelect: () => null,
      ...overrides,
    };
    return (
      <GithubTabHeaderController
        {...props}
      />
    );
  }

  it('get currentWorkDirs initializes workdirs state', function() {
    const paths = ['should be equal'];
    const wrapper = shallow(buildApp({getCurrentWorkDirs: () => createWorkdirs(paths)}));
    assert.strictEqual(wrapper.state(['currentWorkDirs']).next().value, paths[0]);
  });

  it('calls onDidChangeWorkDirs after mount', function() {
    const onDidChangeWorkDirs = sinon.stub();
    onDidChangeWorkDirs.returns({dispose: () => {}});
    shallow(buildApp({onDidChangeWorkDirs}));
    assert.isTrue(onDidChangeWorkDirs.calledOnce);
  });

  it('does not call onDidChangeWorkDirs on update', function() {
    const onDidChangeWorkDirs = sinon.stub();
    onDidChangeWorkDirs.returns({dispose: () => {}});
    const wrapper = shallow(buildApp({onDidChangeWorkDirs}));
    wrapper.setProps({onDidChangeWorkDirs});
    assert.isTrue(onDidChangeWorkDirs.calledOnce);
  });

  it('calls onDidChangeWorkDirs on update to setup new listener', function() {
    let onDidChangeWorkDirs = () => { return {dispose: () => {}}; };
    const wrapper = shallow(buildApp({onDidChangeWorkDirs}));
    onDidChangeWorkDirs = sinon.stub();
    onDidChangeWorkDirs.returns({dispose: () => {}});
    wrapper.setProps({onDidChangeWorkDirs});
    assert.isTrue(onDidChangeWorkDirs.calledOnce);
  });

  it('calls onDidChangeWorkDirs on update and disposes old listener', function() {
    const disposeSpy = sinon.spy();
    let onDidChangeWorkDirs = () => ({dispose: disposeSpy});
    const wrapper = shallow(buildApp({onDidChangeWorkDirs}));
    onDidChangeWorkDirs = sinon.spy();
    wrapper.setProps({onDidChangeWorkDirs});
    assert.isTrue(onDidChangeWorkDirs.calledOnce);
    assert.isTrue(disposeSpy.calledOnce);
  });

  it('updates workdirs', function() {
    let getCurrentWorkDirs = () => createWorkdirs([]);
    getCurrentWorkDirs = sinon.spy(getCurrentWorkDirs);
    const wrapper = shallow(buildApp({getCurrentWorkDirs}));
    wrapper.instance().resetWorkDirs();
    assert.isTrue(getCurrentWorkDirs.calledTwice);
  });

  it('disposes on unmount', function() {
    const disposeSpy = sinon.spy();
    const onDidChangeWorkDirs = () => ({dispose: disposeSpy});
    const wrapper = shallow(buildApp({onDidChangeWorkDirs}));
    wrapper.unmount();
    assert.isTrue(disposeSpy.calledOnce);
  });

  it('unmounts without error', function() {
    const wrapper = shallow(buildApp());
    wrapper.unmount();
    assert.strictEqual(wrapper.children().length, 0);
  });

  describe('disableProjectSelection', function() {
    const configKey = 'github.useProjectFromActivePanel';

    it('initializes from config when true', function() {
      const atomEnv = global.buildAtomEnvironment();
      atomEnv.config.set(configKey, true);
      const wrapper = shallow(buildApp({config: atomEnv.config}));
      assert.strictEqual(wrapper.state('disableProjectSelection'), true);
    });

    it('initializes from config when false', function() {
      const atomEnv = global.buildAtomEnvironment();
      atomEnv.config.set(configKey, false);
      const wrapper = shallow(buildApp({config: atomEnv.config}));
      assert.strictEqual(wrapper.state('disableProjectSelection'), false);
    });

    it('updates state when config changes', function() {
      const atomEnv = global.buildAtomEnvironment();
      atomEnv.config.set(configKey, true);
      const wrapper = shallow(buildApp({config: atomEnv.config}));
      assert.strictEqual(wrapper.state('disableProjectSelection'), true);

      atomEnv.config.set(configKey, false);
      assert.strictEqual(wrapper.state('disableProjectSelection'), false);

      atomEnv.config.set(configKey, true);
      assert.strictEqual(wrapper.state('disableProjectSelection'), true);
    });
  });
});
