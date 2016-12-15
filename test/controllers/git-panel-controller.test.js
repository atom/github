/** @babel */

import fs from 'fs';
import path from 'path';

import dedent from 'dedent-js';

import GitPanelController from '../../lib/controllers/git-panel-controller';

import {cloneRepository, buildRepository} from '../helpers';
import {AbortMergeError, CommitError} from '../../lib/models/repository';

describe('GitPanelController', () => {
  let atomEnvironment, workspace, commandRegistry, notificationManager;

  beforeEach(() => {
    atomEnvironment = global.buildAtomEnvironment();
    workspace = atomEnvironment.workspace;
    commandRegistry = atomEnvironment.commands;
    notificationManager = atomEnvironment.notifications;
  });

  afterEach(() => {
    atomEnvironment.destroy();
    atom.confirm.restore && atom.confirm.restore();
  });

  it('displays loading message in GitPanelView while data is being fetched', async () => {
    const workdirPath = await cloneRepository('three-files');
    const repository = await buildRepository(workdirPath);
    fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n');
    fs.unlinkSync(path.join(workdirPath, 'b.txt'));
    const controller = new GitPanelController({workspace, commandRegistry, repository});

    assert.equal(controller.getActiveRepository(), repository);
    assert.isDefined(controller.refs.gitPanel.refs.repoLoadingMessage);
    assert.isUndefined(controller.refs.gitPanel.refs.repoInfo);

    await controller.getLastModelDataRefreshPromise();
    assert.equal(controller.getActiveRepository(), repository);
    assert.isUndefined(controller.refs.gitPanel.refs.repoLoadingMessage);
    assert.isDefined(controller.refs.gitPanel.refs.repoInfo);
  });

  it('keeps the state of the GitPanelView in sync with the assigned repository', async () => {
    const workdirPath1 = await cloneRepository('three-files');
    const repository1 = await buildRepository(workdirPath1);
    const workdirPath2 = await cloneRepository('three-files');
    const repository2 = await buildRepository(workdirPath2);
    fs.writeFileSync(path.join(workdirPath1, 'a.txt'), 'a change\n');
    fs.unlinkSync(path.join(workdirPath1, 'b.txt'));
    const controller = new GitPanelController({workspace, commandRegistry, repository: null});

    // Renders empty GitPanelView when there is no active repository
    assert.isDefined(controller.refs.gitPanel);
    assert.isNull(controller.getActiveRepository());
    assert.isDefined(controller.refs.gitPanel.refs.noRepoMessage);

    // Fetches data when a new repository is assigned
    // Does not update repository instance variable until that data is fetched
    await controller.update({repository: repository1});
    assert.equal(controller.getActiveRepository(), repository1);
    assert.deepEqual(controller.refs.gitPanel.props.unstagedChanges, await repository1.getUnstagedChanges());

    await controller.update({repository: repository2});
    assert.equal(controller.getActiveRepository(), repository2);
    assert.deepEqual(controller.refs.gitPanel.props.unstagedChanges, await repository2.getUnstagedChanges());

    // Fetches data and updates child view when the repository is mutated
    fs.writeFileSync(path.join(workdirPath2, 'a.txt'), 'a change\n');
    fs.unlinkSync(path.join(workdirPath2, 'b.txt'));
    await repository2.refresh();
    await controller.getLastModelDataRefreshPromise();
    assert.deepEqual(controller.refs.gitPanel.props.unstagedChanges, await repository2.getUnstagedChanges());
  });

  it('displays the staged changes since the parent commmit when amending', async () => {
    const didChangeAmending = sinon.spy();
    const workdirPath = await cloneRepository('multiple-commits');
    const repository = await buildRepository(workdirPath);
    const controller = new GitPanelController({workspace, commandRegistry, repository, didChangeAmending, isAmending: false});
    await controller.getLastModelDataRefreshPromise();
    assert.deepEqual(controller.refs.gitPanel.props.stagedChanges, []);
    assert.equal(didChangeAmending.callCount, 0);

    await controller.setAmending(true);
    assert.equal(didChangeAmending.callCount, 1);
    await controller.update({isAmending: true});
    assert.deepEqual(
      controller.refs.gitPanel.props.stagedChanges,
      await controller.getActiveRepository().getStagedChangesSinceParentCommit(),
    );

    await controller.commit('Delete most of the code', {amend: true});
    assert.equal(didChangeAmending.callCount, 2);
  });

  describe('abortMerge()', () => {
    it('shows an error notification when abortMerge() throws an EDIRTYSTAGED exception', async () => {
      const workdirPath = await cloneRepository('three-files');
      const repository = await buildRepository(workdirPath);
      sinon.stub(repository, 'abortMerge', async () => {
        await Promise.resolve();
        throw new AbortMergeError('EDIRTYSTAGED', 'a.txt');
      });

      const controller = new GitPanelController({workspace, commandRegistry, notificationManager, repository});
      assert.equal(notificationManager.getNotifications().length, 0);
      sinon.stub(atom, 'confirm').returns(0);
      await controller.abortMerge();
      assert.equal(notificationManager.getNotifications().length, 1);
    });

    it('resets merge related state', async () => {
      const workdirPath = await cloneRepository('merge-conflict');
      const repository = await buildRepository(workdirPath);

      await repository.git.merge('origin/branch')
        .then(() => { throw new Error('Expected merge to throw an error'); })
        .catch(() => true);

      const controller = new GitPanelController({workspace, commandRegistry, repository});
      await controller.getLastModelDataRefreshPromise();
      let modelData = controller.repositoryObserver.getActiveModelData();

      assert.notEqual(modelData.mergeConflicts.length, 0);
      assert.isTrue(modelData.isMerging);
      assert.isOk(modelData.mergeMessage);

      sinon.stub(atom, 'confirm').returns(0);
      await controller.abortMerge();
      await controller.getLastModelDataRefreshPromise();
      modelData = controller.repositoryObserver.getActiveModelData();

      assert.equal(modelData.mergeConflicts.length, 0);
      assert.isFalse(modelData.isMerging);
      assert.isNull(modelData.mergeMessage);
    });
  });

  describe('commit(message)', () => {
    it('shows an error notification when committing throws an ECONFLICT exception', async () => {
      const workdirPath = await cloneRepository('three-files');
      const repository = await buildRepository(workdirPath);
      sinon.stub(repository, 'commit', async () => {
        await Promise.resolve();
        throw new CommitError('ECONFLICT');
      });

      const controller = new GitPanelController({workspace, commandRegistry, notificationManager, repository});
      assert.equal(notificationManager.getNotifications().length, 0);
      await controller.commit();
      assert.equal(notificationManager.getNotifications().length, 1);
    });

    it('sets amending to false', async () => {
      const workdirPath = await cloneRepository('three-files');
      const repository = await buildRepository(workdirPath);
      sinon.stub(repository, 'commit', () => Promise.resolve());
      const didChangeAmending = sinon.stub();
      const controller = new GitPanelController({workspace, commandRegistry, repository, didChangeAmending});

      await controller.commit('message');
      assert.equal(didChangeAmending.callCount, 1);
    });
  });


  describe('integration tests', () => {
    it('can stage and unstage files and commit', async () => {
      const workdirPath = await cloneRepository('three-files');
      const repository = await buildRepository(workdirPath);
      fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n');
      fs.unlinkSync(path.join(workdirPath, 'b.txt'));
      const controller = new GitPanelController({workspace, commandRegistry, repository, didChangeAmending: sinon.stub()});
      await controller.getLastModelDataRefreshPromise();
      const stagingView = controller.refs.gitPanel.refs.stagingView;
      const commitView = controller.refs.gitPanel.refs.commitViewController.refs.commitView;

      assert.equal(stagingView.props.unstagedChanges.length, 2);
      assert.equal(stagingView.props.stagedChanges.length, 0);
      await stagingView.mousedownOnItem({detail: 2}, stagingView.props.unstagedChanges[0]);
      await repository.refresh();
      await controller.getLastModelDataRefreshPromise();
      await stagingView.mousedownOnItem({detail: 2}, stagingView.props.unstagedChanges[0]);
      await repository.refresh();
      await controller.getLastModelDataRefreshPromise();
      assert.equal(stagingView.props.unstagedChanges.length, 0);
      assert.equal(stagingView.props.stagedChanges.length, 2);
      await stagingView.mousedownOnItem({detail: 2}, stagingView.props.stagedChanges[1]);
      await repository.refresh();
      await controller.getLastModelDataRefreshPromise();
      assert.equal(stagingView.props.unstagedChanges.length, 1);
      assert.equal(stagingView.props.stagedChanges.length, 1);

      commitView.refs.editor.setText('Make it so');
      await commitView.commit();
      await controller.getLastModelDataRefreshPromise();

      assert.equal((await repository.getLastCommit()).message, 'Make it so');
    });

    it('can stage merge conflict files', async () => {
      const workdirPath = await cloneRepository('merge-conflict');
      const repository = await buildRepository(workdirPath);

      try {
        await repository.git.merge('origin/branch');
      } catch (e) {
        // expected
      }

      const controller = new GitPanelController({workspace, commandRegistry, repository});
      await controller.getLastModelDataRefreshPromise();

      const stagingView = controller.refs.gitPanel.refs.stagingView;
      assert.equal(stagingView.props.mergeConflicts.length, 5);
      assert.equal(stagingView.props.stagedChanges.length, 0);

      const conflict1 = stagingView.props.mergeConflicts.filter(c => c.filePath === 'modified-on-both-ours.txt')[0];
      const contentsWithMarkers = fs.readFileSync(path.join(workdirPath, conflict1.filePath), 'utf8');
      assert(contentsWithMarkers.includes('>>>>>>>'));
      assert(contentsWithMarkers.includes('<<<<<<<'));

      let choice;
      sinon.stub(atom, 'confirm', () => {
        return choice;
      });

      // click Cancel
      choice = 1;
      await stagingView.mousedownOnItem({detail: 2}, conflict1);
      await repository.refresh();
      await controller.getLastModelDataRefreshPromise();
      assert.equal(atom.confirm.calledOnce, true);
      assert.equal(stagingView.props.mergeConflicts.length, 5);
      assert.equal(stagingView.props.stagedChanges.length, 0);

      // click Stage
      choice = 0;
      atom.confirm.reset();
      await stagingView.mousedownOnItem({detail: 2}, conflict1);
      await repository.refresh();
      await controller.getLastModelDataRefreshPromise();
      assert.equal(atom.confirm.calledOnce, true);
      assert.equal(stagingView.props.mergeConflicts.length, 4);
      assert.equal(stagingView.props.stagedChanges.length, 1);

      // clear merge markers
      const conflict2 = stagingView.props.mergeConflicts.filter(c => c.filePath === 'modified-on-both-theirs.txt')[0];
      atom.confirm.reset();
      fs.writeFileSync(path.join(workdirPath, conflict2.filePath), 'text with no merge markers');
      await stagingView.mousedownOnItem({detail: 2}, conflict2);
      await repository.refresh();
      await controller.getLastModelDataRefreshPromise();
      assert.equal(atom.confirm.called, false);
      assert.equal(stagingView.props.mergeConflicts.length, 3);
      assert.equal(stagingView.props.stagedChanges.length, 2);
    });

    it('updates file status and paths when changed', async () => {
      const workdirPath = await cloneRepository('three-files');
      const repository = await buildRepository(workdirPath);
      fs.writeFileSync(path.join(workdirPath, 'new-file.txt'), 'foo\nbar\nbaz\n');

      const controller = new GitPanelController({workspace, commandRegistry, repository});
      await controller.getLastModelDataRefreshPromise();
      const stagingView = controller.refs.gitPanel.refs.stagingView;

      const [addedFilePatch] = stagingView.props.unstagedChanges;
      assert.equal(addedFilePatch.filePath, 'new-file.txt');
      assert.equal(addedFilePatch.status, 'added');

      const patchString = dedent`
        --- /dev/null
        +++ b/new-file.txt
        @@ -0,0 +1,1 @@
        +foo

      `;

      // partially stage contents in the newly added file
      await repository.git.applyPatchToIndex(patchString);
      await repository.refresh();
      await controller.getLastModelDataRefreshPromise();

      // since unstaged changes are calculated relative to the index,
      // which now has new-file.txt on it, the working directory version of
      // new-file.txt has a modified status
      const [modifiedFilePatch] = stagingView.props.unstagedChanges;
      assert.equal(modifiedFilePatch.status, 'modified');
      assert.equal(modifiedFilePatch.filePath, 'new-file.txt');
    });
  });
});
