import fs from 'fs';
import path from 'path';
import temp from 'temp';
import until from 'test-until';

import {cloneRepository} from './helpers';
import {writeFile, getTempDir} from '../lib/helpers';
import GithubPackage from '../lib/github-package';

describe('GithubPackage', function() {
  let atomEnv, workspace, project, commandRegistry, notificationManager, config, confirm, tooltips, styles;
  let githubPackage, contextPool;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
    workspace = atomEnv.workspace;
    project = atomEnv.project;
    commandRegistry = atomEnv.commands;
    notificationManager = atomEnv.notifications;
    tooltips = atomEnv.tooltips;
    config = atomEnv.config;
    confirm = atomEnv.confirm.bind(atomEnv);
    styles = atomEnv.styles;
    githubPackage = new GithubPackage(
      workspace, project, commandRegistry, notificationManager, tooltips, styles, config, confirm,
    );

    contextPool = githubPackage.getContextPool();
  });

  afterEach(async function() {
    await githubPackage.deactivate();
    atomEnv.destroy();
  });

  function contextUpdateAfter(chunk) {
    const updatePromise = githubPackage.getSwitchboard().getFinishActiveContextUpdatePromise();
    chunk();
    return updatePromise;
  }

  describe('activate()', function() {
    it('uses models from preexisting projects', async function() {
      const [workdirPath1, workdirPath2, nonRepositoryPath] = await Promise.all([
        cloneRepository('three-files'),
        cloneRepository('three-files'),
        getTempDir(),
      ]);
      project.setPaths([workdirPath1, workdirPath2, nonRepositoryPath]);

      await githubPackage.activate();
      await githubPackage.getSwitchboard().getFinishActiveContextUpdatePromise();

      assert.isTrue(contextPool.getContext(workdirPath1).isPresent());
      assert.isTrue(contextPool.getContext(workdirPath2).isPresent());
      assert.isTrue(contextPool.getContext(nonRepositoryPath).isPresent());

      assert.isTrue(githubPackage.getActiveRepository().isAbsent());
    });

    it('uses an active model from a single preexisting project', async function() {
      const workdirPath = await cloneRepository('three-files');
      project.setPaths([workdirPath]);

      await githubPackage.activate();
      await githubPackage.getSwitchboard().getFinishActiveContextUpdatePromise();

      const context = contextPool.getContext(workdirPath);
      assert.isTrue(context.isPresent());

      assert.strictEqual(context.getRepository(), githubPackage.getActiveRepository());
      assert.strictEqual(context.getResolutionProgress(), githubPackage.getActiveResolutionProgress());
      assert.equal(githubPackage.getActiveWorkdir(), workdirPath);
    });

    it('uses an active model from a preexisting active pane item', async function() {
      const [workdirPath1, workdirPath2] = await Promise.all([
        cloneRepository('three-files'),
        cloneRepository('three-files'),
      ]);
      project.setPaths([workdirPath1, workdirPath2]);
      await workspace.open(path.join(workdirPath2, 'a.txt'));

      await githubPackage.activate();
      await githubPackage.getSwitchboard().getFinishActiveContextUpdatePromise();

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

      await githubPackage.activate({
        activeRepositoryPath: workdirPath2,
      });
      await githubPackage.getSwitchboard().getFinishActiveContextUpdatePromise();

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

      await githubPackage.activate({
        activeRepositoryPath: workdirPath1,
      });
      await githubPackage.getSwitchboard().getFinishActiveContextUpdatePromise();

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

      await githubPackage.activate({
        activeRepositoryPath: workdirPath2,
      });
      await githubPackage.getSwitchboard().getFinishActiveContextUpdatePromise();

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
      const nonRepositoryPath = fs.realpathSync(temp.mkdirSync());
      fs.writeFileSync(path.join(nonRepositoryPath, 'c.txt'));

      project.setPaths([workdirMergeConflict, workdirNoConflict, nonRepositoryPath]);
      await githubPackage.activate();
      await githubPackage.getSwitchboard().getFinishActiveContextUpdatePromise();

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
  });

  describe('when the project paths change', function() {
    it('adds new workdirs to the pool', async function() {
      const [workdirPath1, workdirPath2, workdirPath3] = await Promise.all([
        cloneRepository('three-files'),
        cloneRepository('three-files'),
        cloneRepository('three-files'),
      ]);

      project.setPaths([workdirPath1, workdirPath2]);
      await githubPackage.activate();
      await githubPackage.getSwitchboard().getFinishActiveContextUpdatePromise();

      assert.isTrue(contextPool.getContext(workdirPath1).isPresent());
      assert.isTrue(contextPool.getContext(workdirPath2).isPresent());
      assert.isFalse(contextPool.getContext(workdirPath3).isPresent());

      project.setPaths([workdirPath1, workdirPath2, workdirPath3]);
      await githubPackage.getSwitchboard().getFinishActiveContextUpdatePromise();

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
      await githubPackage.activate();
      await githubPackage.getSwitchboard().getFinishActiveContextUpdatePromise();

      const [repository1, repository2, repository3] = [workdirPath1, workdirPath2, workdirPath3].map(workdir => {
        return contextPool.getContext(workdir).getRepository();
      });

      sinon.stub(repository1, 'destroy');
      sinon.stub(repository2, 'destroy');
      sinon.stub(repository3, 'destroy');

      project.removePath(workdirPath1);
      project.removePath(workdirPath3);
      await githubPackage.getSwitchboard().getFinishActiveContextUpdatePromise();

      assert.equal(repository1.destroy.callCount, 1);
      assert.equal(repository3.destroy.callCount, 1);
      assert.isFalse(repository2.destroy.called);

      assert.isFalse(contextPool.getContext(workdirPath1).isPresent());
      assert.isFalse(contextPool.getContext(workdirPath3).isPresent());
      assert.isTrue(contextPool.getContext(workdirPath2).isPresent());
    });
  });

  describe('when the active pane item changes', function() {
    it('becomes the active context', async function() {
      const [workdirPath1, workdirPath2] = await Promise.all([
        cloneRepository('three-files'),
        cloneRepository('three-files'),
      ]);
      project.setPaths([workdirPath1, workdirPath2]);

      await githubPackage.activate();
      await githubPackage.getSwitchboard().getFinishActiveContextUpdatePromise();

      const repository2 = contextPool.getContext(workdirPath2).getRepository();

      assert.isTrue(githubPackage.getActiveRepository().isAbsent());

      const updatePromise = githubPackage.getSwitchboard().getFinishActiveContextUpdatePromise();
      workspace.open(path.join(workdirPath2, 'b.txt'));
      await updatePromise;

      assert.strictEqual(githubPackage.getActiveRepository(), repository2);
    });

    it('adds a new context if not in a project', async function() {
      const [workdirPath1, workdirPath2] = await Promise.all([
        cloneRepository('three-files'),
        cloneRepository('three-files'),
      ]);
      project.setPaths([workdirPath1]);

      await githubPackage.activate();
      await githubPackage.getSwitchboard().getFinishActiveContextUpdatePromise();

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
      await githubPackage.activate();
      await githubPackage.getSwitchboard().getFinishActiveContextUpdatePromise();

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
      const nonRepositoryPath = fs.realpathSync(temp.mkdirSync());
      const workdir = await cloneRepository('three-files');
      project.setPaths([nonRepositoryPath, workdir]);
      await writeFile(path.join(nonRepositoryPath, 'a.txt'), 'stuff');

      workspace.open(path.join(nonRepositoryPath, 'a.txt'));

      await githubPackage.scheduleActiveContextUpdate();

      assert.isTrue(githubPackage.getActiveRepository().isAbsent());
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
        const symlinkPath = fs.realpathSync(temp.mkdirSync()) + '-symlink';
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
      await until('change observers have started', () => {
        return [workdirPath1, workdirPath2].every(workdir => {
          return contextPool.getContext(workdir).getChangeObserver().isStarted();
        });
      });

      [atomGitRepository1, atomGitRepository2] = githubPackage.project.getRepositories();
      sinon.stub(atomGitRepository1, 'refreshStatus');
      sinon.stub(atomGitRepository2, 'refreshStatus');

      repository1 = contextPool.getContext(workdirPath1).getRepository();
      repository2 = contextPool.getContext(workdirPath2).getRepository();
      sinon.stub(repository1, 'refresh');
      sinon.stub(repository2, 'refresh');
    });

    it('refreshes the appropriate Repository and Atom GitRepository when a file is changed in workspace 1', async function() {
      if (process.platform === 'linux') {
        this.skip();
      }

      fs.writeFileSync(path.join(workdirPath1, 'a.txt'), 'some changes', 'utf8');

      await assert.async.isTrue(repository1.refresh.called);
      await assert.async.isTrue(atomGitRepository1.refreshStatus.called);
    });

    it('refreshes the appropriate Repository and Atom GitRepository when a file is changed in workspace 2', async function() {
      if (process.platform === 'linux') {
        this.skip();
      }

      fs.writeFileSync(path.join(workdirPath2, 'b.txt'), 'other changes', 'utf8');

      await assert.async.isTrue(repository2.refresh.called);
      await assert.async.isTrue(atomGitRepository2.refreshStatus.called);
    });

    it('refreshes the appropriate Repository and Atom GitRepository when a commit is made in workspace 1', async function() {
      await repository1.git.exec(['commit', '-am', 'commit in repository1']);

      await assert.async.isTrue(repository1.refresh.called);
      await assert.async.isTrue(atomGitRepository1.refreshStatus.called);
    });

    it('refreshes the appropriate Repository and Atom GitRepository when a commit is made in workspace 2', async function() {
      await repository2.git.exec(['commit', '-am', 'commit in repository2']);

      await assert.async.isTrue(repository2.refresh.called);
      await assert.async.isTrue(atomGitRepository2.refreshStatus.called);
    });
  });

  describe('createRepositoryForProjectPath()', function() {
    it('creates and sets a repository for the given project path', async function() {
      const nonRepositoryPath = await getTempDir();
      project.setPaths([nonRepositoryPath]);

      await githubPackage.activate();
      await githubPackage.getSwitchboard().getFinishActiveContextUpdatePromise();
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

  describe('serialized state', function() {
    function resolutionProgressFrom(pkg, workdir) {
      return pkg.getContextPool().getContext(workdir).getResolutionProgress();
    }

    it('restores nonempty resolution progress', async function() {
      const workdirMergeConflict = await cloneRepository('merge-conflict');
      const workdirNoConflict = await cloneRepository('three-files');

      project.setPaths([workdirMergeConflict, workdirNoConflict]);
      await githubPackage.activate();
      await githubPackage.scheduleActiveContextUpdate();

      // Record some state to recover later.
      const resolutionMergeConflict0 = resolutionProgressFrom(githubPackage, workdirMergeConflict);
      await assert.async.isTrue(resolutionMergeConflict0.loaded);
      resolutionMergeConflict0.reportMarkerCount('modified-on-both-ours.txt', 3);

      const payload = githubPackage.serialize();

      // Use a little guilty knowledge of the payload structure to ensure that the workdir without resolution
      // progress isn't serialized with the rest of the package state.
      assert.isDefined(payload.resolutionProgressByPath[workdirMergeConflict]);
      assert.isUndefined(payload.resolutionProgressByPath[workdirNoConflict]);

      const githubPackage1 = new GithubPackage(
        workspace, project, commandRegistry, notificationManager, tooltips, styles, config, confirm,
      );
      await githubPackage1.activate(payload);
      await githubPackage1.scheduleActiveContextUpdate();

      const resolutionMergeConflict1 = resolutionProgressFrom(githubPackage1, workdirMergeConflict);
      const resolutionNoConflict1 = resolutionProgressFrom(githubPackage1, workdirNoConflict);

      await assert.async.isFalse(resolutionMergeConflict1.isEmpty());
      assert.equal(resolutionMergeConflict1.getRemaining('modified-on-both-ours.txt'), 3);

      assert.isTrue(resolutionNoConflict1.isEmpty());
    });
  });
});
