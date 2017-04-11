import fs from 'fs';
import path from 'path';
import temp from 'temp';
import until from 'test-until';

import {cloneRepository} from './helpers';
import {writeFile} from '../lib/helpers';
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

  function untilWorkdirs(...workdirs) {
    return until(`working directories ${workdirs.join(', ')} are loaded`, () => {
      return workdirs.every(workdir => contextPool.getContext(workdir).isPresent());
    });
  }

  function untilRepositories(...workdirs) {
    return untilWorkdirs(...workdirs).then(() => Promise.all(
      workdirs.map(workdir => contextPool.getContext(workdir).getRepositoryPromise()),
    ));
  }

  describe('activate()', function() {
    it('uses models from preexisting projects', async function() {
      const [workdirPath1, workdirPath2] = await Promise.all([
        cloneRepository('three-files'),
        cloneRepository('three-files'),
      ]);
      project.setPaths([workdirPath1, workdirPath2]);

      await githubPackage.activate();

      await untilRepositories(workdirPath1, workdirPath2);
      assert.isNull(githubPackage.getActiveRepository());
    });

    it('uses an active model from a single preexisting project', async function() {
      const workdirPath = await cloneRepository('three-files');
      project.setPaths([workdirPath]);

      await githubPackage.activate();

      await assert.async.isNotNull(githubPackage.getActiveRepository());
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

      await assert.async.isNotNull(githubPackage.getActiveRepository());
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

      await assert.async.isNotNull(githubPackage.getActiveRepository());
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

      await assert.async.isNotNull(githubPackage.getActiveRepository());
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

      await assert.async.isNotNull(githubPackage.getActiveRepository());
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

      // Open a file in the merge conflict repository.
      await workspace.open(path.join(workdirMergeConflict, 'modified-on-both-ours.txt'));
      await githubPackage.scheduleActiveContextUpdate();

      const resolutionMergeConflict = await contextPool.getContext(workdirMergeConflict).getResolutionProgressPromise();
      await assert.strictEqual(githubPackage.getActiveResolutionProgress(), resolutionMergeConflict);

      // Record some resolution progress to recall later
      resolutionMergeConflict.reportMarkerCount('modified-on-both-ours.txt', 3);

      // Open a file in the non-merge conflict repository.
      await workspace.open(path.join(workdirNoConflict, 'b.txt'));
      await githubPackage.scheduleActiveContextUpdate();

      const resolutionNoConflict = await contextPool.getContext(workdirNoConflict).getResolutionProgressPromise();
      assert.strictEqual(githubPackage.getActiveResolutionProgress(), resolutionNoConflict);
      assert.isTrue(githubPackage.getActiveResolutionProgress().isEmpty());

      // Open a file in the workdir with no repository.
      await workspace.open(path.join(nonRepositoryPath, 'c.txt'));
      await githubPackage.scheduleActiveContextUpdate();

      assert.isNull(githubPackage.getActiveResolutionProgress());

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
      await untilWorkdirs(workdirPath1, workdirPath2);

      project.setPaths([workdirPath1, workdirPath2, workdirPath3]);
      await untilWorkdirs(workdirPath1, workdirPath2, workdirPath3);
    });

    it('destroys contexts associated with the removed project folders', async function() {
      const [workdirPath1, workdirPath2, workdirPath3] = await Promise.all([
        cloneRepository('three-files'),
        cloneRepository('three-files'),
        cloneRepository('three-files'),
      ]);
      project.setPaths([workdirPath1, workdirPath2, workdirPath3]);
      await githubPackage.activate();
      await untilRepositories(workdirPath1, workdirPath2, workdirPath3);

      const [repository1, repository2, repository3] = await Promise.all(
        [workdirPath1, workdirPath2, workdirPath3].map(workdir => {
          return contextPool.getContext(workdir).getRepositoryPromise();
        }),
      );

      sinon.stub(repository1, 'destroy');
      sinon.stub(repository2, 'destroy');
      sinon.stub(repository3, 'destroy');

      project.removePath(workdirPath1);
      project.removePath(workdirPath3);

      await assert.async.equal(repository1.destroy.callCount, 1);
      await assert.async.equal(repository3.destroy.callCount, 1);
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
      await untilRepositories(workdirPath1, workdirPath2);
      const repository2 = contextPool.getContext(workdirPath2).getRepository();

      assert.isNull(githubPackage.getActiveRepository());

      await workspace.open(path.join(workdirPath2, 'b.txt'));

      await assert.async.strictEqual(githubPackage.getActiveRepository(), repository2);
    });

    it('adds a new context if not in a project', async function() {
      const [workdirPath1, workdirPath2] = await Promise.all([
        cloneRepository('three-files'),
        cloneRepository('three-files'),
      ]);
      project.setPaths([workdirPath1]);
      await githubPackage.activate();
      await untilRepositories(workdirPath1);

      await workspace.open(path.join(workdirPath2, 'c.txt'));

      await assert.async.equal(githubPackage.getActiveWorkdir(), workdirPath2);
    });

    it('removes a context if not in a project', async function() {
      const [workdirPath1, workdirPath2] = await Promise.all([
        cloneRepository('three-files'),
        cloneRepository('three-files'),
      ]);
      project.setPaths([workdirPath1]);
      await githubPackage.activate();
      await workspace.open(path.join(workdirPath2, 'c.txt'));
      await untilRepositories(workdirPath1, workdirPath2);

      workspace.getActivePane().destroyActiveItem();

      await assert.async.isFalse(contextPool.getContext(workdirPath2).isPresent());
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

    it('uses an empty context when the active item is not in a git repository', async function() {
      const nonRepositoryPath = fs.realpathSync(temp.mkdirSync());
      const workdir = await cloneRepository('three-files');
      project.setPaths([nonRepositoryPath, workdir]);
      await writeFile(path.join(nonRepositoryPath, 'a.txt'), 'stuff');
      await workspace.open(path.join(nonRepositoryPath, 'a.txt'));

      await githubPackage.scheduleActiveContextUpdate();

      assert.isNull(githubPackage.getActiveRepository());
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

    it('uses a null context with a single open project without a git workdir', async function() {
      const nonRepositoryPath = fs.realpathSync(temp.mkdirSync());
      project.setPaths([nonRepositoryPath]);

      await githubPackage.scheduleActiveContextUpdate();

      assert.isNull(githubPackage.getActiveRepository());
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

      const repository = await contextPool.getContext(workdirPath).getRepositoryPromise();
      assert.isNotNull(repository);

      repository.destroy();

      assert.isNull(githubPackage.getActiveRepository());
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
      await untilRepositories(workdirPath1, workdirPath2);

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
      const workdirPath1 = await cloneRepository('three-files');
      const workdirPath2 = await cloneRepository('three-files');
      const nonRepositoryPath = fs.realpathSync(temp.mkdirSync());
      fs.writeFileSync(path.join(nonRepositoryPath, 'c.txt'));
      project.setPaths([workdirPath1, workdirPath2, nonRepositoryPath]);
      await githubPackage.activate();

      await workspace.open(path.join(nonRepositoryPath, 'c.txt'));
      await assert.async.isNull(githubPackage.getActiveRepository());
      await githubPackage.createRepositoryForProjectPath(nonRepositoryPath);
      await contextPool.getContext(nonRepositoryPath).getRepositoryPromise();

      assert.isOk(githubPackage.getActiveRepository());
      assert.strictEqual(
        githubPackage.getActiveRepository(),
        await contextPool.getContext(nonRepositoryPath).getRepository(),
      );
    });
  });

  describe('serialized state', function() {
    function resolutionProgressFrom(pkg, workdir) {
      return pkg.getContextPool().getContext(workdir).getResolutionProgressPromise();
    }

    it('restores nonempty resolution progress', async function() {
      const workdirMergeConflict = await cloneRepository('merge-conflict');
      const workdirNoConflict = await cloneRepository('three-files');

      project.setPaths([workdirMergeConflict, workdirNoConflict]);
      await githubPackage.activate();
      await githubPackage.scheduleActiveContextUpdate();

      // Record some state to recover later.
      const resolutionMergeConflict0 = await resolutionProgressFrom(githubPackage, workdirMergeConflict);
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

      const resolutionMergeConflict1 = await resolutionProgressFrom(githubPackage1, workdirMergeConflict);
      const resolutionNoConflict1 = await resolutionProgressFrom(githubPackage1, workdirNoConflict);

      assert.isFalse(resolutionMergeConflict1.isEmpty());
      assert.equal(resolutionMergeConflict1.getRemaining('modified-on-both-ours.txt'), 3);

      assert.isTrue(resolutionNoConflict1.isEmpty());
    });
  });
});
