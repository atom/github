import path from 'path';
import fs from 'fs';

import React from 'react';
import {shallow, mount} from 'enzyme';
import dedent from 'dedent-js';

import {cloneRepository, buildRepository} from '../helpers';
import {GitError} from '../../lib/git-shell-out-strategy';
import Repository from '../../lib/models/repository';
import ResolutionProgress from '../../lib/models/conflicts/resolution-progress';

import RootController from '../../lib/controllers/root-controller';

describe('RootController', function() {
  let atomEnv, workspace, commandRegistry, notificationManager, tooltips, config, confirm, deserializers, grammars, app;
  let getRepositoryForWorkdir, destroyGitTabItem, destroyGithubTabItem, removeFilePatchItem;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
    workspace = atomEnv.workspace;
    commandRegistry = atomEnv.commands;
    deserializers = atomEnv.deserializers;
    grammars = atomEnv.grammars;
    notificationManager = atomEnv.notifications;
    tooltips = atomEnv.tooltips;
    config = atomEnv.config;

    getRepositoryForWorkdir = sinon.stub();
    destroyGitTabItem = sinon.spy();
    destroyGithubTabItem = sinon.spy();
    removeFilePatchItem = sinon.spy();

    const absentRepository = Repository.absent();
    const emptyResolutionProgress = new ResolutionProgress();

    confirm = sinon.stub(atomEnv, 'confirm');
    app = (
      <RootController
        workspace={workspace}
        commandRegistry={commandRegistry}
        deserializers={deserializers}
        grammars={grammars}
        notificationManager={notificationManager}
        tooltips={tooltips}
        config={config}
        confirm={confirm}
        repository={absentRepository}
        resolutionProgress={emptyResolutionProgress}
        startOpen={false}
        filePatchItems={[]}
        getRepositoryForWorkdir={getRepositoryForWorkdir}
        destroyGitTabItem={destroyGitTabItem}
        destroyGithubTabItem={destroyGithubTabItem}
        removeFilePatchItem={removeFilePatchItem}
      />
    );
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  describe('initial panel visibility', function() {
    let gitTabStubItem, githubTabStubItem;
    beforeEach(function() {
      const FAKE_PANE_ITEM = Symbol('fake pane item');
      gitTabStubItem = {
        getDockItem() {
          return FAKE_PANE_ITEM;
        },
      };
      githubTabStubItem = {
        getDockItem() {
          return FAKE_PANE_ITEM;
        },
      };
    });

    it('is rendered but not activated when startOpen prop is false', async function() {
      const workdirPath = await cloneRepository('multiple-commits');
      const repository = await buildRepository(workdirPath);

      app = React.cloneElement(app, {repository, gitTabStubItem, githubTabStubItem, startOpen: false});
      const wrapper = shallow(app);

      const gitDockItem = wrapper.find('DockItem').find({stubItem: gitTabStubItem});
      assert.isTrue(gitDockItem.exists());
      assert.isFalse(gitDockItem.prop('activate'));

      const githubDockItem = wrapper.find('DockItem').find({stubItem: githubTabStubItem});
      assert.isTrue(githubDockItem.exists());
      assert.isNotTrue(githubDockItem.prop('activate'));
    });

    it('is initially activated when the startOpen prop is true', async function() {
      const workdirPath = await cloneRepository('multiple-commits');
      const repository = await buildRepository(workdirPath);

      app = React.cloneElement(app, {repository, gitTabStubItem, githubTabStubItem, startOpen: true});
      const wrapper = shallow(app);

      const gitDockItem = wrapper.find('DockItem').find({stubItem: gitTabStubItem});
      assert.isTrue(gitDockItem.exists());
      assert.isTrue(gitDockItem.prop('activate'));

      const githubDockItem = wrapper.find('DockItem').find({stubItem: githubTabStubItem});
      assert.isTrue(githubDockItem.exists());
      assert.isNotTrue(githubDockItem.prop('activate'));
    });
  });

  describe('rendering a FilePatch', function() {
    it('renders the FilePatchController based on props.filePatchItems', async function() {
      const workdirPath = await cloneRepository('three-files');
      const repository = await buildRepository(workdirPath);
      app = React.cloneElement(app, {repository, filePatchItems: []});
      let wrapper = shallow(app);

      assert.equal(wrapper.find('FilePatchController').length, 0);

      app = React.cloneElement(app, {repository, filePatchItems: [
        {key: 1, uri: 'atom-github://file-patch/a.txt?workdir=/foo/bar/baz&stagingStatus=unstaged'},
        {key: 2, uri: 'atom-github://file-patch/b.txt?workdir=/foo/bar/baz&stagingStatus=unstaged'},
        {key: 3, uri: 'atom-github://file-patch/b.txt?workdir=/foo/bar/baz&stagingStatus=staged'},
        {key: 4, uri: 'atom-github://file-patch/c.txt?workdir=/foo/bar/baz&stagingStatus=staged'},
      ]});
      wrapper = shallow(app);

      assert.equal(wrapper.find('FilePatchController').length, 4);
      assert.isTrue(wrapper.find({filePath: 'a.txt', initialStagingStatus: 'unstaged'}).exists());
      assert.isTrue(wrapper.find({filePath: 'b.txt', initialStagingStatus: 'unstaged'}).exists());
      assert.isTrue(wrapper.find({filePath: 'b.txt', initialStagingStatus: 'staged'}).exists());
      assert.isTrue(wrapper.find({filePath: 'c.txt', initialStagingStatus: 'staged'}).exists());
    });

    if (path.sep !== '/') {
      it('reconstitutes paths from the pane URI with the correct path separator', async function() {
        const workdirPath = await cloneRepository('three-files');
        const repository = await buildRepository(workdirPath);

        app = React.cloneElement(app, {repository, filePatchItems: [
          {key: 1, uri: 'atom-github://file-patch/foo/bar/baz/filename.txt?workdir=/foo/bar/baz&stagingStatus=unstaged'},
        ]});
        const wrapper = shallow(app);

        assert.equal(wrapper.find('FilePatchController').length, 1);
        assert.isTrue(wrapper.find({filePath: path.join('foo', 'bar', 'baz', 'filename.txt')}).exists());
      });
    }
  });

  xdescribe('when amend mode is toggled in the staging panel while viewing a staged change', function() {
    it('updates the amending state and saves it to the repositoryStateRegistry', async function() {
      const workdirPath = await cloneRepository('multiple-commits');
      const repository = await buildRepository(workdirPath);

      app = React.cloneElement(app, {repository});
      const wrapper = shallow(app);

      const repositoryStateRegistry = wrapper.instance().repositoryStateRegistry;

      sinon.stub(repositoryStateRegistry, 'setStateForModel');
      sinon.stub(repositoryStateRegistry, 'save');

      assert.isFalse(wrapper.state('amending'));

      await wrapper.instance().didChangeAmending(true);
      assert.isTrue(wrapper.state('amending'));
      assert.equal(repositoryStateRegistry.setStateForModel.callCount, 1);
      assert.deepEqual(repositoryStateRegistry.setStateForModel.args[0], [
        repository,
        {amending: true},
      ]);
      assert.equal(repositoryStateRegistry.save.callCount, 1);

      repositoryStateRegistry.setStateForModel.reset();
      repositoryStateRegistry.save.reset();
      await wrapper.instance().didChangeAmending(false);
      assert.isFalse(wrapper.state('amending'));
      assert.equal(repositoryStateRegistry.setStateForModel.callCount, 1);
      assert.deepEqual(repositoryStateRegistry.setStateForModel.args[0], [
        repository,
        {amending: false},
      ]);
      assert.equal(repositoryStateRegistry.save.callCount, 1);
    });
  });

  ['git', 'github'].forEach(function(tabName) {
    describe(`${tabName} tab tracker`, function() {
      let wrapper, tabTracker, mockDockItem;

      beforeEach(async function() {
        const workdirPath = await cloneRepository('multiple-commits');
        const repository = await buildRepository(workdirPath);

        app = React.cloneElement(app, {repository});
        wrapper = shallow(app);
        tabTracker = wrapper.instance()[`${tabName}TabTracker`];

        sinon.stub(tabTracker, 'focus');
        sinon.spy(workspace.getActivePane(), 'activate');

        const FAKE_PANE_ITEM = Symbol('fake pane item');
        mockDockItem = {
          getDockItem() {
            return FAKE_PANE_ITEM;
          },
        };

        wrapper.instance()[`${tabName}DockItem`] = mockDockItem;

        sinon.stub(workspace.getRightDock(), 'isVisible').returns(true);
        sinon.stub(workspace.getRightDock(), 'getPanes').callsFake(() => [{
          getActiveItem() { return mockDockItem.active ? FAKE_PANE_ITEM : null; },
        }]);
      });

      describe('reveal', function() {
        it('calls workspace.open with the correct uri', function() {
          sinon.stub(workspace, 'open');

          tabTracker.reveal();
          assert.equal(workspace.open.callCount, 1);
          assert.deepEqual(workspace.open.args[0], [
            `atom-github://dock-item/${tabName}`,
            {searchAllPanes: true, activateItem: true, activatePane: true},
          ]);
        });
      });

      describe('hide', function() {
        it('calls workspace.hide with the correct uri', function() {
          sinon.stub(workspace, 'hide');

          tabTracker.hide();
          assert.equal(workspace.hide.callCount, 1);
          assert.deepEqual(workspace.hide.args[0], [
            `atom-github://dock-item/${tabName}`,
          ]);
        });
      });

      describe('toggle()', function() {
        it(`reveals the ${tabName} tab when item is not rendered`, async function() {
          sinon.stub(tabTracker, 'reveal');

          sinon.stub(tabTracker, 'isRendered').returns(false);
          sinon.stub(tabTracker, 'isVisible').returns(false);

          await tabTracker.toggle();
          assert.equal(tabTracker.reveal.callCount, 1);
        });

        it(`reveals the ${tabName} tab when the item is rendered but not active`, async function() {
          sinon.stub(tabTracker, 'reveal');

          sinon.stub(tabTracker, 'isRendered').returns(true);
          sinon.stub(tabTracker, 'isVisible').returns(false);

          await tabTracker.toggle();
          assert.equal(tabTracker.reveal.callCount, 1);
        });

        it(`hides the ${tabName} tab when open`, async function() {
          sinon.stub(tabTracker, 'hide');

          sinon.stub(tabTracker, 'isRendered').returns(true);
          sinon.stub(tabTracker, 'isVisible').returns(true);

          await tabTracker.toggle();
          assert.equal(tabTracker.hide.callCount, 1);
        });
      });

      describe('toggleFocus()', function() {
        it(`reveals and focuses the ${tabName} tab when it is initially closed`, async function() {
          sinon.stub(tabTracker, 'reveal');

          sinon.stub(tabTracker, 'isRendered').returns(false);
          sinon.stub(tabTracker, 'isVisible').returns(false);

          sinon.stub(tabTracker, 'hasFocus').returns(false);

          await tabTracker.toggleFocus();

          assert.equal(tabTracker.reveal.callCount, 1);
          assert.isTrue(tabTracker.focus.called);
          assert.isFalse(workspace.getActivePane().activate.called);
        });

        it(`focuses the ${tabName} tab when it is already open, but blurred`, async function() {
          sinon.stub(tabTracker, 'isRendered').returns(true);
          sinon.stub(tabTracker, 'isVisible').returns(true);
          sinon.stub(tabTracker, 'hasFocus').returns(false);

          await tabTracker.toggleFocus();

          assert.isTrue(tabTracker.focus.called);
          assert.isFalse(workspace.getActivePane().activate.called);
        });

        it(`blurs the ${tabName} tab when it is already open and focused`, async function() {
          sinon.stub(tabTracker, 'isRendered').returns(true);
          sinon.stub(tabTracker, 'isVisible').returns(true);
          sinon.stub(tabTracker, 'hasFocus').returns(true);

          await tabTracker.toggleFocus();

          assert.isFalse(tabTracker.focus.called);
          assert.isTrue(workspace.getActivePane().activate.called);
        });
      });

      describe('ensureVisible()', function() {
        it(`reveals the ${tabName} tab when it is initially closed`, async function() {
          sinon.stub(tabTracker, 'reveal');

          sinon.stub(tabTracker, 'isRendered').returns(false);
          sinon.stub(tabTracker, 'isVisible').returns(false);
          assert.isTrue(await tabTracker.ensureVisible());
          assert.equal(tabTracker.reveal.callCount, 1);
        });

        it(`does nothing when the ${tabName} tab is already open`, async function() {
          sinon.stub(tabTracker, 'reveal');

          sinon.stub(tabTracker, 'isRendered').returns(true);
          sinon.stub(tabTracker, 'isVisible').returns(true);
          assert.isFalse(await tabTracker.ensureVisible());
          assert.equal(tabTracker.reveal.callCount, 0);
        });
      });
    });
  });

  describe('initializeRepo', function() {
    let createRepositoryForProjectPath, resolveInit, rejectInit;

    beforeEach(function() {
      createRepositoryForProjectPath = sinon.stub().returns(new Promise((resolve, reject) => {
        resolveInit = resolve;
        rejectInit = reject;
      }));
    });

    it('renders the modal init panel', function() {
      app = React.cloneElement(app, {createRepositoryForProjectPath});
      const wrapper = shallow(app);

      wrapper.instance().initializeRepo();

      assert.lengthOf(wrapper.find('Panel').find({location: 'modal'}).find('InitDialog'), 1);
    });

    it('triggers the init callback on accept', function() {
      app = React.cloneElement(app, {createRepositoryForProjectPath});
      const wrapper = shallow(app);

      wrapper.instance().initializeRepo();
      const dialog = wrapper.find('InitDialog');
      dialog.prop('didAccept')('/a/path');
      resolveInit();

      assert.isTrue(createRepositoryForProjectPath.calledWith('/a/path'));
    });

    it('dismisses the init callback on cancel', function() {
      app = React.cloneElement(app, {createRepositoryForProjectPath});
      const wrapper = shallow(app);

      wrapper.instance().initializeRepo();
      const dialog = wrapper.find('InitDialog');
      dialog.prop('didCancel')();

      assert.isFalse(wrapper.find('InitDialog').exists());
    });

    it('creates a notification if the init fails', async function() {
      sinon.stub(notificationManager, 'addError');

      app = React.cloneElement(app, {createRepositoryForProjectPath});
      const wrapper = shallow(app);

      wrapper.instance().initializeRepo();
      const dialog = wrapper.find('InitDialog');
      const acceptPromise = dialog.prop('didAccept')('/a/path');
      const err = new GitError('git init exited with status 1');
      err.stdErr = 'this is stderr';
      rejectInit(err);
      await acceptPromise;

      assert.isFalse(wrapper.find('InitDialog').exists());
      assert.isTrue(notificationManager.addError.calledWith(
        'Unable to initialize git repository in /a/path',
        sinon.match({detail: sinon.match(/this is stderr/)}),
      ));
    });
  });

  describe('github:clone', function() {
    let wrapper, cloneRepositoryForProjectPath, resolveClone, rejectClone;

    beforeEach(function() {
      cloneRepositoryForProjectPath = sinon.stub().returns(new Promise((resolve, reject) => {
        resolveClone = resolve;
        rejectClone = reject;
      }));

      app = React.cloneElement(app, {cloneRepositoryForProjectPath});
      wrapper = shallow(app);
    });

    it('renders the modal clone panel', function() {
      wrapper.instance().openCloneDialog();

      assert.lengthOf(wrapper.find('Panel').find({location: 'modal'}).find('CloneDialog'), 1);
    });

    it('triggers the clone callback on accept', function() {
      wrapper.instance().openCloneDialog();

      const dialog = wrapper.find('CloneDialog');
      dialog.prop('didAccept')('git@github.com:atom/github.git', '/home/me/github');
      resolveClone();

      assert.isTrue(cloneRepositoryForProjectPath.calledWith('git@github.com:atom/github.git', '/home/me/github'));
    });

    it('marks the clone dialog as in progress during clone', async function() {
      wrapper.instance().openCloneDialog();

      const dialog = wrapper.find('CloneDialog');
      assert.isFalse(dialog.prop('inProgress'));

      const acceptPromise = dialog.prop('didAccept')('git@github.com:atom/github.git', '/home/me/github');

      assert.isTrue(wrapper.find('CloneDialog').prop('inProgress'));

      resolveClone();
      await acceptPromise;

      assert.isFalse(wrapper.find('CloneDialog').exists());
    });

    it('creates a notification if the clone fails', async function() {
      sinon.stub(notificationManager, 'addError');

      wrapper.instance().openCloneDialog();

      const dialog = wrapper.find('CloneDialog');
      assert.isFalse(dialog.prop('inProgress'));

      const acceptPromise = dialog.prop('didAccept')('git@github.com:nope/nope.git', '/home/me/github');
      const err = new GitError('git clone exited with status 1');
      err.stdErr = 'this is stderr';
      rejectClone(err);
      await acceptPromise;

      assert.isFalse(wrapper.find('CloneDialog').exists());
      assert.isTrue(notificationManager.addError.calledWith(
        'Unable to clone git@github.com:nope/nope.git',
        sinon.match({detail: sinon.match(/this is stderr/)}),
      ));
    });

    it('dismisses the clone panel on cancel', function() {
      wrapper.instance().openCloneDialog();

      const dialog = wrapper.find('CloneDialog');
      dialog.prop('didCancel')();

      assert.lengthOf(wrapper.find('CloneDialog'), 0);
      assert.isFalse(cloneRepositoryForProjectPath.called);
    });
  });

  describe('promptForCredentials()', function() {
    let wrapper;

    beforeEach(function() {
      wrapper = shallow(app);
    });

    it('renders the modal credentials dialog', function() {
      wrapper.instance().promptForCredentials({
        prompt: 'Password plz',
        includeUsername: true,
      });

      const dialog = wrapper.find('Panel').find({location: 'modal'}).find('CredentialDialog');
      assert.isTrue(dialog.exists());
      assert.equal(dialog.prop('prompt'), 'Password plz');
      assert.isTrue(dialog.prop('includeUsername'));
    });

    it('resolves the promise with credentials on accept', async function() {
      const credentialPromise = wrapper.instance().promptForCredentials({
        prompt: 'Speak "friend" and enter',
        includeUsername: false,
      });

      wrapper.find('CredentialDialog').prop('onSubmit')({password: 'friend'});
      assert.deepEqual(await credentialPromise, {password: 'friend'});
      assert.isFalse(wrapper.find('CredentialDialog').exists());
    });

    it('rejects the promise on cancel', async function() {
      const credentialPromise = wrapper.instance().promptForCredentials({
        prompt: 'Enter the square root of 1244313452349528345',
        includeUsername: false,
      });

      wrapper.find('CredentialDialog').prop('onCancel')();
      await assert.isRejected(credentialPromise);
      assert.isFalse(wrapper.find('CredentialDialog').exists());
    });
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
    describe('discardLines(filePatch, lines)', () => {
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
        await wrapper.instance().discardLines(unstagedFilePatch, new Set([hunkLines[0]]));
        assert.isTrue(repository.applyPatchToWorkdir.calledOnce);
        assert.isFalse(notificationManager.addError.called);

        // modified buffer
        repository.applyPatchToWorkdir.reset();
        editor.setText('modify contents');
        await wrapper.instance().discardLines(unstagedFilePatch, new Set(unstagedFilePatch.getHunks()[0].getLines()));
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
          await wrapper.instance().discardLines(unstagedFilePatch, new Set(unstagedFilePatch.getHunks()[0].getLines().slice(0, 2)));
          const contents2 = fs.readFileSync(absFilePath, 'utf8');
          assert.notEqual(contents1, contents2);
          await repository.refresh();

          unstagedFilePatch = await repository.getFilePatchForPath('sample.js');
          wrapper.setState({filePatch: unstagedFilePatch});
          await wrapper.instance().discardLines(unstagedFilePatch, new Set(unstagedFilePatch.getHunks()[0].getLines().slice(2, 4)));
          const contents3 = fs.readFileSync(absFilePath, 'utf8');
          assert.notEqual(contents2, contents3);

          await wrapper.instance().undoLastDiscard('sample.js');
          await assert.async.equal(fs.readFileSync(absFilePath, 'utf8'), contents2);
          await wrapper.instance().undoLastDiscard('sample.js');
          await assert.async.equal(fs.readFileSync(absFilePath, 'utf8'), contents1);
        });

        it('does not undo if buffer is modified', async () => {
          const contents1 = fs.readFileSync(absFilePath, 'utf8');
          await wrapper.instance().discardLines(unstagedFilePatch, new Set(unstagedFilePatch.getHunks()[0].getLines().slice(0, 2)));
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
            await wrapper.instance().discardLines(unstagedFilePatch, new Set(unstagedFilePatch.getHunks()[0].getLines().slice(0, 2)));
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
            await repository.git.exec(['config', 'merge.conflictstyle', 'diff3']);

            const contents1 = fs.readFileSync(absFilePath, 'utf8');
            await wrapper.instance().discardLines(unstagedFilePatch, new Set(unstagedFilePatch.getHunks()[0].getLines().slice(0, 2)));
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

            // index is updated accordingly
            const diff = await repository.git.exec(['diff', '--', 'sample.js']);
            assert.equal(diff, dedent`
              diff --cc sample.js
              index 5c084c0,86e041d..0000000
              --- a/sample.js
              +++ b/sample.js
              @@@ -1,6 -1,3 +1,12 @@@
              ++<<<<<<< current
               +
               +change file contentsvar quicksort = function () {
               +  var sort = function(items) {
              ++||||||| after discard
              ++var quicksort = function () {
              ++  var sort = function(items) {
              ++=======
              ++>>>>>>> before discard
                foo
                bar
                baz

            `);
          });
        });

        it('clears the discard history if the last blob is no longer valid', async () => {
          // this would occur in the case of garbage collection cleaning out the blob
          await wrapper.instance().discardLines(unstagedFilePatch, new Set(unstagedFilePatch.getHunks()[0].getLines().slice(0, 2)));
          await repository.refresh();
          unstagedFilePatch = await repository.getFilePatchForPath('sample.js');
          wrapper.setState({filePatch: unstagedFilePatch});
          const {beforeSha} = await wrapper.instance().discardLines(unstagedFilePatch, new Set(unstagedFilePatch.getHunks()[0].getLines().slice(2, 4)));

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
        let repository, workdirPath, wrapper, pathA, pathB, pathDeleted, pathAdded, getFileContents;
        beforeEach(async () => {
          workdirPath = await cloneRepository('three-files');
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
          pathB = path.join(workdirPath, 'subdir-1', 'b.txt');
          pathDeleted = path.join(workdirPath, 'c.txt');
          pathAdded = path.join(workdirPath, 'added-file.txt');
          fs.writeFileSync(pathA, [1, 2, 3, 4, 5, 6, 7, 8, 9].join('\n'));
          fs.writeFileSync(pathB, ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].join('\n'));
          fs.writeFileSync(pathAdded, ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'].join('\n'));
          fs.unlinkSync(pathDeleted);

          app = React.cloneElement(app, {repository});
          wrapper = shallow(app);
        });

        it('reverses last discard if there are no conflicts', async () => {
          const contents1 = {
            pathA: getFileContents(pathA),
            pathB: getFileContents(pathB),
            pathDeleted: getFileContents(pathDeleted),
            pathAdded: getFileContents(pathAdded),
          };
          await wrapper.instance().discardWorkDirChangesForPaths(['a.txt', 'subdir-1/b.txt']);
          const contents2 = {
            pathA: getFileContents(pathA),
            pathB: getFileContents(pathB),
            pathDeleted: getFileContents(pathDeleted),
            pathAdded: getFileContents(pathAdded),
          };
          assert.notDeepEqual(contents1, contents2);

          await wrapper.instance().discardWorkDirChangesForPaths(['c.txt', 'added-file.txt']);
          const contents3 = {
            pathA: getFileContents(pathA),
            pathB: getFileContents(pathB),
            pathDeleted: getFileContents(pathDeleted),
            pathAdded: getFileContents(pathAdded),
          };
          assert.notDeepEqual(contents2, contents3);

          await wrapper.instance().undoLastDiscard();
          await assert.async.deepEqual({
            pathA: getFileContents(pathA),
            pathB: getFileContents(pathB),
            pathDeleted: getFileContents(pathDeleted),
            pathAdded: getFileContents(pathAdded),
          }, contents2);
          await wrapper.instance().undoLastDiscard();
          await assert.async.deepEqual({
            pathA: getFileContents(pathA),
            pathB: getFileContents(pathB),
            pathDeleted: getFileContents(pathDeleted),
            pathAdded: getFileContents(pathAdded),
          }, contents1);
        });

        it('does not undo if buffer is modified', async () => {
          await wrapper.instance().discardWorkDirChangesForPaths(['a.txt', 'subdir-1/b.txt', 'c.txt', 'added-file.txt']);

          // modify buffers
          (await workspace.open(pathA)).getBuffer().append('stuff');
          (await workspace.open(pathB)).getBuffer().append('other stuff');
          (await workspace.open(pathDeleted)).getBuffer().append('this stuff');
          (await workspace.open(pathAdded)).getBuffer().append('that stuff');

          const expandBlobToFile = sinon.spy(repository, 'expandBlobToFile');
          sinon.stub(notificationManager, 'addError');

          await wrapper.instance().undoLastDiscard();
          const notificationArgs = notificationManager.addError.args[0];
          assert.equal(notificationArgs[0], 'Cannot undo last discard.');
          assert.match(notificationArgs[1].description, /You have unsaved changes./);
          assert.match(notificationArgs[1].description, /a.txt/);
          assert.match(notificationArgs[1].description, /subdir-1\/b.txt/);
          assert.match(notificationArgs[1].description, /c.txt/);
          assert.match(notificationArgs[1].description, /added-file.txt/);
          assert.isFalse(expandBlobToFile.called);
        });

        describe('when file content has changed since last discard', () => {
          it('successfully undoes discard if changes do not conflict', async () => {
            pathDeleted = path.join(workdirPath, 'deleted-file.txt');
            fs.writeFileSync(pathDeleted, 'this file will be deleted\n');
            await repository.git.exec(['add', '.']);
            await repository.git.exec(['commit', '-m', 'commit files lengthy enough that changes don\'t conflict']);

            pathAdded = path.join(workdirPath, 'another-added-file.txt');

            // change files
            fs.writeFileSync(pathA, 'change at beginning\n' + fs.readFileSync(pathA, 'utf8'));
            fs.writeFileSync(pathB, 'change at beginning\n' + fs.readFileSync(pathB, 'utf8'));
            fs.unlinkSync(pathDeleted);
            fs.writeFileSync(pathAdded, 'foo\nbar\baz\n');

            const contentsBeforeDiscard = {
              pathA: getFileContents(pathA),
              pathB: getFileContents(pathB),
              pathDeleted: getFileContents(pathDeleted),
              pathAdded: getFileContents(pathAdded),
            };

            await wrapper.instance().discardWorkDirChangesForPaths(['a.txt', 'subdir-1/b.txt', 'deleted-file.txt', 'another-added-file.txt']);

            // change file contents on disk in non-conflicting way
            fs.writeFileSync(pathA, fs.readFileSync(pathA, 'utf8') + 'change at end');
            fs.writeFileSync(pathB, fs.readFileSync(pathB, 'utf8') + 'change at end');

            await wrapper.instance().undoLastDiscard();

            await assert.async.deepEqual({
              pathA: getFileContents(pathA),
              pathB: getFileContents(pathB),
              pathDeleted: getFileContents(pathDeleted),
              pathAdded: getFileContents(pathAdded),
            }, {
              pathA: contentsBeforeDiscard.pathA + 'change at end',
              pathB: contentsBeforeDiscard.pathB + 'change at end',
              pathDeleted: contentsBeforeDiscard.pathDeleted,
              pathAdded: contentsBeforeDiscard.pathAdded,
            });
          });

          it('prompts user to continue if conflicts arise and proceeds based on user input, updating index to reflect files under conflict', async () => {
            pathDeleted = path.join(workdirPath, 'deleted-file.txt');
            fs.writeFileSync(pathDeleted, 'this file will be deleted\n');
            await repository.git.exec(['add', '.']);
            await repository.git.exec(['commit', '-m', 'commit files lengthy enough that changes don\'t conflict']);

            pathAdded = path.join(workdirPath, 'another-added-file.txt');
            fs.writeFileSync(pathA, 'change at beginning\n' + fs.readFileSync(pathA, 'utf8'));
            fs.writeFileSync(pathB, 'change at beginning\n' + fs.readFileSync(pathB, 'utf8'));
            fs.unlinkSync(pathDeleted);
            fs.writeFileSync(pathAdded, 'foo\nbar\baz\n');

            await wrapper.instance().discardWorkDirChangesForPaths(['a.txt', 'subdir-1/b.txt', 'deleted-file.txt', 'another-added-file.txt']);

            // change files in a conflicting way
            fs.writeFileSync(pathA, 'conflicting change\n' + fs.readFileSync(pathA, 'utf8'));
            fs.writeFileSync(pathB, 'conflicting change\n' + fs.readFileSync(pathB, 'utf8'));
            fs.writeFileSync(pathDeleted, 'conflicting change\n');
            fs.writeFileSync(pathAdded, 'conflicting change\n');

            const contentsAfterConflictingChange = {
              pathA: getFileContents(pathA),
              pathB: getFileContents(pathB),
              pathDeleted: getFileContents(pathDeleted),
              pathAdded: getFileContents(pathAdded),
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
              pathDeleted: getFileContents(pathDeleted),
              pathAdded: getFileContents(pathAdded),
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
            assert.equal(editors.length, 4);

            assert.match(editors[0].getFileName(), /a.txt-/);
            assert.isTrue(editors[0].getText().includes('<<<<<<<'));
            assert.isTrue(editors[0].getText().includes('>>>>>>>'));

            assert.match(editors[1].getFileName(), /another-added-file.txt-/);
            // no merge markers since 'ours' version is a deleted file
            assert.isTrue(editors[1].getText().includes('<<<<<<<'));
            assert.isTrue(editors[1].getText().includes('>>>>>>>'));

            assert.match(editors[2].getFileName(), /b.txt-/);
            assert.isTrue(editors[2].getText().includes('<<<<<<<'));
            assert.isTrue(editors[2].getText().includes('>>>>>>>'));

            assert.match(editors[3].getFileName(), /deleted-file.txt-/);
            // no merge markers since 'theirs' version is a deleted file
            assert.isFalse(editors[3].getText().includes('<<<<<<<'));
            assert.isFalse(editors[3].getText().includes('>>>>>>>'));

            // click 'Proceed and resolve conflicts'
            confirm.returns(0);
            await wrapper.instance().undoLastDiscard();
            assert.equal(confirm.callCount, 3);
            const contentsAfterUndo = {
              pathA: getFileContents(pathA),
              pathB: getFileContents(pathB),
              pathDeleted: getFileContents(pathDeleted),
              pathAdded: getFileContents(pathAdded),
            };
            await assert.async.isTrue(contentsAfterUndo.pathA.includes('<<<<<<<'));
            await assert.async.isTrue(contentsAfterUndo.pathA.includes('>>>>>>>'));
            await assert.async.isTrue(contentsAfterUndo.pathB.includes('<<<<<<<'));
            await assert.async.isTrue(contentsAfterUndo.pathB.includes('>>>>>>>'));
            await assert.async.isFalse(contentsAfterUndo.pathDeleted.includes('<<<<<<<'));
            await assert.async.isFalse(contentsAfterUndo.pathDeleted.includes('>>>>>>>'));
            await assert.async.isTrue(contentsAfterUndo.pathAdded.includes('<<<<<<<'));
            await assert.async.isTrue(contentsAfterUndo.pathAdded.includes('>>>>>>>'));
            let unmergedFiles = await repository.git.exec(['diff', '--name-status', '--diff-filter=U']);
            unmergedFiles = unmergedFiles.trim().split('\n').map(line => line.split('\t')[1]).sort();
            assert.deepEqual(unmergedFiles, ['a.txt', 'another-added-file.txt', 'deleted-file.txt', 'subdir-1/b.txt']);
          });
        });

        it('clears the discard history if the last blob is no longer valid', async () => {
          // this would occur in the case of garbage collection cleaning out the blob
          await wrapper.instance().discardWorkDirChangesForPaths(['a.txt']);
          const snapshots = await wrapper.instance().discardWorkDirChangesForPaths(['subdir-1/b.txt']);
          const {beforeSha} = snapshots['subdir-1/b.txt'];

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

  describe('viewing diffs from active editor', function() {
    describe('viewUnstagedChangesForCurrentFile()', function() {
      it('opens the unstaged changes diff view associated with the active editor and selects the closest hunk line according to cursor position', async function() {
        const workdirPath = await cloneRepository('three-files');
        const repository = await buildRepository(workdirPath);
        const wrapper = mount(React.cloneElement(app, {repository}));

        fs.writeFileSync(path.join(workdirPath, 'a.txt'), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].join('\n'));

        const editor = await workspace.open(path.join(workdirPath, 'a.txt'));
        editor.setCursorBufferPosition([7, 0]);

        // TODO: too implementation-detail-y
        const filePatchItem = {
          goToDiffLine: sinon.spy(),
          focus: sinon.spy(),
          getRealItemPromise: () => Promise.resolve(),
          getFilePatchLoadedPromise: () => Promise.resolve(),
        };
        sinon.stub(workspace, 'open').returns(filePatchItem);
        await wrapper.instance().viewUnstagedChangesForCurrentFile();

        await assert.async.equal(workspace.open.callCount, 1);
        assert.deepEqual(workspace.open.args[0], [
          `atom-github://file-patch/a.txt?workdir=${workdirPath}&stagingStatus=unstaged`,
          {pending: true, activatePane: true, activateItem: true},
        ]);
        await assert.async.equal(filePatchItem.goToDiffLine.callCount, 1);
        assert.deepEqual(filePatchItem.goToDiffLine.args[0], [8]);
        assert.equal(filePatchItem.focus.callCount, 1);
      });
    });

    describe('viewStagedChangesForCurrentFile()', function() {
      it('opens the staged changes diff view associated with the active editor and selects the closest hunk line according to cursor position', async function() {
        const workdirPath = await cloneRepository('three-files');
        const repository = await buildRepository(workdirPath);
        const wrapper = mount(React.cloneElement(app, {repository}));

        fs.writeFileSync(path.join(workdirPath, 'a.txt'), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].join('\n'));
        await repository.stageFiles(['a.txt']);

        const editor = await workspace.open(path.join(workdirPath, 'a.txt'));
        editor.setCursorBufferPosition([7, 0]);

        // TODO: too implementation-detail-y
        const filePatchItem = {
          goToDiffLine: sinon.spy(),
          focus: sinon.spy(),
          getRealItemPromise: () => Promise.resolve(),
          getFilePatchLoadedPromise: () => Promise.resolve(),
        };
        sinon.stub(workspace, 'open').returns(filePatchItem);
        await wrapper.instance().viewStagedChangesForCurrentFile();

        await assert.async.equal(workspace.open.callCount, 1);
        assert.deepEqual(workspace.open.args[0], [
          `atom-github://file-patch/a.txt?workdir=${workdirPath}&stagingStatus=staged`,
          {pending: true, activatePane: true, activateItem: true},
        ]);
        await assert.async.equal(filePatchItem.goToDiffLine.callCount, 1);
        assert.deepEqual(filePatchItem.goToDiffLine.args[0], [8]);
        assert.equal(filePatchItem.focus.callCount, 1);
      });
    });
  });
});
