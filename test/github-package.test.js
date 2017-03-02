import {Directory} from 'atom';

import fs from 'fs';
import path from 'path';
import temp from 'temp';
import until from 'test-until';

import {cloneRepository} from './helpers';
import GithubPackage from '../lib/github-package';

describe('GithubPackage', function() {
  let atomEnv, workspace, project, commandRegistry, notificationManager, config, confirm, tooltips;
  let githubPackage;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
    workspace = atomEnv.workspace;
    project = atomEnv.project;
    commandRegistry = atomEnv.commands;
    notificationManager = atomEnv.notifications;
    tooltips = atomEnv.tooltips;
    config = atomEnv.config;
    confirm = atomEnv.confirm.bind(atomEnv);
    githubPackage = new GithubPackage(
      workspace, project, commandRegistry, notificationManager, tooltips, config, confirm,
    );
  });

  afterEach(async function() {
    await githubPackage.deactivate();
    atomEnv.destroy();
  });

  describe('activate()', function() {
    it('updates the active repository', async function() {
      await githubPackage.activate();
      const workdirPath1 = await cloneRepository('three-files');
      const workdirPath2 = await cloneRepository('three-files');
      project.setPaths([workdirPath1, workdirPath2]);
      fs.writeFileSync(path.join(workdirPath1, 'a.txt'), 'change 1', 'utf8');
      fs.writeFileSync(path.join(workdirPath1, 'b.txt'), 'change 2', 'utf8');

      await workspace.open(path.join(workdirPath1, 'a.txt'));
      const repository = await githubPackage.getRepositoryForWorkdirPath(workdirPath1);
      await until(() => githubPackage.getActiveRepository() === repository);
    });
  });

  describe('changing the project paths', function() {
    it('updates the active repository and project path', async function() {
      const workdirPath1 = await cloneRepository('three-files');
      const workdirPath2 = await cloneRepository('three-files');
      const nonRepositoryPath = fs.realpathSync(temp.mkdirSync());
      fs.writeFileSync(path.join(nonRepositoryPath, 'c.txt'));
      project.setPaths([workdirPath1, workdirPath2, nonRepositoryPath]);
      fs.writeFileSync(path.join(workdirPath1, 'a.txt'), 'change 1', 'utf8');
      await githubPackage.activate();

      sinon.spy(githubPackage, 'rerender');
      await workspace.open(path.join(workdirPath1, 'a.txt'));
      const repository1 = await githubPackage.getRepositoryForWorkdirPath(workdirPath1);
      await assert.async.strictEqual(githubPackage.getActiveRepository(), repository1);
      await assert.async.equal(githubPackage.getActiveProjectPath(), workdirPath1);
      await assert.async.equal(githubPackage.rerender.callCount, 1);

      // Remove repository for open file
      project.setPaths([workdirPath2, nonRepositoryPath]);
      await assert.async.equal(githubPackage.getActiveProjectPath(), workdirPath1);
      await assert.async.isNull(githubPackage.getActiveRepository());
      await assert.async.equal(githubPackage.rerender.callCount, 2);

      await workspace.open(path.join(workdirPath2, 'b.txt'));
      const repository2 = await githubPackage.getRepositoryForWorkdirPath(workdirPath2);
      await assert.async.strictEqual(githubPackage.getActiveRepository(), repository2);
      await assert.async.equal(githubPackage.getActiveProjectPath(), workdirPath2);
      await assert.async.equal(githubPackage.rerender.callCount, 3);

      await workspace.open(path.join(nonRepositoryPath, 'c.txt'));
      await assert.async.isNull(githubPackage.getActiveRepository());
      await assert.async.equal(githubPackage.getActiveProjectPath(), nonRepositoryPath);
      await assert.async.equal(githubPackage.rerender.callCount, 4);
    });

    it('destroys all the repositories associated with the removed project folders', async function() {
      const workdirPath1 = await cloneRepository('three-files');
      const workdirPath2 = await cloneRepository('three-files');
      const workdirPath3 = await cloneRepository('three-files');
      project.setPaths([workdirPath1, workdirPath2, workdirPath3]);
      await githubPackage.activate();
      await githubPackage.getInitialModelsPromise();

      const repository1 = await githubPackage.getRepositoryForWorkdirPath(workdirPath1);
      const repository2 = await githubPackage.getRepositoryForWorkdirPath(workdirPath2);
      const repository3 = await githubPackage.getRepositoryForWorkdirPath(workdirPath3);
      assert.isOk(repository1);
      assert.isOk(repository2);
      assert.isOk(repository3);

      sinon.stub(repository1, 'destroy');
      sinon.stub(repository2, 'destroy');
      sinon.stub(repository3, 'destroy');

      project.removePath(workdirPath1);
      project.removePath(workdirPath3);

      await until(() => repository1.destroy.callCount === 1, 'repository1 is destroyed');
      await until(() => repository3.destroy.callCount === 1, 'repository3 is destroyed');
      assert.equal(repository2.destroy.callCount, 0);
      assert.notEqual(await githubPackage.getRepositoryForWorkdirPath(repository1.getWorkingDirectoryPath()), repository1);
      assert.notEqual(await githubPackage.getRepositoryForWorkdirPath(repository3.getWorkingDirectoryPath()), repository3);
      assert.equal(await githubPackage.getRepositoryForWorkdirPath(repository2.getWorkingDirectoryPath()), repository2);
    });
  });

  describe('didChangeActivePaneItem()', function() {
    it('updates the active repository', async function() {
      const workdirPath1 = await cloneRepository('three-files');
      const workdirPath2 = await cloneRepository('three-files');
      project.setPaths([workdirPath1, workdirPath2]);
      fs.writeFileSync(path.join(workdirPath1, 'a.txt'), 'change 1', 'utf8');
      fs.writeFileSync(path.join(workdirPath2, 'b.txt'), 'change 2', 'utf8');

      await workspace.open(path.join(workdirPath1, 'a.txt'));
      githubPackage.didChangeActivePaneItem();
      assert.equal(githubPackage.getActiveRepository(), await githubPackage.getRepositoryForWorkdirPath(workdirPath1));

      await workspace.open(path.join(workdirPath2, 'b.txt'));
      githubPackage.didChangeActivePaneItem();
      assert.equal(githubPackage.getActiveRepository(), await githubPackage.getRepositoryForWorkdirPath(workdirPath2));
    });
  });

  describe('updateActiveModels()', function() {
    it('updates the active repository based on the active item, setting it to null when the active item is not in a project repository', async function() {
      const workdirPath1 = await cloneRepository('three-files');
      const workdirPath2 = await cloneRepository('three-files');
      const nonRepositoryPath = fs.realpathSync(temp.mkdirSync());
      fs.writeFileSync(path.join(nonRepositoryPath, 'c.txt'));
      project.setPaths([workdirPath1, workdirPath2, nonRepositoryPath]);
      await githubPackage.activate();

      await workspace.open(path.join(workdirPath1, 'a.txt'));
      await workspace.open(path.join(workdirPath2, 'b.txt'));

      await githubPackage.updateActiveModels();
      assert.isNotNull(githubPackage.getActiveRepository());
      assert.equal(githubPackage.getActiveProjectPath(), workdirPath2);
      assert.equal(githubPackage.getActiveRepository(), await githubPackage.getRepositoryForWorkdirPath(workdirPath2));

      await workspace.open(path.join(nonRepositoryPath, 'c.txt'));
      await githubPackage.updateActiveModels();
      assert.equal(githubPackage.getActiveProjectPath(), nonRepositoryPath);
      assert.isNull(githubPackage.getActiveRepository());

      await workspace.open(path.join(workdirPath1, 'a.txt'));
      await githubPackage.updateActiveModels();
      assert.equal(githubPackage.getActiveProjectPath(), workdirPath1);
      assert.equal(githubPackage.getActiveRepository(), await githubPackage.getRepositoryForWorkdirPath(workdirPath1));

      workspace.getActivePane().activateItem({}); // such as when find & replace results pane is focused
      await githubPackage.updateActiveModels();
      assert.equal(githubPackage.getActiveProjectPath(), workdirPath1);
      assert.equal(githubPackage.getActiveRepository(), await githubPackage.getRepositoryForWorkdirPath(workdirPath1));

      await workspace.open(path.join(workdirPath2, 'b.txt'));
      await githubPackage.updateActiveModels();
      assert.equal(githubPackage.getActiveProjectPath(), workdirPath2);
      assert.equal(githubPackage.getActiveRepository(), await githubPackage.getRepositoryForWorkdirPath(workdirPath2));

      project.removePath(workdirPath2);
      await githubPackage.updateActiveModels();
      assert.isNull(githubPackage.getActiveProjectPath());
      assert.isNull(githubPackage.getActiveRepository());

      project.removePath(workdirPath1);
      await githubPackage.updateActiveModels();
      assert.isNull(githubPackage.getActiveProjectPath());
      assert.isNull(githubPackage.getActiveRepository());

      await workspace.open(path.join(workdirPath1, 'a.txt'));
      await githubPackage.updateActiveModels();
      assert.isNull(githubPackage.getActiveProjectPath());
      assert.isNull(githubPackage.getActiveRepository());
    });

    it('defaults to a single repository even without an active pane item', async function() {
      const workdirPath = await cloneRepository('three-files');
      project.setPaths([workdirPath]);
      await githubPackage.activate();

      await githubPackage.updateActiveModels();

      const repository = await githubPackage.getRepositoryForWorkdirPath(workdirPath);
      await assert.async.strictEqual(githubPackage.getActiveRepository(), repository);
    });

    it('updates the active resolution progress', async function() {
      // Repository with a merge conflict, repository without a merge conflict, path without a repository
      const workdirMergeConflict = await cloneRepository('merge-conflict');
      const workdirNoConflict = await cloneRepository('three-files');
      const nonRepositoryPath = fs.realpathSync(temp.mkdirSync());
      fs.writeFileSync(path.join(nonRepositoryPath, 'c.txt'));

      project.setPaths([workdirMergeConflict, workdirNoConflict, nonRepositoryPath]);
      await githubPackage.activate();
      await githubPackage.getInitialModelsPromise();

      // Open a file in the merge conflict repository.
      await workspace.open(path.join(workdirMergeConflict, 'modified-on-both-ours.txt'));
      await githubPackage.updateActiveModels();

      const resolutionMergeConflict = await githubPackage.getResolutionProgressForWorkdirPath(workdirMergeConflict);
      await assert.strictEqual(githubPackage.getActiveResolutionProgress(), resolutionMergeConflict);

      // Record some resolution progress to recall later
      resolutionMergeConflict.reportMarkerCount('modified-on-both-ours.txt', 3);

      // Open a file in the non-merge conflict repository.
      await workspace.open(path.join(workdirNoConflict, 'b.txt'));
      await githubPackage.updateActiveModels();

      const resolutionNoConflict = await githubPackage.getResolutionProgressForWorkdirPath(workdirNoConflict);
      await assert.strictEqual(githubPackage.getActiveResolutionProgress(), resolutionNoConflict);
      assert.isTrue(githubPackage.getActiveResolutionProgress().isEmpty());

      // Open a file in the workdir with no repository.
      await workspace.open(path.join(nonRepositoryPath, 'c.txt'));
      await githubPackage.updateActiveModels();

      await assert.isNull(githubPackage.getActiveResolutionProgress());

      // Re-open a file in the merge conflict repository.
      await workspace.open(path.join(workdirMergeConflict, 'modified-on-both-theirs.txt'));
      await githubPackage.updateActiveModels();

      await assert.strictEqual(githubPackage.getActiveResolutionProgress(), resolutionMergeConflict);
      assert.isFalse(githubPackage.getActiveResolutionProgress().isEmpty());
      assert.equal(githubPackage.getActiveResolutionProgress().getRemaining('modified-on-both-ours.txt'), 3);
    });

    // Don't worry about this on Windows as it's not a common op
    if (process.platform !== 'win32') {
      it('handles symlinked project paths', async () => {
        const workdirPath = await cloneRepository('three-files');
        const symlinkPath = fs.realpathSync(temp.mkdirSync()) + '-symlink';
        fs.symlinkSync(workdirPath, symlinkPath);
        project.setPaths([symlinkPath]);
        await githubPackage.activate();

        await workspace.open(path.join(symlinkPath, 'a.txt'));

        await githubPackage.updateActiveModels();
        assert.isOk(githubPackage.getActiveRepository());
      });
    }
  });

  describe('when there is a change in the repository', function() {
    let workdirPath1, atomGitRepository1, repository1;
    let workdirPath2, atomGitRepository2, repository2;

    beforeEach(async function() {
      workdirPath1 = await cloneRepository('three-files');
      workdirPath2 = await cloneRepository('three-files');

      fs.writeFileSync(path.join(workdirPath1, 'c.txt'), 'ch-ch-ch-changes', 'utf8');
      fs.writeFileSync(path.join(workdirPath2, 'c.txt'), 'ch-ch-ch-changes', 'utf8');

      project.setPaths([workdirPath1, workdirPath2]);
      await githubPackage.activate();
      await githubPackage.getInitialWatchersStartedPromise();
      [atomGitRepository1, atomGitRepository2] = githubPackage.project.getRepositories();
      sinon.stub(atomGitRepository1, 'refreshStatus');
      sinon.stub(atomGitRepository2, 'refreshStatus');

      repository1 = await githubPackage.getRepositoryForWorkdirPath(workdirPath1);
      repository2 = await githubPackage.getRepositoryForWorkdirPath(workdirPath2);
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

  describe('#createRepositoryForProjectPath', function() {
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
      assert.isOk(githubPackage.getActiveRepository());
      assert.equal(githubPackage.getActiveRepository(), await githubPackage.getRepositoryForWorkdirPath(nonRepositoryPath));
    });
  });

  describe('#projectPathForItemPath', function() {
    it('does not error when the path is falsy (e.g. new unsaved file)', function() {
      sinon.stub(project, 'getDirectories').returns([new Directory('path')]);
      assert.doesNotThrow(() => {
        githubPackage.projectPathForItemPath(null);
      });
    });

    it('returns the correct path when the item path starts with the project path but the item path is not in the project', function() {
      const dirs = [path.join('path', 'to', 'my'), path.join('path', 'to', 'my-project')].map(p => new Directory(p));
      sinon.stub(project, 'getDirectories').returns(dirs);
      assert.equal(githubPackage.projectPathForItemPath(path.join('path', 'to', 'my-project', 'file.txt')), path.join('path', 'to', 'my-project'));
    });
  });

  describe('serialized state', function() {
    it('restores nonempty resolution progress', async function() {
      const workdirMergeConflict = await cloneRepository('merge-conflict');
      const workdirNoConflict = await cloneRepository('three-files');

      project.setPaths([workdirMergeConflict, workdirNoConflict]);
      await githubPackage.activate();
      await githubPackage.getInitialModelsPromise();

      // Record some state to recover later.
      const resolutionMergeConflict0 = await githubPackage.getResolutionProgressForWorkdirPath(workdirMergeConflict);
      resolutionMergeConflict0.reportMarkerCount('modified-on-both-ours.txt', 3);

      const payload = githubPackage.serialize();

      // Use a little guilty knowledge of the payload structure to ensure that the workdir without resolution
      // progress isn't serialized with the rest of the package state.
      assert.isDefined(payload.resolutionProgressByPath[workdirMergeConflict]);
      assert.isUndefined(payload.resolutionProgressByPath[workdirNoConflict]);

      const githubPackage1 = new GithubPackage(
        workspace, project, commandRegistry, notificationManager, tooltips, config, confirm,
      );
      await githubPackage1.activate(payload);
      await githubPackage1.getInitialModelsPromise();

      const resolutionMergeConflict1 = await githubPackage1.getResolutionProgressForWorkdirPath(workdirMergeConflict);
      const resolutionNoConflict1 = await githubPackage1.getResolutionProgressForWorkdirPath(workdirNoConflict);

      assert.isFalse(resolutionMergeConflict1.isEmpty());
      assert.equal(resolutionMergeConflict1.getRemaining('modified-on-both-ours.txt'), 3);

      assert.isTrue(resolutionNoConflict1.isEmpty());
    });
  });
});
