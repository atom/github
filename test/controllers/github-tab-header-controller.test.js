import React from 'react';
import {shallow} from 'enzyme';

import GithubTabHeaderController from '../../lib/controllers/github-tab-header-controller';
import {nullAuthor} from '../../lib/models/author';

import {buildRepository, cloneRepository} from '../helpers';

describe.only('GithubTabHeaderController', function() {

  function buildApp(overrides) {
    const props = {
      user: nullAuthor,
      getCurrentWorkDirs: () => null,
      ...overrides,
    };
    return (
      <GithubTabHeaderController
        {...props}
      />
    );
  }

  it('get currentWorkDirs initializes workdirs state', function() {
    const paths = ['should be equal']
    const wrapper = shallow(buildApp({getCurrentWorkDirs: () => paths}));
    assert.strictEqual(wrapper.state(['currentWorkDirs'])[0], paths[0]);
  });

  it('calls onDidChangeWorkDirs after mount', function() {
    const onDidChangeWorkDirs = sinon.spy();
    const wrapper = shallow(buildApp({onDidChangeWorkDirs}));
    assert.isTrue(onDidChangeWorkDirs.calledOnce);
  });

  it('does not call onDidChangeWorkDirs on update', function() {
    let onDidChangeWorkDirs = sinon.spy();
    const wrapper = shallow(buildApp({onDidChangeWorkDirs}));
    wrapper.setProps({onDidChangeWorkDirs});
    assert.isTrue(onDidChangeWorkDirs.calledOnce);
  });

  it('calls onDidChangeWorkDirs on update to setup new listener', function() {
    let onDidChangeWorkDirs = () => null;
    const wrapper = shallow(buildApp({onDidChangeWorkDirs}));
    onDidChangeWorkDirs = sinon.spy();
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

  it('disposes old listener and clears disposable on update', function() {
    const disposeSpy = sinon.spy();
    let onDidChangeWorkDirs = () => ({dispose: disposeSpy});
    const wrapper = shallow(buildApp({onDidChangeWorkDirs}));
    onDidChangeWorkDirs = null;
    wrapper.setProps({onDidChangeWorkDirs});
    assert.strictEqual(wrapper.instance().disposable, undefined);
    assert.isTrue(disposeSpy.calledOnce);
  });

  it('updates workdirs', function() {
    const getCurrentWorkDirs = sinon.spy();
    const wrapper = shallow(buildApp({getCurrentWorkDirs}));
    wrapper.instance().updateWorkDirs();
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
});
