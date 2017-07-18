import path from 'path';
import fs from 'fs';

import React from 'react';
import {shallow, mount} from 'enzyme';
import dedent from 'dedent-js';

import {cloneRepository, buildRepository} from '../helpers';
import {writeFile} from '../../lib/helpers';
import {GitError} from '../../lib/git-shell-out-strategy';
import Repository from '../../lib/models/repository';
import ResolutionProgress from '../../lib/models/conflicts/resolution-progress';

import RootController from '../../lib/controllers/root-controller';

describe('RootController', function() {
  let atomEnv, workspace, commandRegistry, notificationManager, tooltips, config, confirm, app;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
    workspace = atomEnv.workspace;
    commandRegistry = atomEnv.commands;
    notificationManager = atomEnv.notifications;
    tooltips = atomEnv.tooltips;
    config = atomEnv.config;

    const absentRepository = Repository.absent();
    const emptyResolutionProgress = new ResolutionProgress();

    confirm = sinon.stub(atomEnv, 'confirm');
    app = (
      <RootController
        workspace={workspace}
        commandRegistry={commandRegistry}
        notificationManager={notificationManager}
        tooltips={tooltips}
        config={config}
        confirm={confirm}
        repository={absentRepository}
        resolutionProgress={emptyResolutionProgress}
        startOpen={false}
        filePatchItems={[]}
      />
    );
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  describe('initial panel visibility', function() {
    function assertInitialTabState({tabName, wrapper, rendered, visible, activated}) {
      const dockItem = wrapper
        .find('DockItem').find({stubItemSelector: `${tabName}-tab-controller`});
      const isRendered = dockItem.exists();
      const isActivated = isRendered ? dockItem.prop('activate') === true : false;

      assert.equal(rendered, isRendered);
      assert.equal(activated, isActivated);
    }

    it('is rendered but not activated when startOpen prop is false', async function() {
      const workdirPath = await cloneRepository('multiple-commits');
      const repository = await buildRepository(workdirPath);

      app = React.cloneElement(app, {repository, startOpen: false});
      const wrapper = shallow(app);

      assertInitialTabState({
        wrapper, tabName: 'git',
        rendered: true, activated: false, visible: false,
      });

      assertInitialTabState({
        wrapper, tabName: 'github',
        rendered: true, activated: false, visible: false,
      });
    });

    it('is initially activated when the startOpen prop is true', async function() {
      const workdirPath = await cloneRepository('multiple-commits');
      const repository = await buildRepository(workdirPath);

      app = React.cloneElement(app, {repository, startOpen: true});
      const wrapper = shallow(app);

      assertInitialTabState({
        wrapper, tabName: 'git',
        rendered: true, activated: true, visible: true,
      });

      assertInitialTabState({
        wrapper, tabName: 'github',
        rendered: true, activated: false, visible: true,
      });
    });
  });

  xdescribe('showMergeConflictFileForPath(relativeFilePath, {focus} = {})', function() {
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

  xdescribe('diveIntoMergeConflictFileForPath(relativeFilePath)', function() {
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
        stagingStatus: 'unstaged',
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

  // move to FilePatchController
  xdescribe('showFilePatchForPath(filePath, staged, {amending, activate})', function() {
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

  xdescribe('diveIntoFilePatchForPath(filePath, staged, {amending, activate})', function() {
    it('reveals and focuses the file patch', async function() {
      const workdirPath = await cloneRepository('three-files');
      const repository = await buildRepository(workdirPath);

      fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'change', 'utf8');
      repository.refresh();

      app = React.cloneElement(app, {repository});
      const wrapper = shallow(app);

      const focusFilePatch = sinon.spy();
      const activate = sinon.spy();

      const mockPane = {
        getPaneItem: () => mockPane,
        getElement: () => mockPane,
        querySelector: () => mockPane,
        focus: focusFilePatch,
        activate,
      };
      wrapper.instance().filePatchControllerPane = mockPane;

      await wrapper.instance().diveIntoFilePatchForPath('a.txt', 'unstaged');

      assert.equal(wrapper.state('filePath'), 'a.txt');
      assert.equal(wrapper.state('filePatch').getPath(), 'a.txt');
      assert.equal(wrapper.state('stagingStatus'), 'unstaged');

      assert.isTrue(focusFilePatch.called);
      assert.isTrue(activate.called);
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

  ['git', 'github'].forEach(function(tabName) {
    describe.only(`${tabName} tab tracker`, function() {
      let wrapper, tabTracker, stateKey, tabIndex, mockDockItem;

      beforeEach(async function() {
        const workdirPath = await cloneRepository('multiple-commits');
        const repository = await buildRepository(workdirPath);

        app = React.cloneElement(app, {repository});
        wrapper = shallow(app);
        tabTracker = wrapper.instance()[`${tabName}TabTracker`];

        sinon.stub(tabTracker, 'focus');
        sinon.spy(workspace.getActivePane(), 'activate');

        stateKey = `${tabName}TabActive`;
        tabIndex = {git: 0, github: 1}[tabName];

        const FAKE_PANE_ITEM = Symbol('fake pane item');
        mockDockItem = {
          active: false,
          reveal() {
            this.active = true;
            return Promise.resolve();
          },
          hide() {
            this.active = false;
            return Promise.resolve();
          },
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

      function assertTabState({rendered, active}) {
        const isRendered = wrapper.find('DockItem').find({stubItemSelector: `${tabName}-tab-controller`}).exists();
        const isActive = mockDockItem.active;

        assert.equal(isRendered, rendered);
        assert.equal(isActive, active);
      }

      describe('toggle()', function() {
        it.only(`renders and reveals the ${tabName} tab when item is not rendered`, async function() {
          assertTabState({rendered: false, active: false});

          await tabTracker.toggle();

          assertTabState({rendered: true, active: true});
        });

        it(`reveals the ${tabName} tab when the item is rendered but not active`, async function() {
          wrapper.setState({[stateKey]: true});

          assertTabState({rendered: true, active: false});

          await tabTracker.toggle();

          assertTabState({rendered: true, active: true});
        });

        it(`hides the ${tabName} tab when open`, async function() {
          wrapper.setState({[stateKey]: true, activeTab: tabIndex});
          mockDockItem.active = true;

          assertTabState({rendered: true, active: true});

          await tabTracker.toggle();

          assertTabState({rendered: true, active: false});
        });
      });

      describe('toggleFocus()', function() {
        it(`opens and focuses the ${tabName} tab when it is initially closed`, async function() {
          assertTabState({rendered: false, active: false});
          sinon.stub(tabTracker, 'hasFocus').returns(false);

          await tabTracker.toggleFocus();

          assertTabState({rendered: true, active: true});
          assert.isTrue(tabTracker.focus.called);
          assert.isFalse(workspace.getActivePane().activate.called);
        });

        it(`focuses the ${tabName} tab when it is already open, but blurred`, async function() {
          await tabTracker.ensureVisible();
          assertTabState({rendered: true, active: true});
          sinon.stub(tabTracker, 'hasFocus').returns(false);

          await tabTracker.toggleFocus();

          assertTabState({rendered: true, active: true});
          assert.isTrue(tabTracker.focus.called);
          assert.isFalse(workspace.getActivePane().activate.called);
        });

        it(`blurs the ${tabName} tab when it is already open and focused`, async function() {
          await tabTracker.ensureVisible();
          assertTabState({rendered: true, active: true});
          sinon.stub(tabTracker, 'hasFocus').returns(true);

          await tabTracker.toggleFocus();

          assertTabState({rendered: true, active: true});
          assert.isFalse(tabTracker.focus.called);
          assert.isTrue(workspace.getActivePane().activate.called);
        });
      });

      describe('ensureVisible()', function() {
        it(`opens the ${tabName} tab when it is initially closed`, async function() {
          assertTabState({rendered: false, active: false});
          assert.isTrue(await tabTracker.ensureVisible());
          assertTabState({rendered: true, active: true});
        });

        it(`does nothing when the ${tabName} tab is already open`, async function() {
          await tabTracker.toggle();
          assertTabState({rendered: true, active: true});
          assert.isFalse(await tabTracker.ensureVisible());
          assertTabState({rendered: true, active: true});
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

    it('initializes the current working directory if there is one', function() {
      app = React.cloneElement(app, {
        createRepositoryForProjectPath,
        activeWorkingDirectory: '/some/workdir',
      });
      const wrapper = shallow(app);

      wrapper.instance().initializeRepo();
      resolveInit();

      assert.isTrue(createRepositoryForProjectPath.calledWith('/some/workdir'));
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

  describe('integration tests', function() {
    it('mounts the FilePatchController as a PaneItem', async function() {
      const workdirPath = await cloneRepository('three-files');
      const repository = await buildRepository(workdirPath);
      const wrapper = mount(React.cloneElement(app, {repository}));

      const filePath = path.join(workdirPath, 'a.txt');
      await writeFile(filePath, 'wut\n');
      await wrapper.instance().showFilePatchForPath('a.txt', 'unstaged');

      const paneItem = workspace.getActivePaneItem();
      assert.isDefined(paneItem);
      assert.equal(paneItem.getTitle(), 'Unstaged Changes: a.txt');
    });

    // TODO: move out of integration tests, or can we use the openers?
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

          assert.equal(workspace.open.callCount, 1);
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

          assert.equal(workspace.open.callCount, 1);
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
});
