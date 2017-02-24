import path from 'path';
import fs from 'fs';

import React from 'react';
import {shallow} from 'enzyme';

import {cloneRepository, buildRepository} from '../helpers';

import GitController from '../../lib/controllers/git-controller';

describe('GitController', function() {
  let atomEnv, workspace, commandRegistry, notificationManager, confirm, tooltips, app;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
    workspace = atomEnv.workspace;
    commandRegistry = atomEnv.commands;
    notificationManager = atomEnv.notifications;
    confirm = sinon.stub(atomEnv, 'confirm');
    tooltips = atomEnv.tooltips;
    app = (
      <GitController
        workspace={workspace}
        commandRegistry={commandRegistry}
        notificationManager={notificationManager}
        confirm={confirm}
        tooltips={tooltips}
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
        filePatch: {getPath: () => 'path.txt'},
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

    // https://github.com/atom/github/issues/505
    it('calls repository.getFilePatchForPath with amending: true only if staging status is staged', async () => {
      const workdirPath = await cloneRepository('three-files');
      const repository = await buildRepository(workdirPath);

      app = React.cloneElement(app, {repository});
      const wrapper = shallow(app);

      sinon.stub(repository, 'getFilePatchForPath');
      await wrapper.instance().showFilePatchForPath('a.txt', 'unstaged', {amending: true});
      assert.equal(repository.getFilePatchForPath.callCount, 1);
      assert.deepEqual(repository.getFilePatchForPath.args[0], ['a.txt', {staged: false, amending: false}]);
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
      wrapper.find('ObserveModel(StatusBarTileController)').prop('toggleGitPanel')();
      assert.isTrue(wrapper.find('Panel').prop('visible'));
      wrapper.find('ObserveModel(StatusBarTileController)').prop('toggleGitPanel')();
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

  describe('discarding and restoring changed lines', () => {
    describe('discardLines(lines)', () => {
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

        sinon.stub(repository, 'applyPatchToWorkdir');
        sinon.stub(notificationManager, 'addError');
        // unmodified buffer
        const hunkLines = unstagedFilePatch.getHunks()[0].getLines();
        await wrapper.instance().discardLines(new Set([hunkLines[0]]));
        assert.isTrue(repository.applyPatchToWorkdir.calledOnce);
        assert.isFalse(notificationManager.addError.called);

        // modified buffer
        repository.applyPatchToWorkdir.reset();
        editor.setText('modify contents');
        await wrapper.instance().discardLines(new Set(unstagedFilePatch.getHunks()[0].getLines()));
        assert.isFalse(repository.applyPatchToWorkdir.called);
        const notificationArgs = notificationManager.addError.args[0];
        assert.equal(notificationArgs[0], 'Cannot discard lines.');
        assert.match(notificationArgs[1].description, /You have unsaved changes in/);
      });
    });

    describe('discardWorkDirChangesForPaths(filePaths)', () => {
      it('only discards changes in files if all buffers are unmodified, otherwise notifies user', async () => {
        const workdirPath = await cloneRepository('three-files');
        const repository = await buildRepository(workdirPath);

        fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'do\n');
        fs.writeFileSync(path.join(workdirPath, 'b.txt'), 'ray\n');
        fs.writeFileSync(path.join(workdirPath, 'c.txt'), 'me\n');

        const editor = await workspace.open(path.join(workdirPath, 'a.txt'));

        app = React.cloneElement(app, {repository});
        const wrapper = shallow(app);

        sinon.stub(repository, 'discardWorkDirChangesForPaths');
        sinon.stub(notificationManager, 'addError');
        // unmodified buffer
        await wrapper.instance().discardWorkDirChangesForPaths(['a.txt', 'b.txt', 'c.txt']);
        assert.isTrue(repository.discardWorkDirChangesForPaths.calledOnce);
        assert.isFalse(notificationManager.addError.called);

        // modified buffer
        repository.discardWorkDirChangesForPaths.reset();
        editor.setText('modify contents');
        await wrapper.instance().discardWorkDirChangesForPaths(['a.txt', 'b.txt', 'c.txt']);
        assert.isFalse(repository.discardWorkDirChangesForPaths.called);
        const notificationArgs = notificationManager.addError.args[0];
        assert.equal(notificationArgs[0], 'Cannot discard changes in selected files.');
        assert.match(notificationArgs[1].description, /You have unsaved changes in.*a\.txt/);
      });
    });

    describe('undoLastDiscard(partialDiscardFilePath)', () => {
      describe('when partialDiscardFilePath is not null', () => {
        let unstagedFilePatch, repository, absFilePath, wrapper;
        beforeEach(async () => {
          const workdirPath = await cloneRepository('multi-line-file');
          repository = await buildRepository(workdirPath);

          absFilePath = path.join(workdirPath, 'sample.js');
          fs.writeFileSync(absFilePath, 'foo\nbar\nbaz\n');
          unstagedFilePatch = await repository.getFilePatchForPath('sample.js');

          app = React.cloneElement(app, {repository});
          wrapper = shallow(app);
          wrapper.setState({
            filePath: 'sample.js',
            filePatch: unstagedFilePatch,
            stagingStatus: 'unstaged',
          });
        });

        it('reverses last discard for file path', async () => {
          const contents1 = fs.readFileSync(absFilePath, 'utf8');
          await wrapper.instance().discardLines(new Set(unstagedFilePatch.getHunks()[0].getLines().slice(0, 2)));
          const contents2 = fs.readFileSync(absFilePath, 'utf8');
          assert.notEqual(contents1, contents2);
          await repository.refresh();
          unstagedFilePatch = await repository.getFilePatchForPath('sample.js');
          wrapper.setState({filePatch: unstagedFilePatch});
          await wrapper.instance().discardLines(new Set(unstagedFilePatch.getHunks()[0].getLines().slice(2, 4)));
          const contents3 = fs.readFileSync(absFilePath, 'utf8');
          assert.notEqual(contents2, contents3);

          await wrapper.instance().undoLastDiscard('sample.js');
          await assert.async.equal(fs.readFileSync(absFilePath, 'utf8'), contents2);
          await wrapper.instance().undoLastDiscard('sample.js');
          await assert.async.equal(fs.readFileSync(absFilePath, 'utf8'), contents1);
        });

        it('does not undo if buffer is modified', async () => {
          const contents1 = fs.readFileSync(absFilePath, 'utf8');
          await wrapper.instance().discardLines(new Set(unstagedFilePatch.getHunks()[0].getLines().slice(0, 2)));
          const contents2 = fs.readFileSync(absFilePath, 'utf8');
          assert.notEqual(contents1, contents2);

          // modify buffer
          const editor = await workspace.open(absFilePath);
          editor.getBuffer().append('new line');

          const expandBlobToFile = sinon.spy(repository, 'expandBlobToFile');
          sinon.stub(notificationManager, 'addError');

          await repository.refresh();
          unstagedFilePatch = await repository.getFilePatchForPath('sample.js');
          wrapper.setState({filePatch: unstagedFilePatch});
          await wrapper.instance().undoLastDiscard('sample.js');
          const notificationArgs = notificationManager.addError.args[0];
          assert.equal(notificationArgs[0], 'Cannot undo last discard.');
          assert.match(notificationArgs[1].description, /You have unsaved changes./);
          assert.isFalse(expandBlobToFile.called);
        });

        describe('when file content has changed since last discard', () => {
          it('successfully undoes discard if changes do not conflict', async () => {
            const contents1 = fs.readFileSync(absFilePath, 'utf8');
            await wrapper.instance().discardLines(new Set(unstagedFilePatch.getHunks()[0].getLines().slice(0, 2)));
            const contents2 = fs.readFileSync(absFilePath, 'utf8');
            assert.notEqual(contents1, contents2);

            // change file contents on disk in non-conflicting way
            const change = '\nchange file contents';
            fs.writeFileSync(absFilePath, contents2 + change);

            await repository.refresh();
            unstagedFilePatch = await repository.getFilePatchForPath('sample.js');
            wrapper.setState({filePatch: unstagedFilePatch});
            await wrapper.instance().undoLastDiscard('sample.js');

            await assert.async.equal(fs.readFileSync(absFilePath, 'utf8'), contents1 + change);
          });

          it('prompts user to continue if conflicts arise and proceeds based on user input', async () => {
            const contents1 = fs.readFileSync(absFilePath, 'utf8');
            await wrapper.instance().discardLines(new Set(unstagedFilePatch.getHunks()[0].getLines().slice(0, 2)));
            const contents2 = fs.readFileSync(absFilePath, 'utf8');
            assert.notEqual(contents1, contents2);

            // change file contents on disk in a conflicting way
            const change = '\nchange file contents';
            fs.writeFileSync(absFilePath, change + contents2);

            await repository.refresh();
            unstagedFilePatch = await repository.getFilePatchForPath('sample.js');
            wrapper.setState({filePatch: unstagedFilePatch});

            // click 'Cancel'
            confirm.returns(2);
            await wrapper.instance().undoLastDiscard('sample.js');
            assert.equal(confirm.callCount, 1);
            const confirmArg = confirm.args[0][0];
            assert.match(confirmArg.message, /Undoing will result in conflicts/);
            await assert.async.equal(fs.readFileSync(absFilePath, 'utf8'), change + contents2);

            // click 'Open in new buffer'
            confirm.returns(1);
            await wrapper.instance().undoLastDiscard('sample.js');
            assert.equal(confirm.callCount, 2);
            const activeEditor = workspace.getActiveTextEditor();
            assert.match(activeEditor.getFileName(), /sample.js-/);
            assert.isTrue(activeEditor.getText().includes('<<<<<<<'));
            assert.isTrue(activeEditor.getText().includes('>>>>>>>'));

            // click 'Proceed and resolve conflicts'
            confirm.returns(0);
            await wrapper.instance().undoLastDiscard('sample.js');
            assert.equal(confirm.callCount, 3);
            await assert.async.isTrue(fs.readFileSync(absFilePath, 'utf8').includes('<<<<<<<'));
            await assert.async.isTrue(fs.readFileSync(absFilePath, 'utf8').includes('>>>>>>>'));
          });
        });

        it('clears the discard history if the last blob is no longer valid', async () => {
          // this would occur in the case of garbage collection cleaning out the blob
          await wrapper.instance().discardLines(new Set(unstagedFilePatch.getHunks()[0].getLines().slice(0, 2)));
          await repository.refresh();
          unstagedFilePatch = await repository.getFilePatchForPath('sample.js');
          wrapper.setState({filePatch: unstagedFilePatch});
          const {beforeSha} = await wrapper.instance().discardLines(new Set(unstagedFilePatch.getHunks()[0].getLines().slice(2, 4)));

          // remove blob from git object store
          fs.unlinkSync(path.join(repository.getGitDirectoryPath(), 'objects', beforeSha.slice(0, 2), beforeSha.slice(2)));

          sinon.stub(notificationManager, 'addError');
          assert.equal(repository.getDiscardHistory('sample.js').length, 2);
          await wrapper.instance().undoLastDiscard('sample.js');
          const notificationArgs = notificationManager.addError.args[0];
          assert.equal(notificationArgs[0], 'Discard history has expired.');
          assert.match(notificationArgs[1].description, /Stale discard history has been deleted./);
          assert.equal(repository.getDiscardHistory('sample.js').length, 0);
        });
      });

      describe('when partialDiscardFilePath is falsey', () => {
        let repository, wrapper, pathA, pathB, pathC, getFileContents;
        beforeEach(async () => {
          const workdirPath = await cloneRepository('three-files');
          repository = await buildRepository(workdirPath);

          getFileContents = filePath => {
            try {
              return fs.readFileSync(filePath, 'utf8');
            } catch (e) {
              if (e.code === 'ENOENT') {
                return null;
              } else {
                throw e;
              }
            }
          };

          pathA = path.join(workdirPath, 'a.txt');
          pathB = path.join(workdirPath, 'b.txt');
          pathC = path.join(workdirPath, 'c.txt');
          fs.writeFileSync(pathA, [1, 2, 3, 4, 5, 6, 7, 8, 9].join('\n'));
          fs.writeFileSync(pathB, ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].join('\n'));
          fs.writeFileSync(pathC, ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].join('\n'));

          app = React.cloneElement(app, {repository});
          wrapper = shallow(app);
        });

        it('reverses last discard if there are no conflicts', async () => {
          const contents1 = {
            pathA: getFileContents(pathA),
            pathB: getFileContents(pathB),
            pathC: getFileContents(pathC),
          };
          await wrapper.instance().discardWorkDirChangesForPaths(['a.txt', 'b.txt']);
          const contents2 = {
            pathA: getFileContents(pathA),
            pathB: getFileContents(pathB),
            pathC: getFileContents(pathC),
          };
          assert.notDeepEqual(contents1, contents2);

          await wrapper.instance().discardWorkDirChangesForPaths(['c.txt']);
          const contents3 = {
            pathA: getFileContents(pathA),
            pathB: getFileContents(pathB),
            pathC: getFileContents(pathC),
          };
          assert.notDeepEqual(contents2, contents3);

          await wrapper.instance().undoLastDiscard();
          await assert.async.deepEqual({
            pathA: getFileContents(pathA),
            pathB: getFileContents(pathB),
            pathC: getFileContents(pathC),
          }, contents2);
          await wrapper.instance().undoLastDiscard();
          await assert.async.deepEqual({
            pathA: getFileContents(pathA),
            pathB: getFileContents(pathB),
            pathC: getFileContents(pathC),
          }, contents1);
        });

        it('does not undo if buffer is modified', async () => {
          await wrapper.instance().discardWorkDirChangesForPaths(['a.txt', 'b.txt', 'c.txt']);

          // modify buffers
          (await workspace.open(pathA)).getBuffer().append('stuff');
          (await workspace.open(pathB)).getBuffer().append('other stuff');

          const expandBlobToFile = sinon.spy(repository, 'expandBlobToFile');
          sinon.stub(notificationManager, 'addError');

          await wrapper.instance().undoLastDiscard();
          const notificationArgs = notificationManager.addError.args[0];
          assert.equal(notificationArgs[0], 'Cannot undo last discard.');
          assert.match(notificationArgs[1].description, /You have unsaved changes./);
          assert.match(notificationArgs[1].description, /a.txt/);
          assert.match(notificationArgs[1].description, /b.txt/);
          assert.notMatch(notificationArgs[1].description, /c.txt/);
          assert.isFalse(expandBlobToFile.called);
        });

        describe('when file content has changed since last discard', () => {
          it('successfully undoes discard if changes do not conflict', async () => {
            await repository.git.exec(['commit', '-am', 'commit files lengthy enough that changes don\'t conflict']);

            const originalContents = {
              pathA: getFileContents(pathA),
              pathB: getFileContents(pathB),
              pathC: getFileContents(pathC),
            };

            // add change to beginning of files
            fs.writeFileSync(pathA, 'change at beginning\n' + fs.readFileSync(pathA, 'utf8'));
            fs.writeFileSync(pathB, 'change at beginning\n' + fs.readFileSync(pathB, 'utf8'));
            fs.writeFileSync(pathC, 'change at beginning\n' + fs.readFileSync(pathC, 'utf8'));

            await wrapper.instance().discardWorkDirChangesForPaths(['a.txt', 'b.txt', 'c.txt']);

            // change file contents on disk in non-conflicting way
            fs.writeFileSync(pathA, fs.readFileSync(pathA, 'utf8') + 'change at end');
            fs.writeFileSync(pathB, fs.readFileSync(pathB, 'utf8') + 'change at end');
            fs.writeFileSync(pathC, fs.readFileSync(pathC, 'utf8') + 'change at end');

            await wrapper.instance().undoLastDiscard();

            await assert.async.deepEqual({
              pathA: getFileContents(pathA),
              pathB: getFileContents(pathB),
              pathC: getFileContents(pathC),
            }, {
              pathA: 'change at beginning\n' + originalContents.pathA + 'change at end',
              pathB: 'change at beginning\n' + originalContents.pathB + 'change at end',
              pathC: 'change at beginning\n' + originalContents.pathC + 'change at end',
            });
          });

          it('prompts user to continue if conflicts arise and proceeds based on user input, updating index to reflect files under conflict', async () => {
            await repository.git.exec(['commit', '-am', 'commit files lengthy enough that changes don\'t conflict']);

            // add change to beginning of files
            fs.writeFileSync(pathA, 'change at beginning\n' + fs.readFileSync(pathA, 'utf8'));
            fs.writeFileSync(pathB, 'change at beginning\n' + fs.readFileSync(pathB, 'utf8'));
            fs.writeFileSync(pathC, 'change at beginning\n' + fs.readFileSync(pathC, 'utf8'));

            await wrapper.instance().discardWorkDirChangesForPaths(['a.txt', 'b.txt', 'c.txt']);

            // two files are changed in a conflicting way
            fs.writeFileSync(pathA, 'conflicting change\n' + fs.readFileSync(pathA, 'utf8'));
            fs.writeFileSync(pathB, 'conflicting change\n' + fs.readFileSync(pathB, 'utf8'));
            fs.writeFileSync(pathC, fs.readFileSync(pathC, 'utf8') + 'change at end');

            const contentsAfterConflictingChange = {
              pathA: getFileContents(pathA),
              pathB: getFileContents(pathB),
              pathC: getFileContents(pathC),
            };

            // click 'Cancel'
            confirm.returns(2);
            await wrapper.instance().undoLastDiscard();
            await assert.async.equal(confirm.callCount, 1);
            const confirmArg = confirm.args[0][0];
            assert.match(confirmArg.message, /Undoing will result in conflicts/);
            await assert.async.deepEqual({
              pathA: getFileContents(pathA),
              pathB: getFileContents(pathB),
              pathC: getFileContents(pathC),
            }, contentsAfterConflictingChange);

            // click 'Open in new editors'
            confirm.returns(1);
            await wrapper.instance().undoLastDiscard();
            assert.equal(confirm.callCount, 2);
            const editors = workspace.getTextEditors().sort((a, b) => {
              const pA = a.getFileName();
              const pB = b.getFileName();
              if (pA < pB) { return -1; } else if (pA > pB) { return 1; } else { return 0; }
            });
            assert.equal(editors.length, 2);
            assert.match(editors[0].getFileName(), /a.txt-/);
            assert.isTrue(editors[0].getText().includes('<<<<<<<'));
            assert.isTrue(editors[0].getText().includes('>>>>>>>'));
            assert.match(editors[1].getFileName(), /b.txt-/);
            assert.isTrue(editors[1].getText().includes('<<<<<<<'));
            assert.isTrue(editors[1].getText().includes('>>>>>>>'));

            // click 'Proceed and resolve conflicts'
            confirm.returns(0);
            await wrapper.instance().undoLastDiscard();
            assert.equal(confirm.callCount, 3);
            const contentsAfterUndo = {
              pathA: getFileContents(pathA),
              pathB: getFileContents(pathB),
              pathC: getFileContents(pathC),
            };
            await assert.async.isTrue(contentsAfterUndo.pathA.includes('<<<<<<<'));
            await assert.async.isTrue(contentsAfterUndo.pathA.includes('>>>>>>>'));
            await assert.async.isTrue(contentsAfterUndo.pathB.includes('<<<<<<<'));
            await assert.async.isTrue(contentsAfterUndo.pathB.includes('>>>>>>>'));
            await assert.async.isFalse(contentsAfterUndo.pathC.includes('<<<<<<<'));
            await assert.async.isFalse(contentsAfterUndo.pathC.includes('>>>>>>>'));
            let unmergedFiles = await repository.git.exec(['diff', '--name-status', '--diff-filter=U']);
            unmergedFiles = unmergedFiles.trim().split('\n').map(line => line.split('\t')[1]);
            assert.deepEqual(unmergedFiles, ['a.txt', 'b.txt']);
          });
        });

        it('clears the discard history if the last blob is no longer valid', async () => {
          // this would occur in the case of garbage collection cleaning out the blob
          await wrapper.instance().discardWorkDirChangesForPaths(['a.txt', 'b.txt']);
          const snapshots = await wrapper.instance().discardWorkDirChangesForPaths(['c.txt']);
          const {beforeSha} = snapshots['c.txt'];

          // remove blob from git object store
          fs.unlinkSync(path.join(repository.getGitDirectoryPath(), 'objects', beforeSha.slice(0, 2), beforeSha.slice(2)));

          sinon.stub(notificationManager, 'addError');
          assert.equal(repository.getDiscardHistory().length, 2);
          await wrapper.instance().undoLastDiscard();
          const notificationArgs = notificationManager.addError.args[0];
          assert.equal(notificationArgs[0], 'Discard history has expired.');
          assert.match(notificationArgs[1].description, /Stale discard history has been deleted./);
          assert.equal(repository.getDiscardHistory().length, 0);
        });
      });
    });
  });
});
