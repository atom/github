import React from 'react';
import {shallow, mount} from 'enzyme';

import {cloneRepository, buildRepository} from '../helpers';
import GitTabView from '../../lib/views/git-tab-view';
import {gitTabViewProps} from '../fixtures/props/git-tab-props';

describe('GitTabView', function() {
  let atomEnv, repository;

  beforeEach(async function() {
    atomEnv = global.buildAtomEnvironment();
    repository = await buildRepository(await cloneRepository());
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  async function buildApp(overrides = {}) {
    return <GitTabView {...await gitTabViewProps(atomEnv, repository, overrides)} />;
  }

  it('remembers the current focus', async function() {
    const wrapper = mount(await buildApp());

    assert.strictEqual(
      wrapper.instance().rememberFocus({target: wrapper.find('div.github-StagingView').getDOMNode()}),
      GitTabView.focus.STAGING,
    );

    assert.strictEqual(
      wrapper.instance().rememberFocus({target: wrapper.find('atom-text-editor').getDOMNode()}),
      GitTabView.focus.EDITOR,
    );

    assert.isNull(wrapper.instance().rememberFocus({target: document.body}));
  });

  it('sets a new focus', async function() {
    const wrapper = mount(await buildApp());
    const stagingElement = wrapper.find('div.github-StagingView').getDOMNode();
    const editorElement = wrapper.find('atom-text-editor').getDOMNode();

    sinon.spy(stagingElement, 'focus');
    assert.isTrue(wrapper.instance().setFocus(GitTabView.focus.STAGING));
    assert.isTrue(stagingElement.focus.called);

    sinon.spy(editorElement, 'focus');
    assert.isTrue(wrapper.instance().setFocus(GitTabView.focus.EDITOR));
    assert.isTrue(editorElement.focus.called);

    assert.isFalse(wrapper.instance().setFocus(Symbol('nah')));
  });

  it('blurs by focusing the workspace center', async function() {
    const editor = await atomEnv.workspace.open(__filename);
    atomEnv.workspace.getLeftDock().activate();
    assert.notStrictEqual(atomEnv.workspace.getActivePaneItem(), editor);

    const wrapper = shallow(await buildApp());
    wrapper.instance().blur();

    assert.strictEqual(atomEnv.workspace.getActivePaneItem(), editor);
  });

  it('no-ops focus management methods when refs are unavailable', async function() {
    const wrapper = shallow(await buildApp());
    assert.isNull(wrapper.instance().rememberFocus({}));
    assert.isFalse(wrapper.instance().setFocus(GitTabView.focus.EDITOR));
  });

  describe('advanceFocus', function() {
    let wrapper, event, commitController, stagingView;

    beforeEach(async function() {
      wrapper = mount(await buildApp());

      commitController = wrapper.instance().refCommitController.get();
      stagingView = wrapper.prop('refStagingView').get();

      event = {stopPropagation: sinon.spy()};
    });

    it('does nothing if the commit controller has focus', async function() {
      sinon.stub(commitController, 'hasFocus').returns(true);
      sinon.spy(stagingView, 'activateNextList');

      await wrapper.instance().advanceFocus(event);

      assert.isFalse(event.stopPropagation.called);
      assert.isFalse(stagingView.activateNextList.called);
    });

    it('activates the next staging view list and stops', async function() {
      sinon.stub(stagingView, 'activateNextList').resolves(true);
      sinon.spy(commitController, 'setFocus');

      await wrapper.instance().advanceFocus(event);

      assert.isTrue(stagingView.activateNextList.called);
      assert.isTrue(event.stopPropagation.called);
      assert.isFalse(commitController.setFocus.called);
    });

    it('moves focus to the commit message editor from the end of the staging view', async function() {
      sinon.stub(stagingView, 'activateNextList').resolves(false);
      sinon.stub(commitController, 'setFocus').returns(true);

      await wrapper.instance().advanceFocus(event);

      assert.isTrue(commitController.setFocus.calledWith(GitTabView.focus.EDITOR));
      assert.isTrue(event.stopPropagation.called);
    });

    it('does nothing if refs are unavailable', async function() {
      wrapper.instance().refCommitController.setter(null);

      await wrapper.instance().advanceFocus(event);

      assert.isFalse(event.stopPropagation.called);
    });
  });

  describe('retreatFocus', function() {
    let wrapper, event, commitController, stagingView;

    beforeEach(async function() {
      wrapper = mount(await buildApp());

      commitController = wrapper.instance().refCommitController.get();
      stagingView = wrapper.prop('refStagingView').get();

      event = {stopPropagation: sinon.spy()};
    });

    it('focuses the last staging list if the commit editor has focus', async function() {
      sinon.stub(commitController, 'hasFocus').returns(true);
      sinon.stub(commitController, 'hasFocusEditor').returns(true);
      sinon.stub(stagingView, 'activateLastList').resolves(true);

      await wrapper.instance().retreatFocus(event);

      assert.isTrue(stagingView.activateLastList.called);
      assert.isTrue(event.stopPropagation.called);
    });

    it('does nothing if the commit controller has focus but not in its editor', async function() {
      sinon.stub(commitController, 'hasFocus').returns(true);
      sinon.stub(commitController, 'hasFocusEditor').returns(false);
      sinon.spy(stagingView, 'activateLastList');
      sinon.spy(stagingView, 'activatePreviousList');

      await wrapper.instance().retreatFocus(event);

      assert.isFalse(stagingView.activateLastList.called);
      assert.isFalse(stagingView.activatePreviousList.called);
      assert.isFalse(event.stopPropagation.called);
    });

    it('activates the previous staging list and stops', async function() {
      sinon.stub(commitController, 'hasFocus').returns(false);
      sinon.stub(stagingView, 'activatePreviousList').resolves(true);

      await wrapper.instance().retreatFocus(event);

      assert.isTrue(stagingView.activatePreviousList.called);
      assert.isTrue(event.stopPropagation.called);
    });

    it('does nothing if refs are unavailable', async function() {
      wrapper.instance().refCommitController.setter(null);
      wrapper.prop('refStagingView').setter(null);

      await wrapper.instance().retreatFocus(event);

      assert.isFalse(event.stopPropagation.called);
    });
  });

  it('selects a staging item', async function() {
    const wrapper = mount(await buildApp({
      unstagedChanges: [{filePath: 'aaa.txt', status: 'modified'}],
    }));

    const stagingView = wrapper.prop('refStagingView').get();
    sinon.spy(stagingView, 'quietlySelectItem');
    sinon.spy(stagingView, 'setFocus');

    await wrapper.instance().quietlySelectItem('aaa.txt', 'unstaged');

    assert.isTrue(stagingView.quietlySelectItem.calledWith('aaa.txt', 'unstaged'));
    assert.isFalse(stagingView.setFocus.calledWith(GitTabView.focus.STAGING));
  });

  it('selects a staging item and focuses itself', async function() {
    const wrapper = mount(await buildApp({
      unstagedChanges: [{filePath: 'aaa.txt', status: 'modified'}],
    }));

    const stagingView = wrapper.prop('refStagingView').get();
    sinon.spy(stagingView, 'quietlySelectItem');
    sinon.spy(stagingView, 'setFocus');

    await wrapper.instance().focusAndSelectStagingItem('aaa.txt', 'unstaged');

    assert.isTrue(stagingView.quietlySelectItem.calledWith('aaa.txt', 'unstaged'));
    assert.isTrue(stagingView.setFocus.calledWith(GitTabView.focus.STAGING));
  });

  it('detects when it has focus', async function() {
    const wrapper = mount(await buildApp());
    const rootElement = wrapper.prop('refRoot').get();
    sinon.stub(rootElement, 'contains');

    rootElement.contains.returns(true);
    assert.isTrue(wrapper.instance().hasFocus());

    rootElement.contains.returns(false);
    assert.isFalse(wrapper.instance().hasFocus());

    rootElement.contains.returns(true);
    wrapper.prop('refRoot').setter(null);
    assert.isFalse(wrapper.instance().hasFocus());
  });
});
