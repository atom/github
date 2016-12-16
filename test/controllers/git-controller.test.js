/** @babel */

import path from 'path';
import fs from 'fs';

import React from 'react';
import {shallow} from 'enzyme';

import {cloneRepository, buildRepository} from '../helpers';

import GitController from '../../lib/controllers/git-controller';

describe('GitController', () => {
  let atomEnv, workspace, commandRegistry, notificationManager, app;

  beforeEach(() => {
    atomEnv = global.buildAtomEnvironment();
    workspace = atomEnv.workspace;
    commandRegistry = atomEnv.commands;
    notificationManager = atomEnv.notifications;
    app = (
      <GitController
        workspace={workspace}
        commandRegistry={commandRegistry}
        notificationManager={notificationManager}
      />
    );
  });

  afterEach(() => {
    atomEnv.destroy();
  });

  describe('showMergeConflictFileForPath(relativeFilePath, {focus} = {})', () => {
    it('opens the file as a pending pane item if it exists', async () => {
      const workdirPath = await cloneRepository('merge-conflict');
      const repository = await buildRepository(workdirPath);
      sinon.spy(workspace, 'open');
      app = React.cloneElement(app, {repository});
      const wrapper = shallow(app);
      await wrapper.instance().showMergeConflictFileForPath('added-to-both.txt');

      assert.equal(workspace.open.callCount, 1);
      assert.deepEqual(workspace.open.args[0], [path.join(workdirPath, 'added-to-both.txt'), {activatePane: false, pending: true}]);
    });

    describe('when the file doesn\'t exist', () => {
      it('shows an info notification and does not open the file', async () => {
        const workdirPath = await cloneRepository('merge-conflict');
        const repository = await buildRepository(workdirPath);
        fs.unlinkSync(path.join(workdirPath, 'added-to-both.txt'));

        sinon.spy(notificationManager, 'addInfo');
        sinon.spy(workspace, 'open');
        app = React.cloneElement(app, {repository});
        const wrapper = shallow(app);

        assert.equal(notificationManager.getNotifications().length, 0);
        await wrapper.instance().showMergeConflictFileForPath('added-to-both.txt');
        assert.equal(workspace.open.callCount, 0);
        assert.equal(notificationManager.addInfo.callCount, 1);
        assert.deepEqual(notificationManager.addInfo.args[0], ['File has been deleted.']);
      });
    });
  });

  describe('diveIntoMergeConflictFileForPath(relativeFilePath)', () => {
    it('opens the file and focuses the pane', async () => {
      const workdirPath = await cloneRepository('merge-conflict');
      const repository = await buildRepository(workdirPath);
      sinon.spy(workspace, 'open');
      app = React.cloneElement(app, {repository});
      const wrapper = shallow(app);

      await wrapper.instance().diveIntoMergeConflictFileForPath('added-to-both.txt');

      assert.equal(workspace.open.callCount, 1);
      assert.deepEqual(workspace.open.args[0], [path.join(workdirPath, 'added-to-both.txt'), {activatePane: true, pending: true}]);
    });
  });

  describe('rendering a FilePatch', () => {
    it('renders the FilePatchController based on state', async () => {
      const workdirPath = await cloneRepository('three-files');
      const repository = await buildRepository(workdirPath);
      app = React.cloneElement(app, {repository});
      const wrapper = shallow(app);

      wrapper.setState({
        filePath: null,
        filePatch: null,
        stagingStatus: null,
      });
      assert.equal(wrapper.find('FilePatchController').length, 0);

      const state = {
        filePath: 'path',
        filePatch: Symbol('filePatch'),
        stagingStatus: 'stagingStatus',
      };
      wrapper.setState(state);
      assert.equal(wrapper.find('FilePatchController').length, 1);
      assert.equal(wrapper.find('PaneItem').length, 1);
      assert.equal(wrapper.find('PaneItem FilePatchController').length, 1);
      assert.equal(wrapper.find('FilePatchController').prop('filePatch'), state.filePatch);
      assert.equal(wrapper.find('FilePatchController').prop('stagingStatus'), state.stagingStatus);
      assert.equal(wrapper.find('FilePatchController').prop('repository'), app.props.repository);
    });
  });

  describe('showFilePatchForPath(filePath, staged, {amending, activate})', () => {
    describe('when a file is selected in the staging panel', () => {
      it('sets appropriate state', async () => {
        const workdirPath = await cloneRepository('three-files');
        const repository = await buildRepository(workdirPath);

        fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'change', 'utf8');
        fs.writeFileSync(path.join(workdirPath, 'd.txt'), 'new-file', 'utf8');
        await repository.stageFiles(['d.txt']);

        app = React.cloneElement(app, {repository});
        const wrapper = shallow(app);

        await wrapper.instance().showFilePatchForPath('a.txt', 'unstaged');

        assert.equal(wrapper.state('filePath'), 'a.txt');
        assert.equal(wrapper.state('filePatch').getPath(), 'a.txt');
        assert.equal(wrapper.state('stagingStatus'), 'unstaged');

        await wrapper.instance().showFilePatchForPath('d.txt', 'staged');

        assert.equal(wrapper.state('filePath'), 'd.txt');
        assert.equal(wrapper.state('filePatch').getPath(), 'd.txt');
        assert.equal(wrapper.state('stagingStatus'), 'staged');

        wrapper.find('PaneItem').prop('onDidCloseItem')();
        assert.isNull(wrapper.state('filePath'));
        assert.isNull(wrapper.state('filePatch'));
        assert.isNull(wrapper.state('stagingStatus'));

        const activate = sinon.stub();
        wrapper.instance().filePatchControllerPane = {activate};
        await wrapper.instance().showFilePatchForPath('d.txt', 'staged', {activate: true});
        assert.equal(activate.callCount, 1);
      });
    });

    describe('when there is a change to the repo', () => {
      it('calls onRepoRefresh', async () => {
        const workdirPath = await cloneRepository('multiple-commits');
        const repository = await buildRepository(workdirPath);

        fs.writeFileSync(path.join(workdirPath, 'file.txt'), 'change', 'utf8');

        app = React.cloneElement(app, {repository});
        const wrapper = shallow(app);

        sinon.spy(wrapper.instance(), 'onRepoRefresh');
        await repository.refresh();
        assert(wrapper.instance().onRepoRefresh.called);
      });
    });

    describe('#onRepoRefresh', () => {
      it('sets the correct FilePatch as state', async () => {
        const workdirPath = await cloneRepository('multiple-commits');
        const repository = await buildRepository(workdirPath);

        fs.writeFileSync(path.join(workdirPath, 'file.txt'), 'change', 'utf8');

        app = React.cloneElement(app, {repository});
        const wrapper = shallow(app);

        await wrapper.instance().showFilePatchForPath('file.txt', 'unstaged', {activate: true});

        const originalFilePatch = wrapper.state('filePatch');
        assert.equal(wrapper.state('filePath'), 'file.txt');
        assert.equal(wrapper.state('filePatch').getPath(), 'file.txt');
        assert.equal(wrapper.state('stagingStatus'), 'unstaged');

        fs.writeFileSync(path.join(workdirPath, 'file.txt'), 'change\nand again!', 'utf8');
        await repository.refresh();
        await wrapper.instance().onRepoRefresh();

        assert.equal(wrapper.state('filePath'), 'file.txt');
        assert.equal(wrapper.state('filePatch').getPath(), 'file.txt');
        assert.equal(wrapper.state('stagingStatus'), 'unstaged');
        assert.notEqual(originalFilePatch, wrapper.state('filePatch'));
      });
    });
  });

  describe('diveIntoFilePatchForPath(filePath, staged, {amending, activate})', () => {
    it('reveals and focuses the file patch', async () => {
      const workdirPath = await cloneRepository('three-files');
      const repository = await buildRepository(workdirPath);

      fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'change', 'utf8');
      await repository.refresh();

      app = React.cloneElement(app, {repository});
      const wrapper = shallow(app);

      const focusFilePatch = sinon.spy();
      wrapper.instance().filePatchController = {
        getWrappedComponent: () => {
          return {focus: focusFilePatch};
        },
      };

      await wrapper.instance().diveIntoFilePatchForPath('a.txt', 'unstaged');

      assert.equal(wrapper.state('filePath'), 'a.txt');
      assert.equal(wrapper.state('filePatch').getPath(), 'a.txt');
      assert.equal(wrapper.state('stagingStatus'), 'unstaged');

      assert.isTrue(focusFilePatch.called);
    });
  });

  describe('when amend mode is toggled in the staging panel while viewing a staged change', () => {
    it('refetches the FilePatch with the amending flag toggled', async () => {
      const workdirPath = await cloneRepository('multiple-commits');
      const repository = await buildRepository(workdirPath);

      app = React.cloneElement(app, {repository});
      const wrapper = shallow(app);

      fs.writeFileSync(path.join(workdirPath, 'file.txt'), 'change', 'utf8');
      await wrapper.instance().showFilePatchForPath('file.txt', 'unstaged', {amending: false});
      const originalFilePatch = wrapper.state('filePatch');
      assert.isOk(originalFilePatch);

      sinon.spy(wrapper.instance(), 'showFilePatchForPath');
      await wrapper.instance().didChangeAmending(true);
      assert.isTrue(wrapper.instance().showFilePatchForPath.args[0][2].amending);
    });
  });

  describe('when the StatusBarTileController calls toggleGitPanel', () => {
    it('toggles the git panel', async () => {
      const workdirPath = await cloneRepository('multiple-commits');
      const repository = await buildRepository(workdirPath);

      app = React.cloneElement(app, {repository});
      const wrapper = shallow(app);

      assert.isFalse(wrapper.find('Panel').prop('visible'));
      wrapper.find('StatusBarTileController').prop('toggleGitPanel')();
      assert.isTrue(wrapper.find('Panel').prop('visible'));
      wrapper.find('StatusBarTileController').prop('toggleGitPanel')();
      assert.isFalse(wrapper.find('Panel').prop('visible'));
    });
  });

  describe('toggleGitPanel()', () => {
    it('toggles the visibility of the Git panel', async () => {
      const workdirPath = await cloneRepository('multiple-commits');
      const repository = await buildRepository(workdirPath);

      app = React.cloneElement(app, {repository});
      const wrapper = shallow(app);

      assert.isFalse(wrapper.find('Panel').prop('visible'));
      wrapper.instance().toggleGitPanel();
      assert.isTrue(wrapper.find('Panel').prop('visible'));
      wrapper.instance().toggleGitPanel();
      assert.isFalse(wrapper.find('Panel').prop('visible'));
    });
  });

  describe('toggleGitPanelFocus()', () => {
    let wrapper;

    beforeEach(async () => {
      const workdirPath = await cloneRepository('multiple-commits');
      const repository = await buildRepository(workdirPath);

      app = React.cloneElement(app, {repository});
      wrapper = shallow(app);

      sinon.stub(wrapper.instance(), 'focusGitPanel');
      sinon.spy(workspace.getActivePane(), 'activate');
    });

    it('opens and focuses the Git panel when it is initially closed', () => {
      assert.isFalse(wrapper.find('Panel').prop('visible'));
      sinon.stub(wrapper.instance(), 'gitPanelHasFocus').returns(false);

      wrapper.instance().toggleGitPanelFocus();

      assert.isTrue(wrapper.find('Panel').prop('visible'));
      assert.equal(wrapper.instance().focusGitPanel.callCount, 1);
      assert.isFalse(workspace.getActivePane().activate.called);
    });

    it('focuses the Git panel when it is already open, but blurred', () => {
      wrapper.instance().toggleGitPanel();
      sinon.stub(wrapper.instance(), 'gitPanelHasFocus').returns(false);

      assert.isTrue(wrapper.find('Panel').prop('visible'));

      wrapper.instance().toggleGitPanelFocus();

      assert.isTrue(wrapper.find('Panel').prop('visible'));
      assert.equal(wrapper.instance().focusGitPanel.callCount, 1);
      assert.isFalse(workspace.getActivePane().activate.called);
    });

    it('blurs the Git panel when it is already open and focused', () => {
      wrapper.instance().toggleGitPanel();
      sinon.stub(wrapper.instance(), 'gitPanelHasFocus').returns(true);

      assert.isTrue(wrapper.find('Panel').prop('visible'));

      wrapper.instance().toggleGitPanelFocus();

      assert.isTrue(wrapper.find('Panel').prop('visible'));
      assert.equal(wrapper.instance().focusGitPanel.callCount, 0);
      assert.isTrue(workspace.getActivePane().activate.called);
    });
  });

  it('correctly updates state when switching repos', async () => {
    const workdirPath1 = await cloneRepository('three-files');
    const repository1 = await buildRepository(workdirPath1);
    const workdirPath2 = await cloneRepository('three-files');
    const repository2 = await buildRepository(workdirPath2);

    app = React.cloneElement(app, {repository: repository1});
    const wrapper = shallow(app);

    assert.equal(wrapper.state('amending'), false);

    wrapper.setState({amending: true});
    wrapper.setProps({repository: repository2});
    assert.equal(wrapper.state('amending'), false);

    wrapper.setProps({repository: repository1});
    assert.equal(wrapper.state('amending'), true);
  });
});
