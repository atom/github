import fs from 'fs-extra';
import path from 'path';
import temp from 'temp';
import until from 'test-until';

import {cloneRepository, disableFilesystemWatchers} from './helpers';
import {fileExists, getTempDir} from '../lib/helpers';
import GithubPackage from '../lib/github-package';

describe('GithubPackage', function() {
  async function contextUpdateAfter(githubPackage, chunk) {
    const updatePromise = githubPackage.getSwitchboard().getFinishActiveContextUpdatePromise();
    await chunk();
    return updatePromise;
  }

  describe('construction', function() {
    let atomEnv;
    beforeEach(async function() {
      atomEnv = global.buildAtomEnvironment();
      await disableFilesystemWatchers(atomEnv);
    });

    afterEach(function() {
      atomEnv.destroy();
    });

    async function constructWith(projectPaths, initialPaths) {
      const realProjectPaths = await Promise.all(
        projectPaths.map(projectPath => getTempDir({prefix: projectPath})),
      );

      const {
        workspace, project, commands, notificationManager, tooltips,
        deserializers, config, keymaps, styles, grammars,
      } = atomEnv;

      const confirm = atomEnv.confirm.bind(atomEnv);
      const currentWindow = atomEnv.getCurrentWindow();
      const configDirPath = path.join(__dirname, 'fixtures', 'atomenv-config');
      const getLoadSettings = () => ({initialPaths});

      project.setPaths(realProjectPaths);

      return new GithubPackage({
        workspace, project, commands, notificationManager, tooltips,
        styles, grammars, keymaps, config, deserializers, confirm,
        getLoadSettings, currentWindow, configDirPath,
      });
    }

    function assertAbsentLike(githubPackage) {
      const repository = githubPackage.getActiveRepository();
      assert.isTrue(repository.isUndetermined());
      assert.isFalse(repository.showGitTabLoading());
      assert.isTrue(repository.showGitTabInit());
    }

    function assertLoadingLike(githubPackage) {
      const repository = githubPackage.getActiveRepository();
      assert.isTrue(repository.isUndetermined());
      assert.isTrue(repository.showGitTabLoading());
      assert.isFalse(repository.showGitTabInit());
    }

    it('with no projects or initial paths begins with an absent-like undetermined context', async function() {
      const githubPackage = await constructWith([], []);
      assertAbsentLike(githubPackage);
    });

    it('with one existing project begins with a loading-like undetermined context', async function() {
      const githubPackage = await constructWith(['one'], []);
      assertLoadingLike(githubPackage);
    });

    it('with several existing projects begins with an absent-like undetermined context', async function() {
      const githubPackage = await constructWith(['one', 'two'], []);
      assertAbsentLike(githubPackage);
    });

    it('with no projects but one initial path begins with a loading-like undetermined context', async function() {
      const githubPackage = await constructWith([], ['one']);
      assertLoadingLike(githubPackage);
    });

    it('with no projects and several initial paths begins with an absent-like undetermined context', async function() {
      const githubPackage = await constructWith([], ['one', 'two']);
      assertAbsentLike(githubPackage);
    });

    it('with one project and initial paths begins with a loading-like undetermined context', async function() {
      const githubPackage = await constructWith(['one'], ['two', 'three']);
      assertLoadingLike(githubPackage);
    });

    it('with several projects and an initial path begins with an absent-like undetermined context', async function() {
      const githubPackage = await constructWith(['one', 'two'], ['three']);
      assertAbsentLike(githubPackage);
    });
  });

  describe('activate()', function() {
    let atomEnv, githubPackage;
    let workspace, project, commands, notificationManager;
    let tooltips, deserializers, config, keymaps, styles;
    let grammars, confirm, configDirPath, getLoadSettings;
    let renderFn, contextPool, currentWindow;

    beforeEach(async function() {
      atomEnv = global.buildAtomEnvironment();
      await disableFilesystemWatchers(atomEnv);

      workspace = atomEnv.workspace;
      project = atomEnv.project;
      commands = atomEnv.commands;
      deserializers = atomEnv.deserializers;
      notificationManager = atomEnv.notifications;
      tooltips = atomEnv.tooltips;
      config = atomEnv.config;
      keymaps = atomEnv.keymaps;
      confirm = atomEnv.confirm.bind(atomEnv);
      styles = atomEnv.styles;
      grammars = atomEnv.grammars;
      getLoadSettings = atomEnv.getLoadSettings.bind(atomEnv);
      currentWindow = atomEnv.getCurrentWindow();
      configDirPath = path.join(__dirname, 'fixtures', 'atomenv-config');

      githubPackage = new GithubPackage({
        workspace, project, commands, notificationManager, tooltips,
        styles, grammars, keymaps, config, deserializers, confirm,
        getLoadSettings, currentWindow, configDirPath, renderFn,
      });

      contextPool = githubPackage.getContextPool();
    });

    afterEach(async function() {
      await githubPackage.deactivate();

      atomEnv.destroy();
    });

    context('when given no project, state, or active pane', function() {
      beforeEach(async function() {
        await contextUpdateAfter(githubPackage, () => githubPackage.activate());
      });

      it('uses an undetermined repository context', function() {
        assert.isTrue(githubPackage.getActiveRepository().isUndetermined());
      });
    });

    context('when given only 1 project', function() {
      let workdirPath;
      beforeEach(async function() {
        workdirPath = await cloneRepository('three-files');
        project.setPaths([workdirPath]);

        await contextUpdateAfter(githubPackage, () => githubPackage.activate());
      });

      it('uses the project\'s context', function() {
        const context = contextPool.getContext(workdirPath);
        assert.isTrue(context.isPresent());
        assert.equal(githubPackage.getActiveWorkdir(), workdirPath);
        assert.strictEqual(context.getRepository(), githubPackage.getActiveRepository());
        assert.strictEqual(context.getResolutionProgress(), githubPackage.getActiveResolutionProgress());
      });
    });

    context('when given only projects', function() {
      let workdirPath1, workdirPath2, nonRepositoryPath;
      beforeEach(async function() {
        ([workdirPath1, workdirPath2, nonRepositoryPath] = await Promise.all([
          cloneRepository('three-files'),
          cloneRepository('three-files'),
          getTempDir(),
        ]));
        project.setPaths([workdirPath1, workdirPath2, nonRepositoryPath]);

        await contextUpdateAfter(githubPackage, () => githubPackage.activate());
      });


      it('uses an undetermined repository context', function() {
        assert.isTrue(githubPackage.getActiveRepository().isUndetermined());
      });

      it('creates contexts from preexisting projects', function() {
        assert.isTrue(contextPool.getContext(workdirPath1).isPresent());
        assert.isTrue(contextPool.getContext(workdirPath2).isPresent());
        assert.isTrue(contextPool.getContext(nonRepositoryPath).isPresent());
      });
    });

    context('when given projects and an active pane', function() {
      let workdirPath1, workdirPath2;
      beforeEach(async function() {
        ([workdirPath1, workdirPath2] = await Promise.all([
          cloneRepository('three-files'),
          cloneRepository('three-files'),
        ]));
        project.setPaths([workdirPath1, workdirPath2]);
        await workspace.open(path.join(workdirPath2, 'a.txt'));

        await contextUpdateAfter(githubPackage, () => githubPackage.activate());
      });

      it('uses the active pane\'s context', function() {
        const context = contextPool.getContext(workdirPath2);
        assert.isTrue(context.isPresent());
        assert.strictEqual(context.getRepository(), githubPackage.getActiveRepository());
        assert.strictEqual(context.getResolutionProgress(), githubPackage.getActiveResolutionProgress());
        assert.equal(githubPackage.getActiveWorkdir(), workdirPath2);
      });
    });

    context('when given projects and state', function() {
      let workdirPath1, workdirPath2, workdirPath3;
      beforeEach(async function() {
        ([workdirPath1, workdirPath2, workdirPath3] = await Promise.all([
          cloneRepository('three-files'),
          cloneRepository('three-files'),
          cloneRepository('three-files'),
        ]));
        project.setPaths([workdirPath1, workdirPath2, workdirPath3]);

        await contextUpdateAfter(githubPackage, () => githubPackage.activate({
          activeRepositoryPath: workdirPath2,
        }));
      });

      it('uses the serialized state\'s context', function() {
        const context = contextPool.getContext(workdirPath2);
        assert.isTrue(context.isPresent());
        assert.strictEqual(context.getRepository(), githubPackage.getActiveRepository());
        assert.strictEqual(context.getResolutionProgress(), githubPackage.getActiveResolutionProgress());
        assert.equal(githubPackage.getActiveWorkdir(), workdirPath2);
      });
    });

    context('when given projects, state, and an active pane', function() {
      let workdirPath1, workdirPath2;
      beforeEach(async function() {
        ([workdirPath1, workdirPath2] = await Promise.all([
          cloneRepository('three-files'),
          cloneRepository('three-files'),
        ]));
        project.setPaths([workdirPath1, workdirPath2]);
        await workspace.open(path.join(workdirPath2, 'b.txt'));

        await contextUpdateAfter(githubPackage, () => githubPackage.activate({
          activeRepositoryPath: workdirPath1,
        }));
      });

      it('uses the active pane\'s context', async function() {
        const context = contextPool.getContext(workdirPath2);
        assert.isTrue(context.isPresent());
        assert.strictEqual(context.getRepository(), githubPackage.getActiveRepository());
        assert.strictEqual(context.getResolutionProgress(), githubPackage.getActiveResolutionProgress());
        assert.equal(githubPackage.getActiveWorkdir(), workdirPath2);
      });
    });

    context('when given 1 project and state', function() {
      let workdirPath1, workdirPath2;
      beforeEach(async function() {
        ([workdirPath1, workdirPath2] = await Promise.all([
          cloneRepository('three-files'),
          cloneRepository('three-files'),
        ]));
        project.setPaths([workdirPath1]);

        await contextUpdateAfter(githubPackage, () => githubPackage.activate({
          activeRepositoryPath: workdirPath2,
        }));
      });

      it('uses the project\'s context', function() {
        const context = contextPool.getContext(workdirPath1);
        assert.isTrue(context.isPresent());
        assert.strictEqual(context.getRepository(), githubPackage.getActiveRepository());
        assert.strictEqual(context.getResolutionProgress(), githubPackage.getActiveResolutionProgress());
        assert.equal(githubPackage.getActiveWorkdir(), workdirPath1);
      });
    });

    context('with showOnStartup and no config file', function() {
      let confFile;
      beforeEach(async function() {
        confFile = path.join(configDirPath, 'github.cson');
        await fs.remove(confFile);

        config.set('welcome.showOnStartup', true);
        await githubPackage.activate();
      });

      it('renders with startOpen', function() {
        assert.isTrue(githubPackage.startOpen);
      });

      it('renders without startRevealed', function() {
        assert.isFalse(githubPackage.startRevealed);
      });

      it('writes a configFile', async function() {
        assert.isTrue(await fileExists(confFile));
      });
    });

    context('with showOnStartup and no config file', function() {
      let confFile;
      beforeEach(async function() {
        confFile = path.join(configDirPath, 'github.cson');
        await fs.remove(confFile);

        config.set('welcome.showOnStartup', false);
        await githubPackage.activate();
      });

      it('renders with startOpen', function() {
        assert.isTrue(githubPackage.startOpen);
      });

      it('renders without startRevealed', function() {
        assert.isTrue(githubPackage.startRevealed);
      });

      it('writes a configFile', async function() {
        assert.isTrue(await fileExists(confFile));
      });
    });

    context('when it\'s not the first run for new projects', function() {
      let confFile;
      beforeEach(async function() {
        confFile = path.join(configDirPath, 'github.cson');
        await fs.writeFile(confFile, '', {encoding: 'utf8'});
        await githubPackage.activate();
      });

      it('renders with startOpen', function() {
        assert.isTrue(githubPackage.startOpen);
      });

      it('renders without startRevealed', function() {
        assert.isFalse(githubPackage.startRevealed);
      });

      it('has a config file', async function() {
        assert.isTrue(await fileExists(confFile));
      });
    });

    context('when it\'s not the first run for existing projects', function() {
      let confFile;
      beforeEach(async function() {
        confFile = path.join(configDirPath, 'github.cson');
        await fs.writeFile(confFile, '', {encoding: 'utf8'});
        await githubPackage.activate({newProject: false});
      });

      it('renders without startOpen', function() {
        assert.isFalse(githubPackage.startOpen);
      });

      it('renders without startRevealed', function() {
        assert.isFalse(githubPackage.startRevealed);
      });

      it('has a config file', async function() {
        assert.isTrue(await fileExists(confFile));
      });
    });
  });

  /*describe('scheduleActiveContextUpdate()', function() {
    beforeEach(function() {
      // Necessary since we skip activate()
      githubPackage.savedState = {};
      githubPackage.useLegacyPanels = !workspace.getLeftDock;
    });
    context('when the active pane item changes', function() {
      it('becomes the active context', async function() {
        const [workdirPath1, workdirPath2] = await Promise.all([
          cloneRepository('three-files'),
          cloneRepository('three-files'),
        ]);
        project.setPaths([workdirPath1, workdirPath2]);

        await contextUpdateAfter(githubPackage, () => githubPackage.activate());

        const repository2 = contextPool.getContext(workdirPath2).getRepository();
        assert.isTrue(githubPackage.getActiveRepository().isUndetermined());

        await contextUpdateAfter(githubPackage, () => workspace.open(path.join(workdirPath2, 'b.txt')));

        assert.strictEqual(githubPackage.getActiveRepository(), repository2);
      });

      it('adds a new context if not in a project', async function() {
        const [workdirPath1, workdirPath2] = await Promise.all([
          cloneRepository('three-files'),
          cloneRepository('three-files'),
        ]);
        project.setPaths([workdirPath1]);

        await contextUpdateAfter(githubPackage, () => githubPackage.activate());

        assert.isFalse(contextPool.getContext(workdirPath2).isPresent());

        await contextUpdateAfter(githubPackage, () => workspace.open(path.join(workdirPath2, 'c.txt')));

        assert.equal(githubPackage.getActiveWorkdir(), workdirPath2);
        assert.isTrue(contextPool.getContext(workdirPath2).isPresent());
      });

      it('removes a context if not in a project', async function() {
        const [workdirPath1, workdirPath2] = await Promise.all([
          cloneRepository('three-files'),
          cloneRepository('three-files'),
        ]);
        project.setPaths([workdirPath1]);
        await contextUpdateAfter(githubPackage, () => githubPackage.activate());

        await contextUpdateAfter(githubPackage, () => workspace.open(path.join(workdirPath2, 'c.txt')));
        assert.isTrue(contextPool.getContext(workdirPath2).isPresent());

        await contextUpdateAfter(githubPackage, () => workspace.getActivePane().destroyActiveItem());
        assert.isFalse(contextPool.getContext(workdirPath2).isPresent());
      });
    });

    context('when the project paths change', function() {
      it('adds new workdirs to the pool', async function() {
        const [workdirPath1, workdirPath2, workdirPath3] = await Promise.all([
          cloneRepository('three-files'),
          cloneRepository('three-files'),
          cloneRepository('three-files'),
        ]);

        project.setPaths([workdirPath1, workdirPath2]);
        await contextUpdateAfter(githubPackage, () => githubPackage.activate());

        assert.isTrue(contextPool.getContext(workdirPath1).isPresent());
        assert.isTrue(contextPool.getContext(workdirPath2).isPresent());
        assert.isFalse(contextPool.getContext(workdirPath3).isPresent());

        await contextUpdateAfter(githubPackage, () => project.setPaths([workdirPath1, workdirPath2, workdirPath3]));

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
        await contextUpdateAfter(githubPackage, () => githubPackage.activate());

        const [repository1, repository2, repository3] = [workdirPath1, workdirPath2, workdirPath3].map(workdir => {
          return contextPool.getContext(workdir).getRepository();
        });

        sinon.stub(repository1, 'destroy');
        sinon.stub(repository2, 'destroy');
        sinon.stub(repository3, 'destroy');

        await contextUpdateAfter(githubPackage, () => project.removePath(workdirPath1));
        await contextUpdateAfter(githubPackage, () => project.removePath(workdirPath3));

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
        await contextUpdateAfter(githubPackage, () => githubPackage.activate());

        assert.isTrue(githubPackage.getActiveRepository().isLoading() || githubPackage.getActiveRepository().isPresent());

        await contextUpdateAfter(githubPackage, () => project.setPaths([]));

        assert.isTrue(githubPackage.getActiveRepository().isAbsent());
      });

      it('does not transition away from an absent guess when no project folders are present', async function() {
        await contextUpdateAfter(githubPackage, () => githubPackage.activate());

        assert.isTrue(githubPackage.getActiveRepository().isAbsentGuess());
      });
    });

    it('restores the active resolution progress', async function() {
      // Repository with a merge conflict, repository without a merge conflict, path without a repository
      const workdirMergeConflict = await cloneRepository('merge-conflict');
      const workdirNoConflict = await cloneRepository('three-files');
      const nonRepositoryPath = await fs.realpath(temp.mkdirSync());
      fs.writeFileSync(path.join(nonRepositoryPath, 'c.txt'));

      project.setPaths([workdirMergeConflict, workdirNoConflict, nonRepositoryPath]);
      await contextUpdateAfter(githubPackage, () => githubPackage.activate());

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
      const nonRepositoryPath = await fs.realpath(temp.mkdirSync());
      const workdir = await cloneRepository('three-files');
      project.setPaths([nonRepositoryPath, workdir]);
      await fs.writeFile(path.join(nonRepositoryPath, 'a.txt'), 'stuff', {encoding: 'utf8'});

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
      commands.dispatch(atomEnv.views.getView(workspace), 'tree-view:toggle-focus');
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
        const symlinkPath = (await fs.realpath(temp.mkdirSync())) + '-symlink';
        fs.symlinkSync(workdirPath, symlinkPath);
        project.setPaths([symlinkPath]);
        await workspace.open(path.join(symlinkPath, 'a.txt'));

        await githubPackage.scheduleActiveContextUpdate();
        await assert.async.isOk(githubPackage.getActiveRepository());
      });
    }
  });

  /*describe('when there is a change in the repository', function() {
    let workdirPath1, atomGitRepository1, repository1;
    let workdirPath2, atomGitRepository2, repository2;

    beforeEach(async function() {
      this.retries(5); // FLAKE

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
      this.retries(5); // FLAKE

      fs.writeFileSync(path.join(workdirPath1, 'a.txt'), 'some changes', 'utf8');

      await assert.async.isTrue(repository1.observeFilesystemChange.called);
      await assert.async.isTrue(atomGitRepository1.refreshStatus.called);
    });

    it('refreshes the appropriate Repository and Atom GitRepository when a file is changed in workspace 2', async function() {
      if (process.platform === 'linux') {
        this.skip();
      }
      this.retries(5); // FLAKE

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

  /*describe('initialize', function() {
    it('creates and sets a repository for the given project path', async function() {
      const nonRepositoryPath = await getTempDir();
      project.setPaths([nonRepositoryPath]);

      await contextUpdateAfter(githubPackage, () => githubPackage.activate());
      await githubPackage.getActiveRepository().getLoadPromise();

      assert.isTrue(githubPackage.getActiveRepository().isEmpty());
      assert.isFalse(githubPackage.getActiveRepository().isAbsent());

      await githubPackage.initialize(nonRepositoryPath);

      assert.isTrue(githubPackage.getActiveRepository().isPresent());
      assert.strictEqual(
        githubPackage.getActiveRepository(),
        await contextPool.getContext(nonRepositoryPath).getRepository(),
      );
    });
  });

  /*describe('clone', function() {
    it('clones into an existing project path', async function() {
      const sourcePath = await cloneRepository();
      const existingPath = await getTempDir();
      project.setPaths([existingPath]);

      await contextUpdateAfter(githubPackage, () => githubPackage.activate());
      const repository = githubPackage.getActiveRepository();
      await repository.getLoadPromise();
      assert.isTrue(repository.isEmpty());

      assert.isNull(await githubPackage.workdirCache.find(existingPath));

      await githubPackage.clone(sourcePath, existingPath);

      assert.strictEqual(await githubPackage.workdirCache.find(existingPath), existingPath);
    });

    it('clones into a new project path', async function() {
      const sourcePath = await cloneRepository();
      const newPath = await getTempDir();

      await contextUpdateAfter(githubPackage, () => githubPackage.activate());
      const original = githubPackage.getActiveRepository();
      await original.getLoadPromise();
      assert.isTrue(original.isAbsentGuess());
      assert.deepEqual(project.getPaths(), []);

      await contextUpdateAfter(githubPackage, () => githubPackage.clone(sourcePath, newPath));

      assert.deepEqual(project.getPaths(), [newPath]);
      const replaced = githubPackage.getActiveRepository();
      assert.notStrictEqual(original, replaced);
    });
  });

  /*describe('stub item creation', function() {
    beforeEach(function() {
      sinon.spy(githubPackage, 'rerender');
    });

    describe('before the initial render', function() {
      it('creates a stub item for a commit preview item', function() {
        const item = githubPackage.createCommitPreviewStub({uri: 'atom-github://commit-preview'});

        assert.isFalse(githubPackage.rerender.called);
        assert.strictEqual(item.getTitle(), 'Commit preview');
        assert.strictEqual(item.getURI(), 'atom-github://commit-preview');
      });

      it('creates a stub item for a commit detail item', function() {
        const item = githubPackage.createCommitDetailStub({uri: 'atom-github://commit-detail?workdir=/home&sha=1234'});

        assert.isFalse(githubPackage.rerender.called);
        assert.strictEqual(item.getTitle(), 'Commit');
        assert.strictEqual(item.getURI(), 'atom-github://commit-detail?workdir=/home&sha=1234');
      });
    });

    describe('after the initial render', function() {
      beforeEach(function() {
        githubPackage.controller = Symbol('controller');
      });

      it('creates a stub item for a commit preview item', function() {
        const item = githubPackage.createCommitPreviewStub({uri: 'atom-github://commit-preview'});

        assert.isTrue(githubPackage.rerender.called);
        assert.strictEqual(item.getTitle(), 'Commit preview');
        assert.strictEqual(item.getURI(), 'atom-github://commit-preview');
      });

      it('creates a stub item for a commit detail item', function() {
        const item = githubPackage.createCommitDetailStub({uri: 'atom-github://commit-detail?workdir=/home&sha=1234'});

        assert.isTrue(githubPackage.rerender.called);
        assert.strictEqual(item.getTitle(), 'Commit');
        assert.strictEqual(item.getURI(), 'atom-github://commit-detail?workdir=/home&sha=1234');
      });
    });
  });*/
});
