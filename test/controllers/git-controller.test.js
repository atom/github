import path from 'path';
import fs from 'fs';

import React from 'react';
import {shallow} from 'enzyme';

import {cloneRepository, buildRepository} from '../helpers';

import GitController from '../../lib/controllers/git-controller';

describe('GitController', function() {
  let atomEnv, workspace, commandRegistry, notificationManager, app;

  beforeEach(function() {
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

  afterEach(function() {
    atomEnv.destroy();
  });

  describe('showMergeConflictFileForPath(relativeFilePath, {focus} = {})', function() {
    it('opens the file as a pending pane item if it exists', async function() {
      const workdirPath = await cloneRepository('merge-conflict');
      const repository = await buildRepository(workdirPath);
      sinon.spy(workspace, 'open');
      app = React.cloneElement(app, {repository});
      const wrapper = shallow(app);
      await wrapper.instance().showMergeConflictFileForPath('added-to-both.txt');

      assert.equal(workspace.open.callCount, 1);
      assert.deepEqual(workspace.open.args[0], [path.join(workdirPath, 'added-to-both.txt'), {activatePane: false, pending: true}]);
    });

    describe('when the file doesn\'t exist', function() {
      it('shows an info notification and does not open the file', async function() {
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

  describe('diveIntoMergeConflictFileForPath(relativeFilePath)', function() {
    it('opens the file and focuses the pane', async function() {
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

  describe('rendering a FilePatch', function() {
    it('renders the FilePatchController based on state', async function() {
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

  describe('showFilePatchForPath(filePath, staged, {amending, activate})', function() {
    describe('when a file is selected in the staging panel', function() {
      it('sets appropriate state', async function() {
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

    describe('when there is a change to the repo', function() {
      it('calls onRepoRefresh', async function() {
        const workdirPath = await cloneRepository('multiple-commits');
        const repository = await buildRepository(workdirPath);

        fs.writeFileSync(path.join(workdirPath, 'file.txt'), 'change', 'utf8');

        app = React.cloneElement(app, {repository});
        const wrapper = shallow(app);

        sinon.spy(wrapper.instance(), 'onRepoRefresh');
        repository.refresh();
        await wrapper.instance().repositoryObserver.getLastModelDataRefreshPromise();
        assert.isTrue(wrapper.instance().onRepoRefresh.called);
      });
    });

    describe('#onRepoRefresh', function() {
      it('sets the correct FilePatch as state', async function() {
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
        repository.refresh();
        await wrapper.instance().onRepoRefresh();

        assert.equal(wrapper.state('filePath'), 'file.txt');
        assert.equal(wrapper.state('filePatch').getPath(), 'file.txt');
        assert.equal(wrapper.state('stagingStatus'), 'unstaged');
        assert.notEqual(originalFilePatch, wrapper.state('filePatch'));
      });
    });
  });

  describe('diveIntoFilePatchForPath(filePath, staged, {amending, activate})', function() {
    it('reveals and focuses the file patch', async function() {
      const workdirPath = await cloneRepository('three-files');
      const repository = await buildRepository(workdirPath);

      fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'change', 'utf8');
      repository.refresh();

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

  describe('when amend mode is toggled in the staging panel while viewing a staged change', function() {
    it('refetches the FilePatch with the amending flag toggled', async function() {
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

  describe('when the StatusBarTileController calls toggleGitPanel', function() {
    it('toggles the git panel', async function() {
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

  describe('toggleGitPanel()', function() {
    it('toggles the visibility of the Git panel', async function() {
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

  describe('toggleGitPanelFocus()', function() {
    let wrapper;

    beforeEach(async function() {
      const workdirPath = await cloneRepository('multiple-commits');
      const repository = await buildRepository(workdirPath);

      app = React.cloneElement(app, {repository});
      wrapper = shallow(app);

      sinon.stub(wrapper.instance(), 'focusGitPanel');
      sinon.spy(workspace.getActivePane(), 'activate');
    });

    it('opens and focuses the Git panel when it is initially closed', function() {
      assert.isFalse(wrapper.find('Panel').prop('visible'));
      sinon.stub(wrapper.instance(), 'gitPanelHasFocus').returns(false);

      wrapper.instance().toggleGitPanelFocus();

      assert.isTrue(wrapper.find('Panel').prop('visible'));
      assert.equal(wrapper.instance().focusGitPanel.callCount, 1);
      assert.isFalse(workspace.getActivePane().activate.called);
    });

    it('focuses the Git panel when it is already open, but blurred', function() {
      wrapper.instance().toggleGitPanel();
      sinon.stub(wrapper.instance(), 'gitPanelHasFocus').returns(false);

      assert.isTrue(wrapper.find('Panel').prop('visible'));

      wrapper.instance().toggleGitPanelFocus();

      assert.isTrue(wrapper.find('Panel').prop('visible'));
      assert.equal(wrapper.instance().focusGitPanel.callCount, 1);
      assert.isFalse(workspace.getActivePane().activate.called);
    });

    it('blurs the Git panel when it is already open and focused', function() {
      wrapper.instance().toggleGitPanel();
      sinon.stub(wrapper.instance(), 'gitPanelHasFocus').returns(true);

      assert.isTrue(wrapper.find('Panel').prop('visible'));

      wrapper.instance().toggleGitPanelFocus();

      assert.isTrue(wrapper.find('Panel').prop('visible'));
      assert.equal(wrapper.instance().focusGitPanel.callCount, 0);
      assert.isTrue(workspace.getActivePane().activate.called);
    });
  });

  describe('ensureGitPanel()', function() {
    let wrapper;

    beforeEach(async function() {
      const workdirPath = await cloneRepository('multiple-commits');
      const repository = await buildRepository(workdirPath);

      app = React.cloneElement(app, {repository});
      wrapper = shallow(app);
    });

    it('opens the Git panel when it is initially closed', async function() {
      assert.isFalse(wrapper.find('Panel').prop('visible'));
      assert.isTrue(await wrapper.instance().ensureGitPanel());
    });

    it('does nothing when the Git panel is already open', async function() {
      wrapper.instance().toggleGitPanel();
      assert.isTrue(wrapper.find('Panel').prop('visible'));
      assert.isFalse(await wrapper.instance().ensureGitPanel());
      assert.isTrue(wrapper.find('Panel').prop('visible'));
    });
  });

  it('correctly updates state when switching repos', async function() {
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

  describe('openFiles(filePaths)', () => {
    it('calls workspace.open, passing pending:true if only one file path is passed', async () => {
      const workdirPath = await cloneRepository('three-files');
      const repository = await buildRepository(workdirPath);

      fs.writeFileSync(path.join(workdirPath, 'file1.txt'), 'foo');
      fs.writeFileSync(path.join(workdirPath, 'file2.txt'), 'bar');
      fs.writeFileSync(path.join(workdirPath, 'file3.txt'), 'baz');

      sinon.stub(workspace, 'open');
      app = React.cloneElement(app, {repository});
      const wrapper = shallow(app);
      await wrapper.instance().openFiles(['file1.txt']);

      assert.equal(workspace.open.callCount, 1);
      assert.deepEqual(workspace.open.args[0], [path.join(repository.getWorkingDirectoryPath(), 'file1.txt'), {pending: true}]);

      workspace.open.reset();
      await wrapper.instance().openFiles(['file2.txt', 'file3.txt']);
      assert.equal(workspace.open.callCount, 2);
      assert.deepEqual(workspace.open.args[0], [path.join(repository.getWorkingDirectoryPath(), 'file2.txt'), {pending: false}]);
      assert.deepEqual(workspace.open.args[1], [path.join(repository.getWorkingDirectoryPath(), 'file3.txt'), {pending: false}]);
    });
  });

  describe('discardLines', () => {
    it('only discards lines if buffer is unmodified, otherwise notifies user', async () => {
      const workdirPath = await cloneRepository('three-files');
      const repository = await buildRepository(workdirPath);

      fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'modification\n');
      const unstagedFilePatch = await repository.getFilePatchForPath('a.txt');

      const editor = await workspace.open(path.join(workdirPath, 'a.txt'));

      app = React.cloneElement(app, {repository});
      const wrapper = shallow(app);
      const state = {
        filePath: 'a.txt',
        filePatch: unstagedFilePatch,
        stagingStatus: 'unstaged',
      };
      wrapper.setState(state);

      // unmodified buffer
      const discardChangesSpy = sinon.spy(wrapper.instance(), 'discardChangesInBuffer');
      const hunkLines = unstagedFilePatch.getHunks()[0].getLines();
      await wrapper.instance().discardLines(new Set(hunkLines.slice(0, 2)));
      assert.isTrue(discardChangesSpy.called);

      // modified buffer
      discardChangesSpy.reset();
      sinon.stub(notificationManager, 'addError');
      const buffer = editor.getBuffer();
      buffer.append('new line');
      await wrapper.instance().discardLines(new Set(unstagedFilePatch.getHunks()[0].getLines()));
      assert.isFalse(discardChangesSpy.called);
      assert.deepEqual(notificationManager.addError.args[0], ['Cannot discard lines.', {description: 'You have unsaved changes.'}]);
    });
  });
});
