import fs from 'fs';
import path from 'path';
import temp from 'temp';
import until from 'test-until';

import {cloneRepository} from './helpers';
import {writeFile, deleteFileOrFolder, fileExists, getTempDir, realPath} from '../lib/helpers';
import GithubPackage from '../lib/github-package';

describe('GithubPackage', function() {
  let atomEnv, workspace, project, commandRegistry, notificationManager, grammars, config, confirm, tooltips, styles;
  let getLoadSettings, configDirPath, deserializers;
  let githubPackage, contextPool;

  beforeEach(function() {
    console.log('be: 1');
    atomEnv = global.buildAtomEnvironment();
    workspace = atomEnv.workspace;
    project = atomEnv.project;
    commandRegistry = atomEnv.commands;
    deserializers = atomEnv.deserializers;
    notificationManager = atomEnv.notifications;
    tooltips = atomEnv.tooltips;
    config = atomEnv.config;
    confirm = atomEnv.confirm.bind(atomEnv);
    styles = atomEnv.styles;
    grammars = atomEnv.grammars;
    getLoadSettings = atomEnv.getLoadSettings.bind(atomEnv);
    configDirPath = path.join(__dirname, 'fixtures', 'atomenv-config');
    console.log('be: 2');

    githubPackage = new GithubPackage(
      workspace, project, commandRegistry, notificationManager, tooltips, styles, grammars, confirm, config,
      deserializers, configDirPath, getLoadSettings,
    );
    console.log('be: 3');

    sinon.stub(githubPackage, 'rerender').callsFake(callback => {
      console.log('calling the FAKE rerender!');
      if (callback) {
        console.log('there is a callback to call... initiiating a setTimeout');
        process.nextTick(() => {
          console.log('Calling that callback from the nextTick!');
          callback();
        });
        // const handle = setTimeout(() => {
        //   console.log('Calling that callback from the setTimeout!');
        //   callback();
        // }, 0);
        console.log('the setTimeout call returned a handle:', handle);
      }
    });
    console.log('be: 4');

    contextPool = githubPackage.getContextPool();
    console.log('be: 5');
  });

  afterEach(async function() {
    console.log('ae: 1');
    await githubPackage.deactivate();
    console.log('ae: 2');
    atomEnv.destroy();
    console.log('ae: 3');
  });

  async function contextUpdateAfter(chunk) {
    console.log('cae: 1');
    const updatePromise = githubPackage.getSwitchboard().getFinishActiveContextUpdatePromise();
    console.log('cae: 2');
    await chunk();
    console.log('cae: 3');
    return updatePromise;
  }

  describe('construction', function() {
    let githubPackage1;

    afterEach(async function() {
      if (githubPackage1) {
        await githubPackage1.deactivate();
      }
    });

    async function constructWith(projectPaths, initialPaths) {
      const realProjectPaths = await Promise.all(
        projectPaths.map(projectPath => getTempDir({prefix: projectPath})),
      );

      project.setPaths(realProjectPaths);
      const getLoadSettings1 = () => ({initialPaths});

      githubPackage1 = new GithubPackage(
        workspace, project, commandRegistry, notificationManager, tooltips, styles, grammars, confirm, config,
        deserializers, configDirPath, getLoadSettings1,
      );
    }

    function assertAbsentLike() {
      const repository = githubPackage1.getActiveRepository();
      assert.isTrue(repository.isUndetermined());
      assert.isFalse(repository.showGitTabLoading());
      assert.isTrue(repository.showGitTabInit());
    }

    function assertLoadingLike() {
      const repository = githubPackage1.getActiveRepository();
      assert.isTrue(repository.isUndetermined());
      assert.isTrue(repository.showGitTabLoading());
      assert.isFalse(repository.showGitTabInit());
    }

    it('with no projects or initial paths begins with an absent-like undetermined context', async function() {
      await constructWith([], []);
      assertAbsentLike();
    });

    it('with one existing project begins with a loading-like undetermined context', async function() {
      await constructWith(['one'], []);
      assertLoadingLike();
    });

    it('with several existing projects begins with an absent-like undetermined context', async function() {
      await constructWith(['one', 'two'], []);
      assertAbsentLike();
    });

    it('with no projects but one initial path begins with a loading-like undetermined context', async function() {
      await constructWith([], ['one']);
      assertLoadingLike();
    });

    it('with no projects and several initial paths begins with an absent-like undetermined context', async function() {
      await constructWith([], ['one', 'two']);
      assertAbsentLike();
    });

    it('with one project and initial paths begins with a loading-like undetermined context', async function() {
      await constructWith(['one'], ['two', 'three']);
      assertLoadingLike();
    });

    it('with several projects and an initial path begins with an absent-like undetermined context', async function() {
      await constructWith(['one', 'two'], ['three']);
      assertAbsentLike();
    });
  });

  describe('activate()', function() {
    it('begins with an undetermined repository context', async function() {
      await contextUpdateAfter(() => githubPackage.activate());

      assert.isTrue(githubPackage.getActiveRepository().isUndetermined());
    });

    it('uses models from preexisting projects', async function() {
      console.log('1a');
      const [workdirPath1, workdirPath2, nonRepositoryPath] = await Promise.all([
        cloneRepository('three-files'),
        cloneRepository('three-files'),
        getTempDir(),
      ]);
      console.log('2a');
      project.setPaths([workdirPath1, workdirPath2, nonRepositoryPath]);
      console.log('3a');

      await contextUpdateAfter(() => githubPackage.activate());
      console.log('4a');

      console.log('5a');
      assert.isTrue(contextPool.getContext(workdirPath1).isPresent());
      console.log('6a');
      assert.isTrue(contextPool.getContext(workdirPath2).isPresent());
      console.log('7a');
      assert.isTrue(contextPool.getContext(nonRepositoryPath).isPresent());
      console.log('8a');

      assert.isTrue(githubPackage.getActiveRepository().isUndetermined());
      console.log('9a');
    });

    it('uses an active model from a single preexisting project', async function() {
      console.log('1b');
      const workdirPath = await cloneRepository('three-files');
      console.log('2b');
      project.setPaths([workdirPath]);
      console.log('3b');

      await contextUpdateAfter(() => githubPackage.activate());
      console.log('4b');

      const context = contextPool.getContext(workdirPath);
      console.log('5b');
      assert.isTrue(context.isPresent());
      console.log('6b');

      assert.strictEqual(context.getRepository(), githubPackage.getActiveRepository());
      console.log('7b');
      assert.strictEqual(context.getResolutionProgress(), githubPackage.getActiveResolutionProgress());
      console.log('8b');
      assert.equal(githubPackage.getActiveWorkdir(), workdirPath);
      console.log('9b');
    });

    it('uses an active model from a preexisting active pane item', async function() {
      const [workdirPath1, workdirPath2] = await Promise.all([
        cloneRepository('three-files'),
        cloneRepository('three-files'),
      ]);
      project.setPaths([workdirPath1, workdirPath2]);
      await workspace.open(path.join(workdirPath2, 'a.txt'));

      await contextUpdateAfter(() => githubPackage.activate());

      const context = contextPool.getContext(workdirPath2);
      assert.isTrue(context.isPresent());
      assert.strictEqual(context.getRepository(), githubPackage.getActiveRepository());
      assert.strictEqual(context.getResolutionProgress(), githubPackage.getActiveResolutionProgress());
      assert.equal(githubPackage.getActiveWorkdir(), workdirPath2);
    });

    it('uses an active model from serialized state', async function() {
      const [workdirPath1, workdirPath2, workdirPath3] = await Promise.all([
        cloneRepository('three-files'),
        cloneRepository('three-files'),
        cloneRepository('three-files'),
      ]);
      project.setPaths([workdirPath1, workdirPath2, workdirPath3]);

      await contextUpdateAfter(() => githubPackage.activate({
        activeRepositoryPath: workdirPath2,
      }));

      const context = contextPool.getContext(workdirPath2);
      assert.isTrue(context.isPresent());
      assert.strictEqual(context.getRepository(), githubPackage.getActiveRepository());
      assert.strictEqual(context.getResolutionProgress(), githubPackage.getActiveResolutionProgress());
      assert.equal(githubPackage.getActiveWorkdir(), workdirPath2);
    });

    it('prefers the active model from an active pane item to serialized state', async function() {
      const [workdirPath1, workdirPath2] = await Promise.all([
        cloneRepository('three-files'),
        cloneRepository('three-files'),
      ]);
      project.setPaths([workdirPath1, workdirPath2]);
      await workspace.open(path.join(workdirPath2, 'b.txt'));

      await contextUpdateAfter(() => githubPackage.activate({
        activeRepositoryPath: workdirPath1,
      }));

      const context = contextPool.getContext(workdirPath2);
      assert.isTrue(context.isPresent());
      assert.strictEqual(context.getRepository(), githubPackage.getActiveRepository());
      assert.strictEqual(context.getResolutionProgress(), githubPackage.getActiveResolutionProgress());
      assert.equal(githubPackage.getActiveWorkdir(), workdirPath2);
    });

    it('prefers the active model from a single project to serialized state', async function() {
      const [workdirPath1, workdirPath2] = await Promise.all([
        cloneRepository('three-files'),
        cloneRepository('three-files'),
      ]);
      project.setPaths([workdirPath1]);

      await contextUpdateAfter(() => githubPackage.activate({
        activeRepositoryPath: workdirPath2,
      }));

      const context = contextPool.getContext(workdirPath1);
      assert.isTrue(context.isPresent());
      assert.strictEqual(context.getRepository(), githubPackage.getActiveRepository());
      assert.strictEqual(context.getResolutionProgress(), githubPackage.getActiveResolutionProgress());
      assert.equal(githubPackage.getActiveWorkdir(), workdirPath1);
    });

    it('restores the active resolution progress', async function() {
      // Repository with a merge conflict, repository without a merge conflict, path without a repository
      const workdirMergeConflict = await cloneRepository('merge-conflict');
      const workdirNoConflict = await cloneRepository('three-files');
      const nonRepositoryPath = await realPath(temp.mkdirSync());
      fs.writeFileSync(path.join(nonRepositoryPath, 'c.txt'));

      project.setPaths([workdirMergeConflict, workdirNoConflict, nonRepositoryPath]);
      await contextUpdateAfter(() => githubPackage.activate());

      // Open a file in the merge conflict repository.
      await workspace.open(path.join(workdirMergeConflict, 'modified-on-both-ours.txt'));
      await githubPackage.scheduleActiveContextUpdate();

      const resolutionMergeConflict = contextPool.getContext(workdirMergeConflict).getResolutionProgress();
      await assert.strictEqual(githubPackage.getActiveResolutionProgress(), resolutionMergeConflict);

      // Record some resolution progress to recall later
      resolutionMergeConflict.reportMarkerCount('modified-on-both-ours.txt', 3);

      // Open a file in the non-merge conflict repository.
      await workspace.open(path.join(workdirNoConflict, 'b.txt'));
      await githubPackage.scheduleActiveContextUpdate();

      const resolutionNoConflict = contextPool.getContext(workdirNoConflict).getResolutionProgress();
      assert.strictEqual(githubPackage.getActiveResolutionProgress(), resolutionNoConflict);
      assert.isTrue(githubPackage.getActiveResolutionProgress().isEmpty());

      // Open a file in the workdir with no repository.
      await workspace.open(path.join(nonRepositoryPath, 'c.txt'));
      await githubPackage.scheduleActiveContextUpdate();

      assert.isTrue(githubPackage.getActiveResolutionProgress().isEmpty());

      // Re-open a file in the merge conflict repository.
      await workspace.open(path.join(workdirMergeConflict, 'modified-on-both-theirs.txt'));
      await githubPackage.scheduleActiveContextUpdate();

      assert.strictEqual(githubPackage.getActiveResolutionProgress(), resolutionMergeConflict);
      assert.isFalse(githubPackage.getActiveResolutionProgress().isEmpty());
      assert.equal(githubPackage.getActiveResolutionProgress().getRemaining('modified-on-both-ours.txt'), 3);
    });

    describe('startOpen', function() {
      let confFile;

      beforeEach(async function() {
        confFile = path.join(configDirPath, 'github.cson');
        await deleteFileOrFolder(confFile);
      });

      it('renders with startOpen on the first run', async function() {
        config.set('welcome.showOnStartup', false);
        await githubPackage.activate();

        assert.isTrue(githubPackage.startOpen);
        assert.isTrue(await fileExists(confFile));
      });

      it('renders without startOpen on non-first runs', async function() {
        await writeFile(confFile, '');
        await githubPackage.activate();

        assert.isFalse(githubPackage.startOpen);
        assert.isTrue(await fileExists(confFile));
      });

      it('renders without startOpen on the first run if the welcome pane is shown', async function() {
        config.set('welcome.showOnStartup', true);
        await githubPackage.activate();

        assert.isFalse(githubPackage.startOpen);
        assert.isTrue(await fileExists(confFile));
      });
    });
  });

  describe('when the project paths change', function() {
    it('adds new workdirs to the pool', async function() {
      const [workdirPath1, workdirPath2, workdirPath3] = await Promise.all([
        cloneRepository('three-files'),
        cloneRepository('three-files'),
        cloneRepository('three-files'),
      ]);

      project.setPaths([workdirPath1, workdirPath2]);
      await contextUpdateAfter(() => githubPackage.activate());

      assert.isTrue(contextPool.getContext(workdirPath1).isPresent());
      assert.isTrue(contextPool.getContext(workdirPath2).isPresent());
      assert.isFalse(contextPool.getContext(workdirPath3).isPresent());

      await contextUpdateAfter(() => project.setPaths([workdirPath1, workdirPath2, workdirPath3]));

      assert.isTrue(contextPool.getContext(workdirPath1).isPresent());
      assert.isTrue(contextPool.getContext(workdirPath2).isPresent());
      assert.isTrue(contextPool.getContext(workdirPath3).isPresent());
    });

    it('destroys contexts associated with the removed project folders', async function() {
      const [workdirPath1, workdirPath2, workdirPath3] = await Promise.all([
        cloneRepository('three-files'),
        cloneRepository('three-files'),
        cloneRepository('three-files'),
      ]);
      project.setPaths([workdirPath1, workdirPath2, workdirPath3]);
      await contextUpdateAfter(() => githubPackage.activate());

      const [repository1, repository2, repository3] = [workdirPath1, workdirPath2, workdirPath3].map(workdir => {
        return contextPool.getContext(workdir).getRepository();
      });

      sinon.stub(repository1, 'destroy');
      sinon.stub(repository2, 'destroy');
      sinon.stub(repository3, 'destroy');

      await contextUpdateAfter(() => project.removePath(workdirPath1));
      await contextUpdateAfter(() => project.removePath(workdirPath3));

      assert.equal(repository1.destroy.callCount, 1);
      assert.equal(repository3.destroy.callCount, 1);
      assert.isFalse(repository2.destroy.called);

      assert.isFalse(contextPool.getContext(workdirPath1).isPresent());
      assert.isFalse(contextPool.getContext(workdirPath3).isPresent());
      assert.isTrue(contextPool.getContext(workdirPath2).isPresent());
    });

    it('returns to an absent context when the last project folder is removed', async function() {
      const workdirPath = await cloneRepository('three-files');
      project.setPaths([workdirPath]);
      await contextUpdateAfter(() => githubPackage.activate());

      assert.isTrue(githubPackage.getActiveRepository().isLoading() || githubPackage.getActiveRepository().isPresent());

      await contextUpdateAfter(() => project.setPaths([]));

      assert.isTrue(githubPackage.getActiveRepository().isAbsent());
    });

    it('does not transition away from an absent guess when no project folders are present', async function() {
      await contextUpdateAfter(() => githubPackage.activate());

      assert.isTrue(githubPackage.getActiveRepository().isAbsentGuess());
    });
  });

  describe('when the active pane item changes', function() {
    it('becomes the active context', async function() {
      const [workdirPath1, workdirPath2] = await Promise.all([
        cloneRepository('three-files'),
        cloneRepository('three-files'),
      ]);
      project.setPaths([workdirPath1, workdirPath2]);

      await contextUpdateAfter(() => githubPackage.activate());

      const repository2 = contextPool.getContext(workdirPath2).getRepository();
      assert.isTrue(githubPackage.getActiveRepository().isUndetermined());

      await contextUpdateAfter(() => workspace.open(path.join(workdirPath2, 'b.txt')));

      assert.strictEqual(githubPackage.getActiveRepository(), repository2);
    });

    it('adds a new context if not in a project', async function() {
      const [workdirPath1, workdirPath2] = await Promise.all([
        cloneRepository('three-files'),
        cloneRepository('three-files'),
      ]);
      project.setPaths([workdirPath1]);

      await contextUpdateAfter(() => githubPackage.activate());

      assert.isFalse(contextPool.getContext(workdirPath2).isPresent());

      await contextUpdateAfter(() => workspace.open(path.join(workdirPath2, 'c.txt')));

      assert.equal(githubPackage.getActiveWorkdir(), workdirPath2);
      assert.isTrue(contextPool.getContext(workdirPath2).isPresent());
    });

    it('removes a context if not in a project', async function() {
      const [workdirPath1, workdirPath2] = await Promise.all([
        cloneRepository('three-files'),
        cloneRepository('three-files'),
      ]);
      project.setPaths([workdirPath1]);
      await contextUpdateAfter(() => githubPackage.activate());

      await contextUpdateAfter(() => workspace.open(path.join(workdirPath2, 'c.txt')));
      assert.isTrue(contextPool.getContext(workdirPath2).isPresent());

      await contextUpdateAfter(() => workspace.getActivePane().destroyActiveItem());
      assert.isFalse(contextPool.getContext(workdirPath2).isPresent());
    });
  });

  describe('scheduleActiveContextUpdate()', function() {
    beforeEach(function() {
      // Necessary since we skip activate()
      githubPackage.savedState = {};
      githubPackage.useLegacyPanels = !workspace.getLeftDock;
    });

    it('prefers the context of the active pane item', async function() {
      const [workdirPath1, workdirPath2, workdirPath3] = await Promise.all([
        cloneRepository('three-files'),
        cloneRepository('three-files'),
        cloneRepository('three-files'),
      ]);
      project.setPaths([workdirPath1]);
      await workspace.open(path.join(workdirPath2, 'a.txt'));

      await githubPackage.scheduleActiveContextUpdate({
        activeRepositoryPath: workdirPath3,
      });

      assert.equal(githubPackage.getActiveWorkdir(), workdirPath2);
    });

    it('uses an absent context when the active item is not in a git repository', async function() {
      const nonRepositoryPath = await realPath(temp.mkdirSync());
      const workdir = await cloneRepository('three-files');
      project.setPaths([nonRepositoryPath, workdir]);
      await writeFile(path.join(nonRepositoryPath, 'a.txt'), 'stuff');

      await workspace.open(path.join(nonRepositoryPath, 'a.txt'));

      await githubPackage.scheduleActiveContextUpdate();

      assert.isTrue(githubPackage.getActiveRepository().isAbsent());
    });

    it('uses the context of the PaneItem active in the workspace center', async function() {
      if (!workspace.getLeftDock) {
        this.skip();
      }

      const [workdir0, workdir1] = await Promise.all([
        cloneRepository('three-files'),
        cloneRepository('three-files'),
      ]);
      project.setPaths([workdir1]);

      await workspace.open(path.join(workdir0, 'a.txt'));
      commandRegistry.dispatch(atomEnv.views.getView(workspace), 'tree-view:toggle-focus');
      workspace.getLeftDock().activate();

      await githubPackage.scheduleActiveContextUpdate();

      assert.equal(githubPackage.getActiveWorkdir(), workdir0);
    });

    it('uses the context of a single open project', async function() {
      const [workdirPath1, workdirPath2] = await Promise.all([
        cloneRepository('three-files'),
        cloneRepository('three-files'),
      ]);
      project.setPaths([workdirPath1]);

      await githubPackage.scheduleActiveContextUpdate({
        activeRepositoryPath: workdirPath2,
      });

      assert.equal(githubPackage.getActiveWorkdir(), workdirPath1);
    });

    it('uses an empty context with a single open project without a git workdir', async function() {
      const nonRepositoryPath = await getTempDir();
      project.setPaths([nonRepositoryPath]);

      await githubPackage.scheduleActiveContextUpdate();
      await githubPackage.getActiveRepository().getLoadPromise();

      assert.isTrue(contextPool.getContext(nonRepositoryPath).isPresent());
      assert.isTrue(githubPackage.getActiveRepository().isEmpty());
      assert.isFalse(githubPackage.getActiveRepository().isAbsent());
    });

    it('activates a saved context state', async function() {
      const [workdirPath1, workdirPath2] = await Promise.all([
        cloneRepository('three-files'),
        cloneRepository('three-files'),
      ]);
      project.setPaths([workdirPath1, workdirPath2]);

      await githubPackage.scheduleActiveContextUpdate({
        activeRepositoryPath: workdirPath2,
      });

      assert.equal(githubPackage.getActiveWorkdir(), workdirPath2);
    });

    it('falls back to keeping the context the same', async function() {
      const [workdirPath1, workdirPath2] = await Promise.all([
        cloneRepository('three-files'),
        cloneRepository('three-files'),
      ]);
      project.setPaths([workdirPath1, workdirPath2]);

      contextPool.set([workdirPath1, workdirPath2]);
      githubPackage.setActiveContext(contextPool.getContext(workdirPath1));

      await githubPackage.scheduleActiveContextUpdate();

      assert.equal(githubPackage.getActiveWorkdir(), workdirPath1);
    });

    it('discovers a context from an open subdirectory', async function() {
      const workdirPath = await cloneRepository('three-files');
      const projectPath = path.join(workdirPath, 'subdir-1');
      project.setPaths([projectPath]);

      await githubPackage.scheduleActiveContextUpdate();

      assert.equal(githubPackage.getActiveWorkdir(), workdirPath);
    });

    it('reverts to an empty context if the active repository is destroyed', async function() {
      const workdirPath = await cloneRepository('three-files');
      project.setPaths([workdirPath]);

      await githubPackage.scheduleActiveContextUpdate();

      assert.isTrue(contextPool.getContext(workdirPath).isPresent());
      const repository = contextPool.getContext(workdirPath).getRepository();

      repository.destroy();

      assert.isTrue(githubPackage.getActiveRepository().isAbsent());
    });

    // Don't worry about this on Windows as it's not a common op
    if (process.platform !== 'win32') {
      it('handles symlinked project paths', async function() {
        const workdirPath = await cloneRepository('three-files');
        const symlinkPath = await realPath(temp.mkdirSync()) + '-symlink';
        fs.symlinkSync(workdirPath, symlinkPath);
        project.setPaths([symlinkPath]);
        await workspace.open(path.join(symlinkPath, 'a.txt'));

        await githubPackage.scheduleActiveContextUpdate();
        await assert.async.isOk(githubPackage.getActiveRepository());
      });
    }
  });

  describe('when there is a change in the repository', function() {
    let workdirPath1, atomGitRepository1, repository1;
    let workdirPath2, atomGitRepository2, repository2;

    beforeEach(async function() {
      [workdirPath1, workdirPath2] = await Promise.all([
        cloneRepository('three-files'),
        cloneRepository('three-files'),
      ]);

      fs.writeFileSync(path.join(workdirPath1, 'c.txt'), 'ch-ch-ch-changes', 'utf8');
      fs.writeFileSync(path.join(workdirPath2, 'c.txt'), 'ch-ch-ch-changes', 'utf8');

      project.setPaths([workdirPath1, workdirPath2]);
      await githubPackage.activate();

      const watcherPromises = [
        until(() => contextPool.getContext(workdirPath1).getChangeObserver().isStarted()),
        until(() => contextPool.getContext(workdirPath2).getChangeObserver().isStarted()),
      ];

      if (project.getWatcherPromise) {
        watcherPromises.push(project.getWatcherPromise(workdirPath1));
        watcherPromises.push(project.getWatcherPromise(workdirPath2));
      }

      await Promise.all(watcherPromises);

      [atomGitRepository1, atomGitRepository2] = githubPackage.project.getRepositories();
      sinon.stub(atomGitRepository1, 'refreshStatus');
      sinon.stub(atomGitRepository2, 'refreshStatus');

      repository1 = contextPool.getContext(workdirPath1).getRepository();
      repository2 = contextPool.getContext(workdirPath2).getRepository();
      sinon.stub(repository1, 'observeFilesystemChange');
      sinon.stub(repository2, 'observeFilesystemChange');
    });

    it('refreshes the appropriate Repository and Atom GitRepository when a file is changed in workspace 1', async function() {
      if (process.platform === 'linux') {
        this.skip();
      }

      fs.writeFileSync(path.join(workdirPath1, 'a.txt'), 'some changes', 'utf8');

      await assert.async.isTrue(repository1.observeFilesystemChange.called);
      await assert.async.isTrue(atomGitRepository1.refreshStatus.called);
    });

    it('refreshes the appropriate Repository and Atom GitRepository when a file is changed in workspace 2', async function() {
      if (process.platform === 'linux') {
        this.skip();
      }

      fs.writeFileSync(path.join(workdirPath2, 'b.txt'), 'other changes', 'utf8');

      await assert.async.isTrue(repository2.observeFilesystemChange.called);
      await assert.async.isTrue(atomGitRepository2.refreshStatus.called);
    });

    it('refreshes the appropriate Repository and Atom GitRepository when a commit is made in workspace 1', async function() {
      await repository1.git.exec(['commit', '-am', 'commit in repository1']);

      await assert.async.isTrue(repository1.observeFilesystemChange.called);
      await assert.async.isTrue(atomGitRepository1.refreshStatus.called);
    });

    it('refreshes the appropriate Repository and Atom GitRepository when a commit is made in workspace 2', async function() {
      await repository2.git.exec(['commit', '-am', 'commit in repository2']);

      await assert.async.isTrue(repository2.observeFilesystemChange.called);
      await assert.async.isTrue(atomGitRepository2.refreshStatus.called);
    });
  });

  describe('createRepositoryForProjectPath()', function() {
    it('creates and sets a repository for the given project path', async function() {
      const nonRepositoryPath = await getTempDir();
      project.setPaths([nonRepositoryPath]);

      await contextUpdateAfter(() => githubPackage.activate());
      await githubPackage.getActiveRepository().getLoadPromise();

      assert.isTrue(githubPackage.getActiveRepository().isEmpty());
      assert.isFalse(githubPackage.getActiveRepository().isAbsent());

      await githubPackage.createRepositoryForProjectPath(nonRepositoryPath);

      assert.isTrue(githubPackage.getActiveRepository().isPresent());
      assert.strictEqual(
        githubPackage.getActiveRepository(),
        await contextPool.getContext(nonRepositoryPath).getRepository(),
      );
    });
  });
});
