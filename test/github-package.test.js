/** @babel */

import {Directory} from 'atom';

import fs from 'fs';
import path from 'path';
import temp from 'temp';
import sinon from 'sinon';

import {cloneRepository} from './helpers';
import GithubPackage from '../lib/github-package';

describe('GithubPackage', () => {
  let atomEnv, workspace, project, commandRegistry, notificationManager, githubPackage;

  beforeEach(() => {
    atomEnv = global.buildAtomEnvironment();
    workspace = atomEnv.workspace;
    project = atomEnv.project;
    commandRegistry = atomEnv.commands;
    notificationManager = atomEnv.notifications;
    githubPackage = new GithubPackage(workspace, project, commandRegistry, notificationManager);
  });

  afterEach(() => {
    atomEnv.destroy();
  });

  describe('activate()', () => {
    it('updates the active repository', async () => {
      const workdirPath1 = await cloneRepository('three-files');
      const workdirPath2 = await cloneRepository('three-files');
      project.setPaths([workdirPath1, workdirPath2]);
      fs.writeFileSync(path.join(workdirPath1, 'a.txt'), 'change 1', 'utf8');
      fs.writeFileSync(path.join(workdirPath1, 'b.txt'), 'change 2', 'utf8');

      await workspace.open(path.join(workdirPath1, 'a.txt'));
      await githubPackage.activate();
      assert.equal(githubPackage.getActiveRepository(), await githubPackage.repositoryForWorkdirPath(workdirPath1));
    });
  });

  describe('didChangeProjectPaths()', () => {
    it('updates the active repository', async () => {
      const workdirPath1 = await cloneRepository('three-files');
      const workdirPath2 = await cloneRepository('three-files');
      const nonRepositoryPath = temp.mkdirSync();
      fs.writeFileSync(path.join(nonRepositoryPath, 'c.txt'));
      project.setPaths([workdirPath1, workdirPath2, nonRepositoryPath]);
      fs.writeFileSync(path.join(workdirPath1, 'a.txt'), 'change 1', 'utf8');

      sinon.spy(githubPackage, 'rerender');
      await workspace.open(path.join(workdirPath1, 'a.txt'));
      await githubPackage.didChangeProjectPaths();
      assert.equal(githubPackage.getActiveRepository(), await githubPackage.repositoryForWorkdirPath(workdirPath1));
      assert.equal(githubPackage.changeObserver.getActiveRepository(), githubPackage.getActiveRepository());
      assert.equal(githubPackage.rerender.callCount, 1);

      // Remove repository for open file
      project.setPaths([workdirPath2, nonRepositoryPath]);
      await githubPackage.didChangeProjectPaths();
      assert.isNull(githubPackage.getActiveRepository());
      assert.isNull(githubPackage.changeObserver.getActiveRepository());
      assert.equal(githubPackage.rerender.callCount, 2);

      await workspace.open(path.join(workdirPath2, 'b.txt'));
      await githubPackage.didChangeProjectPaths();
      assert.equal(githubPackage.getActiveRepository(), await githubPackage.repositoryForWorkdirPath(workdirPath2));
      assert.equal(githubPackage.changeObserver.getActiveRepository(), githubPackage.getActiveRepository());
      assert.equal(githubPackage.rerender.callCount, 3);

      await workspace.open(path.join(nonRepositoryPath, 'c.txt'));
      await githubPackage.didChangeProjectPaths();
      assert.isNull(githubPackage.getActiveRepository());
      assert.isNull(githubPackage.changeObserver.getActiveRepository());
      assert.equal(githubPackage.rerender.callCount, 4);
    });

    it('destroys all the repositories associated with the removed project folders', async () => {
      const workdirPath1 = await cloneRepository('three-files');
      const workdirPath2 = await cloneRepository('three-files');
      const workdirPath3 = await cloneRepository('three-files');
      project.setPaths([workdirPath1, workdirPath2, workdirPath3]);

      const repository1 = await githubPackage.repositoryForWorkdirPath(workdirPath1);
      const repository2 = await githubPackage.repositoryForWorkdirPath(workdirPath2);
      const repository3 = await githubPackage.repositoryForWorkdirPath(workdirPath3);
      assert(repository1);
      assert(repository2);
      assert(repository3);

      project.removePath(workdirPath1);
      project.removePath(workdirPath3);
      await githubPackage.didChangeProjectPaths();

      assert.notEqual(await githubPackage.repositoryForProjectDirectory(repository1.getWorkingDirectory()), repository1);
      assert.notEqual(await githubPackage.repositoryForProjectDirectory(repository3.getWorkingDirectory()), repository3);
      assert.equal(await githubPackage.repositoryForProjectDirectory(repository2.getWorkingDirectory()), repository2);
    });
  });

  describe('didChangeActivePaneItem()', () => {
    it('updates the active repository', async () => {
      const workdirPath1 = await cloneRepository('three-files');
      const workdirPath2 = await cloneRepository('three-files');
      project.setPaths([workdirPath1, workdirPath2]);
      fs.writeFileSync(path.join(workdirPath1, 'a.txt'), 'change 1', 'utf8');
      fs.writeFileSync(path.join(workdirPath2, 'b.txt'), 'change 2', 'utf8');

      await workspace.open(path.join(workdirPath1, 'a.txt'));
      await githubPackage.didChangeActivePaneItem();
      assert.equal(githubPackage.getActiveRepository(), await githubPackage.repositoryForWorkdirPath(workdirPath1));

      await workspace.open(path.join(workdirPath2, 'b.txt'));
      await githubPackage.didChangeActivePaneItem();
      assert.equal(githubPackage.getActiveRepository(), await githubPackage.repositoryForWorkdirPath(workdirPath2));
    });
  });

  describe('updateActiveRepository()', () => {
    it('updates the active repository based on the active item, setting it to null when the active item is not in a project repository', async () => {
      const workdirPath1 = await cloneRepository('three-files');
      const workdirPath2 = await cloneRepository('three-files');
      const nonRepositoryPath = temp.mkdirSync();
      fs.writeFileSync(path.join(nonRepositoryPath, 'c.txt'));
      project.setPaths([workdirPath1, workdirPath2, nonRepositoryPath]);

      await workspace.open(path.join(workdirPath1, 'a.txt'));
      await workspace.open(path.join(workdirPath2, 'b.txt'));

      await githubPackage.updateActiveRepository();
      assert.equal(githubPackage.getActiveRepository(), await githubPackage.repositoryForWorkdirPath(workdirPath2));

      await workspace.open(path.join(nonRepositoryPath, 'c.txt'));
      await githubPackage.updateActiveRepository();
      assert.isNull(githubPackage.getActiveRepository());

      await workspace.open(path.join(workdirPath1, 'a.txt'));
      await githubPackage.updateActiveRepository();
      assert.equal(githubPackage.getActiveRepository(), await githubPackage.repositoryForWorkdirPath(workdirPath1));

      workspace.getActivePane().activateItem({}); // such as when find & replace results pane is focused
      await githubPackage.updateActiveRepository();
      assert.equal(githubPackage.getActiveRepository(), await githubPackage.repositoryForWorkdirPath(workdirPath1));

      await workspace.open(path.join(workdirPath2, 'b.txt'));
      await githubPackage.updateActiveRepository();
      assert.equal(githubPackage.getActiveRepository(), await githubPackage.repositoryForWorkdirPath(workdirPath2));

      project.removePath(workdirPath2);
      await githubPackage.updateActiveRepository();
      assert.isNull(githubPackage.getActiveRepository());

      project.removePath(workdirPath1);
      await githubPackage.updateActiveRepository();
      assert.isNull(githubPackage.getActiveRepository());

      await workspace.open(path.join(workdirPath1, 'a.txt'));
      await githubPackage.updateActiveRepository();
      assert.isNull(githubPackage.getActiveRepository());
    });
  });

  describe('#repositoryForProjectDirectory', () => {
    it('returns the same repository over multiple overlapping calls', async () => {
      const workdirPath = await cloneRepository('three-files');
      const dir = new Directory(workdirPath);

      const repo1 = githubPackage.repositoryForProjectDirectory(dir);
      const repo2 = githubPackage.repositoryForProjectDirectory(dir);

      assert.equal(await repo1, await repo2);
    });

    it('returns the same repository for different Directories with the same path', async () => {
      const workdirPath = await cloneRepository('three-files');
      const dir1 = new Directory(workdirPath);
      const dir2 = new Directory(workdirPath);

      const repo1 = await githubPackage.repositoryForProjectDirectory(dir1);
      const repo2 = await githubPackage.repositoryForProjectDirectory(dir2);

      assert.equal(repo1, repo2);
    });
  });
});
