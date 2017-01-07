import fs from 'fs';
import path from 'path';
import temp from 'temp';
import until from 'test-until';

import {cloneRepository} from './helpers';
import GithubPackage from '../lib/github-package';

describe('GithubPackage', function() {
  let atomEnv, workspace, project, commandRegistry, notificationManager, githubPackage;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
    workspace = atomEnv.workspace;
    project = atomEnv.project;
    commandRegistry = atomEnv.commands;
    notificationManager = atomEnv.notifications;
    githubPackage = new GithubPackage(workspace, project, commandRegistry, notificationManager);
  });

  afterEach(function() {
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
    it('updates the active repository', async function() {
      const workdirPath1 = await cloneRepository('three-files');
      const workdirPath2 = await cloneRepository('three-files');
      const nonRepositoryPath = temp.mkdirSync();
      fs.writeFileSync(path.join(nonRepositoryPath, 'c.txt'));
      project.setPaths([workdirPath1, workdirPath2, nonRepositoryPath]);
      fs.writeFileSync(path.join(workdirPath1, 'a.txt'), 'change 1', 'utf8');
      await githubPackage.activate();

      sinon.spy(githubPackage, 'rerender');
      await workspace.open(path.join(workdirPath1, 'a.txt'));
      const repository1 = await githubPackage.getRepositoryForWorkdirPath(workdirPath1);
      await until(() => githubPackage.getActiveRepository() === repository1);
      assert.equal(githubPackage.rerender.callCount, 1);

      // Remove repository for open file
      project.setPaths([workdirPath2, nonRepositoryPath]);
      await until(() => githubPackage.getActiveRepository() === null);
      assert.equal(githubPackage.rerender.callCount, 2);

      await workspace.open(path.join(workdirPath2, 'b.txt'));
      const repository2 = await githubPackage.getRepositoryForWorkdirPath(workdirPath2);
      await until(() => githubPackage.getActiveRepository() === repository2);
      assert.equal(githubPackage.rerender.callCount, 3);

      await workspace.open(path.join(nonRepositoryPath, 'c.txt'));
      await until(() => githubPackage.getActiveRepository() === null);
      assert.equal(githubPackage.rerender.callCount, 4);
    });

    it('destroys all the repositories associated with the removed project folders', async function() {
      const workdirPath1 = await cloneRepository('three-files');
      const workdirPath2 = await cloneRepository('three-files');
      const workdirPath3 = await cloneRepository('three-files');
      project.setPaths([workdirPath1, workdirPath2, workdirPath3]);
      await githubPackage.activate();

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

  describe('updateActiveRepository()', function() {
    it('updates the active repository based on the active item, setting it to null when the active item is not in a project repository', async function() {
      // TODO: FIXME Warning: Possible EventEmitter memory leak detected. 11 ipc-helpers-window-method-response listeners added.
      const workdirPath1 = await cloneRepository('three-files');
      const workdirPath2 = await cloneRepository('three-files');
      const nonRepositoryPath = temp.mkdirSync();
      fs.writeFileSync(path.join(nonRepositoryPath, 'c.txt'));
      project.setPaths([workdirPath1, workdirPath2, nonRepositoryPath]);
      await githubPackage.activate();

      await workspace.open(path.join(workdirPath1, 'a.txt'));
      await workspace.open(path.join(workdirPath2, 'b.txt'));

      await githubPackage.updateActiveRepository();
      assert.isNotNull(githubPackage.getActiveRepository());
      assert.equal(githubPackage.getActiveRepository(), await githubPackage.getRepositoryForWorkdirPath(workdirPath2));

      await workspace.open(path.join(nonRepositoryPath, 'c.txt'));
      await githubPackage.updateActiveRepository();
      assert.isNull(githubPackage.getActiveRepository());

      await workspace.open(path.join(workdirPath1, 'a.txt'));
      await githubPackage.updateActiveRepository();
      assert.equal(githubPackage.getActiveRepository(), await githubPackage.getRepositoryForWorkdirPath(workdirPath1));

      workspace.getActivePane().activateItem({}); // such as when find & replace results pane is focused
      await githubPackage.updateActiveRepository();
      assert.equal(githubPackage.getActiveRepository(), await githubPackage.getRepositoryForWorkdirPath(workdirPath1));

      await workspace.open(path.join(workdirPath2, 'b.txt'));
      await githubPackage.updateActiveRepository();
      assert.equal(githubPackage.getActiveRepository(), await githubPackage.getRepositoryForWorkdirPath(workdirPath2));

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

  describe('when there is a change in the repository', function() {
    it('refreshes the appropriate Repository instance and corresponding Atom GitRepository instance', async function() {
      const workdirPath1 = await cloneRepository('three-files');
      const workdirPath2 = await cloneRepository('three-files');

      project.setPaths([workdirPath1, workdirPath2]);
      await githubPackage.activate();
      const [atomGitRepository1, atomGitRepository2] = githubPackage.project.getRepositories();
      sinon.stub(atomGitRepository1, 'refreshStatus');
      sinon.stub(atomGitRepository2, 'refreshStatus');

      const repository1 = await githubPackage.getRepositoryForWorkdirPath(workdirPath1);
      const repository2 = await githubPackage.getRepositoryForWorkdirPath(workdirPath2);
      sinon.stub(repository1, 'refresh');
      sinon.stub(repository2, 'refresh');

      repository1.refresh.reset();
      repository2.refresh.reset();
      atomGitRepository1.refreshStatus.reset();
      atomGitRepository2.refreshStatus.reset();

      // change file in repository1
      let changePromise = (await githubPackage.getChangeObserverForWorkdirPath(workdirPath1)).getLastChangePromise();
      fs.writeFileSync(path.join(workdirPath1, 'a.txt'), 'some changes', 'utf8');
      await changePromise;

      assert.isTrue(repository1.refresh.called);
      assert.isTrue(atomGitRepository1.refreshStatus.called);
      assert.isFalse(repository2.refresh.called);
      assert.isFalse(atomGitRepository2.refreshStatus.called);
      await new Promise(res => setTimeout(res, 500));
      repository1.refresh.reset();
      atomGitRepository1.refreshStatus.reset();

      // change file in repository2
      changePromise = (await githubPackage.getChangeObserverForWorkdirPath(workdirPath2)).getLastChangePromise();
      fs.writeFileSync(path.join(workdirPath2, 'b.txt'), 'other changes', 'utf8');
      await changePromise;

      assert.isFalse(repository1.refresh.called);
      assert.isFalse(atomGitRepository1.refreshStatus.called);
      assert.isTrue(repository2.refresh.called);
      assert.isTrue(atomGitRepository2.refreshStatus.called);
      await new Promise(res => setTimeout(res, 500));
      repository2.refresh.reset();
      atomGitRepository2.refreshStatus.reset();

      // change HEAD in repository1
      changePromise = (await githubPackage.getChangeObserverForWorkdirPath(workdirPath1)).getLastChangePromise();
      await repository1.git.exec(['commit', '-am', 'commit in repository1']);
      await changePromise;

      assert.isTrue(repository1.refresh.called);
      assert.isTrue(atomGitRepository1.refreshStatus.called);
      assert.isFalse(repository2.refresh.called);
      assert.isFalse(atomGitRepository2.refreshStatus.called);
      await new Promise(res => setTimeout(res, 500));
      repository1.refresh.reset();
      atomGitRepository1.refreshStatus.reset();

      // change HEAD in repository1
      changePromise = (await githubPackage.getChangeObserverForWorkdirPath(workdirPath2)).getLastChangePromise();
      await repository2.git.exec(['commit', '-am', 'commit in repository2']);
      await changePromise;

      assert.isTrue(repository2.refresh.called);
      assert.isTrue(atomGitRepository2.refreshStatus.called);
      assert.isFalse(repository1.refresh.called);
      assert.isFalse(atomGitRepository1.refreshStatus.called);
    });
  });

  describe('#projectPathForItemPath', function() {
    it('does not error when the path is falsy (e.g. an empty text editor)', function() {
      sinon.stub(project, 'getPaths').returns(['path']);
      assert.doesNotThrow(() => {
        githubPackage.projectPathForItemPath(null);
      });
    });

    it('returns the correct path when the item path starts with the project path but the item path is not in the project', function() {
      sinon.stub(project, 'getPaths').returns([path.join('path', 'to', 'my'), path.join('path', 'to', 'my-project')]);
      assert.equal(githubPackage.projectPathForItemPath(path.join('path', 'to', 'my-project', 'file.txt')), path.join('path', 'to', 'my-project'));
    });
  });
});
