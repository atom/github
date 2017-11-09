import fs from 'fs';
import path from 'path';
import etch from 'etch';

import dedent from 'dedent-js';
import until from 'test-until';

import GitTabController from '../../lib/controllers/git-tab-controller';

import {cloneRepository, buildRepository} from '../helpers';
import Repository, {AbortMergeError, CommitError} from '../../lib/models/repository';
import ResolutionProgress from '../../lib/models/conflicts/resolution-progress';

describe('GitTabController', function() {
  let atomEnvironment, workspace, workspaceElement, commandRegistry, notificationManager, config, tooltips;
  let resolutionProgress, refreshResolutionProgress, destroyFilePatchPaneItems;

  beforeEach(function() {
    atomEnvironment = global.buildAtomEnvironment();
    workspace = atomEnvironment.workspace;
    commandRegistry = atomEnvironment.commands;
    notificationManager = atomEnvironment.notifications;
    config = atomEnvironment.config;
    tooltips = atomEnvironment.tooltips;

    workspaceElement = atomEnvironment.views.getView(workspace);

    resolutionProgress = new ResolutionProgress();
    refreshResolutionProgress = sinon.spy();
    destroyFilePatchPaneItems = sinon.spy();
  });

  afterEach(function() {
    atomEnvironment.destroy();
  });

  it('displays a loading message in GitTabView while data is being fetched', async function() {
    const workdirPath = await cloneRepository('three-files');
    fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n');
    fs.unlinkSync(path.join(workdirPath, 'b.txt'));
    const repository = new Repository(workdirPath);
    assert.isTrue(repository.isLoading());

    const controller = new GitTabController({
      workspace, commandRegistry, tooltips, config, repository,
      resolutionProgress, refreshResolutionProgress,
    });

    assert.strictEqual(controller.getActiveRepository(), repository);
    assert.isTrue(controller.element.classList.contains('is-loading'));
    assert.lengthOf(controller.element.querySelectorAll('.github-StagingView'), 1);
    assert.lengthOf(controller.element.querySelectorAll('.github-CommitView'), 1);

    await repository.getLoadPromise();

    await assert.async.isFalse(controller.element.classList.contains('is-loading'));
    assert.lengthOf(controller.element.querySelectorAll('.github-StagingView'), 1);
    assert.lengthOf(controller.element.querySelectorAll('.github-CommitView'), 1);
  });

  it('displays an initialization prompt for an absent repository', function() {
    const repository = Repository.absent();

    const controller = new GitTabController({
      workspace, commandRegistry, tooltips, config, repository,
      resolutionProgress, refreshResolutionProgress,
    });

    assert.isTrue(controller.element.classList.contains('is-empty'));
    assert.isNotNull(controller.refs.noRepoMessage);
  });

  it('keeps the state of the GitTabView in sync with the assigned repository', async function() {
    const workdirPath1 = await cloneRepository('three-files');
    const repository1 = await buildRepository(workdirPath1);
    const workdirPath2 = await cloneRepository('three-files');
    const repository2 = await buildRepository(workdirPath2);

    fs.writeFileSync(path.join(workdirPath1, 'a.txt'), 'a change\n');
    fs.unlinkSync(path.join(workdirPath1, 'b.txt'));
    const controller = new GitTabController({
      workspace, commandRegistry, tooltips, config, resolutionProgress, refreshResolutionProgress,
      repository: Repository.absent(),
    });

    // Renders empty GitTabView when there is no active repository
    assert.isDefined(controller.refs.gitTab);
    assert.isTrue(controller.getActiveRepository().isAbsent());
    assert.isDefined(controller.refs.gitTab.refs.noRepoMessage);

    // Fetches data when a new repository is assigned
    // Does not update repository instance variable until that data is fetched
    await controller.update({repository: repository1});
    assert.equal(controller.getActiveRepository(), repository1);
    assert.deepEqual(controller.refs.gitTab.props.unstagedChanges, await repository1.getUnstagedChanges());

    await controller.update({repository: repository2});
    assert.equal(controller.getActiveRepository(), repository2);
    assert.deepEqual(controller.refs.gitTab.props.unstagedChanges, await repository2.getUnstagedChanges());

    // Fetches data and updates child view when the repository is mutated
    fs.writeFileSync(path.join(workdirPath2, 'a.txt'), 'a change\n');
    fs.unlinkSync(path.join(workdirPath2, 'b.txt'));
    repository2.refresh();
    await controller.getLastModelDataRefreshPromise();
    await assert.async.deepEqual(controller.refs.gitTab.props.unstagedChanges, await repository2.getUnstagedChanges());
  });

  it('displays the staged changes since the parent commit when amending', async function() {
    const didChangeAmending = sinon.spy();
    const workdirPath = await cloneRepository('multiple-commits');
    const repository = await buildRepository(workdirPath);
    const ensureGitTab = () => Promise.resolve(false);
    const controller = new GitTabController({
      workspace, commandRegistry, tooltips, config, repository, didChangeAmending, ensureGitTab,
      resolutionProgress, refreshResolutionProgress, destroyFilePatchPaneItems,
      isAmending: false,
    });
    await controller.getLastModelDataRefreshPromise();
    await assert.async.deepEqual(controller.refs.gitTab.props.stagedChanges, []);
    assert.equal(didChangeAmending.callCount, 0);

    await controller.setAmending(true);
    assert.equal(didChangeAmending.callCount, 1);
    await controller.update({isAmending: true});
    assert.deepEqual(
      controller.refs.gitTab.props.stagedChanges,
      await controller.getActiveRepository().getStagedChangesSinceParentCommit(),
    );

    await controller.commit('Delete most of the code', {amend: true});
    assert.equal(didChangeAmending.callCount, 2);
    assert.equal(destroyFilePatchPaneItems.callCount, 1);
  });

  it('fetches conflict marker counts for conflicting files', async function() {
    const workdirPath = await cloneRepository('merge-conflict');
    const repository = await buildRepository(workdirPath);
    await assert.isRejected(repository.git.merge('origin/branch'));

    const rp = new ResolutionProgress();
    rp.reportMarkerCount(path.join(workdirPath, 'added-to-both.txt'), 5);

    const controller = new GitTabController({
      workspace, commandRegistry, tooltips, config, repository, resolutionProgress: rp, refreshResolutionProgress,
    });
    await controller.getLastModelDataRefreshPromise();

    await assert.async.isTrue(refreshResolutionProgress.calledWith(path.join(workdirPath, 'modified-on-both-ours.txt')));
    assert.isTrue(refreshResolutionProgress.calledWith(path.join(workdirPath, 'modified-on-both-theirs.txt')));
    assert.isFalse(refreshResolutionProgress.calledWith(path.join(workdirPath, 'added-to-both.txt')));
  });

  describe('abortMerge()', function() {
    it.only('shows an error notification when abortMerge() throws an EDIRTYSTAGED exception', async function() {
      const workdirPath = await cloneRepository('three-files');
      const repository = await buildRepository(workdirPath);
      sinon.stub(repository, 'abortMerge').callsFake(async () => {
        await Promise.resolve();
        throw new AbortMergeError('EDIRTYSTAGED', 'a.txt');
      });

      const confirm = sinon.stub();
      const controller = new GitTabController({
        workspace, commandRegistry, tooltips, config, notificationManager, confirm, repository,
        resolutionProgress, refreshResolutionProgress,
      });
      notificationManager.clear(); // clear out any notifications
      confirm.returns(0);
      await controller.abortMerge();
      assert.equal(notificationManager.getNotifications().length, 1);
    });

    it('resets merge related state', async function() {
      const workdirPath = await cloneRepository('merge-conflict');
      const repository = await buildRepository(workdirPath);

      await assert.isRejected(repository.git.merge('origin/branch'));

      const confirm = sinon.stub();
      const controller = new GitTabController({
        workspace, commandRegistry, tooltips, config, confirm, repository,
        resolutionProgress, refreshResolutionProgress,
      });
      await controller.getLastModelDataRefreshPromise();
      let modelData = controller.repositoryObserver.getActiveModelData();

      assert.notEqual(modelData.mergeConflicts.length, 0);
      assert.isTrue(modelData.isMerging);
      assert.isOk(modelData.mergeMessage);

      confirm.returns(0);
      await controller.abortMerge();
      await controller.getLastModelDataRefreshPromise();
      modelData = controller.repositoryObserver.getActiveModelData();

      assert.equal(modelData.mergeConflicts.length, 0);
      assert.isFalse(modelData.isMerging);
      assert.isNull(modelData.mergeMessage);
    });
  });

  describe('prepareToCommit', function() {
    it('shows the git panel and returns false if it was hidden', async function() {
      const workdirPath = await cloneRepository('three-files');
      const repository = await buildRepository(workdirPath);

      const ensureGitTab = () => Promise.resolve(true);
      const controller = new GitTabController({
        workspace, commandRegistry, tooltips, config, repository, ensureGitTab,
        resolutionProgress, refreshResolutionProgress,
      });

      assert.isFalse(await controller.prepareToCommit());
    });

    it('returns true if the git panel was already visible', async function() {
      const workdirPath = await cloneRepository('three-files');
      const repository = await buildRepository(workdirPath);

      const ensureGitTab = () => Promise.resolve(false);
      const controller = new GitTabController({
        workspace, commandRegistry, tooltips, config, repository, ensureGitTab,
        resolutionProgress, refreshResolutionProgress,
      });

      assert.isTrue(await controller.prepareToCommit());
    });
  });

  describe('commit(message)', function() {
    it.only('shows an error notification when committing throws an ECONFLICT exception', async function() {
      const workdirPath = await cloneRepository('three-files');
      const repository = await buildRepository(workdirPath);
      sinon.stub(repository, 'commit').callsFake(async () => {
        await Promise.resolve();
        throw new CommitError('ECONFLICT');
      });

      const controller = new GitTabController({
        workspace, commandRegistry, tooltips, config, notificationManager, repository,
        resolutionProgress, refreshResolutionProgress,
      });
      notificationManager.clear(); // clear out any notifications
      await controller.commit();
      assert.equal(notificationManager.getNotifications().length, 1);
    });

    it('sets amending to false', async function() {
      const workdirPath = await cloneRepository('three-files');
      const repository = await buildRepository(workdirPath);
      sinon.stub(repository, 'commit').callsFake(() => Promise.resolve());
      const didChangeAmending = sinon.stub();
      const controller = new GitTabController({
        workspace, commandRegistry, tooltips, config, repository, didChangeAmending,
        resolutionProgress, refreshResolutionProgress, destroyFilePatchPaneItems,
      });

      await controller.commit('message');
      assert.equal(didChangeAmending.callCount, 1);
      assert.equal(destroyFilePatchPaneItems.callCount, 1);
    });
  });

  it('selects an item by description', async function() {
    const workdirPath = await cloneRepository('three-files');
    const repository = await buildRepository(workdirPath);

    fs.writeFileSync(path.join(workdirPath, 'unstaged-1.txt'), 'This is an unstaged file.');
    fs.writeFileSync(path.join(workdirPath, 'unstaged-2.txt'), 'This is an unstaged file.');
    fs.writeFileSync(path.join(workdirPath, 'unstaged-3.txt'), 'This is an unstaged file.');
    repository.refresh();

    const controller = new GitTabController({
      workspace, commandRegistry, tooltips, config, repository,
      resolutionProgress, refreshResolutionProgress,
    });
    await controller.getLastModelDataRefreshPromise();
    await etch.getScheduler().getNextUpdatePromise();

    const gitTab = controller.refs.gitTab;
    const stagingView = gitTab.refs.stagingView;

    sinon.spy(stagingView, 'setFocus');

    await controller.focusAndSelectStagingItem('unstaged-2.txt', 'unstaged');

    const selections = Array.from(stagingView.selection.getSelectedItems());
    assert.equal(selections.length, 1);
    assert.equal(selections[0].filePath, 'unstaged-2.txt');

    assert.equal(stagingView.setFocus.callCount, 1);
  });

  describe('focus management', function() {
    it('does nothing on an absent repository', function() {
      const repository = Repository.absent();

      const controller = new GitTabController({
        workspace, commandRegistry, tooltips, config, repository,
        resolutionProgress, refreshResolutionProgress,
      });

      assert.isTrue(controller.element.classList.contains('is-empty'));
      assert.isNotNull(controller.refs.noRepoMessage);

      controller.rememberLastFocus({target: controller.element});
      assert.strictEqual(controller.lastFocus, GitTabController.focus.STAGING);

      controller.restoreFocus();
    });
  });

  describe('keyboard navigation commands', function() {
    let controller, gitTab, stagingView, commitView, commitViewController, focusElement;
    const focuses = GitTabController.focus;

    const extractReferences = () => {
      gitTab = controller.refs.gitTab;
      stagingView = gitTab.refs.stagingView;
      commitViewController = gitTab.refs.commitViewController;
      commitView = commitViewController.refs.commitView;
      focusElement = stagingView.element;

      const stubFocus = element => {
        if (!element) {
          return;
        }
        sinon.stub(element, 'focus').callsFake(() => {
          focusElement = element;
        });
      };
      stubFocus(stagingView.element);
      stubFocus(commitView.editorElement);
      stubFocus(commitView.refs.abortMergeButton);
      stubFocus(commitView.refs.amend);
      stubFocus(commitView.refs.commitButton);

      sinon.stub(commitViewController, 'hasFocus').callsFake(() => {
        return [
          commitView.editorElement,
          commitView.refs.abortMergeButton,
          commitView.refs.amend,
          commitView.refs.commitButton,
        ].includes(focusElement);
      });
    };

    const assertSelected = paths => {
      const selectionPaths = Array.from(stagingView.selection.getSelectedItems()).map(item => item.filePath);
      assert.deepEqual(selectionPaths, paths);
    };

    describe('with conflicts and staged files', function() {
      beforeEach(async function() {
        const workdirPath = await cloneRepository('each-staging-group');
        const repository = await buildRepository(workdirPath);

        // Merge with conflicts
        assert.isRejected(repository.git.merge('origin/branch'));

        fs.writeFileSync(path.join(workdirPath, 'unstaged-1.txt'), 'This is an unstaged file.');
        fs.writeFileSync(path.join(workdirPath, 'unstaged-2.txt'), 'This is an unstaged file.');
        fs.writeFileSync(path.join(workdirPath, 'unstaged-3.txt'), 'This is an unstaged file.');

        // Three staged files
        fs.writeFileSync(path.join(workdirPath, 'staged-1.txt'), 'This is a file with some changes staged for commit.');
        fs.writeFileSync(path.join(workdirPath, 'staged-2.txt'), 'This is another file staged for commit.');
        fs.writeFileSync(path.join(workdirPath, 'staged-3.txt'), 'This is a third file staged for commit.');
        await repository.stageFiles(['staged-1.txt', 'staged-2.txt', 'staged-3.txt']);
        repository.refresh();

        const didChangeAmending = () => {};

        controller = new GitTabController({
          workspace, commandRegistry, tooltips, config, repository,
          resolutionProgress, refreshResolutionProgress,
          didChangeAmending,
        });
        await controller.getLastModelDataRefreshPromise();
        await etch.getScheduler().getNextUpdatePromise();

        extractReferences();
      });

      it('blurs on tool-panel:unfocus', function() {
        sinon.spy(workspace.getActivePane(), 'activate');

        commandRegistry.dispatch(controller.element, 'tool-panel:unfocus');

        assert.isTrue(workspace.getActivePane().activate.called);
      });

      it('advances focus through StagingView groups and CommitView, but does not cycle', function() {
        assertSelected(['unstaged-1.txt']);

        commandRegistry.dispatch(controller.element, 'core:focus-next');
        assertSelected(['conflict-1.txt']);

        commandRegistry.dispatch(controller.element, 'core:focus-next');
        assertSelected(['staged-1.txt']);

        commandRegistry.dispatch(controller.element, 'core:focus-next');
        assertSelected(['staged-1.txt']);
        assert.strictEqual(focusElement, commitView.editorElement);

        // This should be a no-op. (Actually, it'll insert a tab in the CommitView editor.)
        commandRegistry.dispatch(controller.element, 'core:focus-next');
        assertSelected(['staged-1.txt']);
        assert.strictEqual(focusElement, commitView.editorElement);
      });

      it('retreats focus from the CommitView through StagingView groups, but does not cycle', function() {
        gitTab.setFocus(focuses.EDITOR);

        commandRegistry.dispatch(controller.element, 'core:focus-previous');
        assertSelected(['staged-1.txt']);

        commandRegistry.dispatch(controller.element, 'core:focus-previous');
        assertSelected(['conflict-1.txt']);

        commandRegistry.dispatch(controller.element, 'core:focus-previous');
        assertSelected(['unstaged-1.txt']);

        // This should be a no-op.
        commandRegistry.dispatch(controller.element, 'core:focus-previous');
        assertSelected(['unstaged-1.txt']);
      });
    });

    describe('with staged changes', function() {
      beforeEach(async function() {
        const workdirPath = await cloneRepository('each-staging-group');
        const repository = await buildRepository(workdirPath);

        // A staged file
        fs.writeFileSync(path.join(workdirPath, 'staged-1.txt'), 'This is a file with some changes staged for commit.');
        await repository.stageFiles(['staged-1.txt']);
        repository.refresh();

        const didChangeAmending = () => {};
        const prepareToCommit = () => Promise.resolve(true);
        const ensureGitTab = () => Promise.resolve(false);

        controller = new GitTabController({
          workspace, commandRegistry, tooltips, config, repository, didChangeAmending, prepareToCommit, ensureGitTab,
          resolutionProgress, refreshResolutionProgress, destroyFilePatchPaneItems,
        });
        await controller.getLastModelDataRefreshPromise();
        await etch.getScheduler().getNextUpdatePromise();

        extractReferences();
      });

      it('focuses the CommitView on github:commit with an empty commit message', async function() {
        commitView.editor.setText('');
        sinon.spy(controller, 'commit');
        await etch.update(controller); // Ensure that the spy is passed to child components in props

        commandRegistry.dispatch(workspaceElement, 'github:commit');

        await assert.async.strictEqual(focusElement, commitView.editorElement);
        assert.isFalse(controller.commit.called);
      });

      it('creates a commit on github:commit with a nonempty commit message', async function() {
        commitView.editor.setText('I fixed the things');
        sinon.spy(controller, 'commit');
        await etch.update(controller); // Ensure that the spy is passed to child components in props

        commandRegistry.dispatch(workspaceElement, 'github:commit');

        await until('Commit method called', () => controller.commit.calledWith('I fixed the things'));
      });
    });
  });

  describe('integration tests', function() {
    it('can stage and unstage files and commit', async function() {
      const workdirPath = await cloneRepository('three-files');
      const repository = await buildRepository(workdirPath);
      fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n');
      fs.unlinkSync(path.join(workdirPath, 'b.txt'));
      const ensureGitTab = () => Promise.resolve(false);
      const controller = new GitTabController({
        workspace, commandRegistry, tooltips, config, repository, ensureGitTab, didChangeAmending: sinon.stub(),
        resolutionProgress, refreshResolutionProgress, destroyFilePatchPaneItems,
      });
      await controller.getLastModelDataRefreshPromise();
      await etch.getScheduler().getNextUpdatePromise();
      const stagingView = controller.refs.gitTab.refs.stagingView;
      const commitView = controller.refs.gitTab.refs.commitViewController.refs.commitView;

      assert.lengthOf(stagingView.props.unstagedChanges, 2);
      assert.lengthOf(stagingView.props.stagedChanges, 0);

      stagingView.dblclickOnItem({}, stagingView.props.unstagedChanges[0]);

      await assert.async.lengthOf(stagingView.props.unstagedChanges, 1);
      assert.lengthOf(stagingView.props.stagedChanges, 1);

      stagingView.dblclickOnItem({}, stagingView.props.unstagedChanges[0]);

      await assert.async.lengthOf(stagingView.props.unstagedChanges, 0);
      assert.lengthOf(stagingView.props.stagedChanges, 2);

      stagingView.dblclickOnItem({}, stagingView.props.stagedChanges[1]);

      await assert.async.lengthOf(stagingView.props.unstagedChanges, 1);
      assert.lengthOf(stagingView.props.stagedChanges, 1);

      commitView.refs.editor.setText('Make it so');
      await commitView.commit();
      assert.equal(destroyFilePatchPaneItems.callCount, 1);

      assert.equal((await repository.getLastCommit()).getMessage(), 'Make it so');
    });

    it('can stage merge conflict files', async function() {
      const workdirPath = await cloneRepository('merge-conflict');
      const repository = await buildRepository(workdirPath);

      await assert.isRejected(repository.git.merge('origin/branch'));

      const confirm = sinon.stub();
      const controller = new GitTabController({
        workspace, commandRegistry, tooltips, config, confirm, repository,
        resolutionProgress, refreshResolutionProgress,
      });
      await assert.async.isDefined(controller.refs.gitTab.refs.stagingView);
      const stagingView = controller.refs.gitTab.refs.stagingView;

      await assert.async.equal(stagingView.props.mergeConflicts.length, 5);
      assert.equal(stagingView.props.stagedChanges.length, 0);

      const conflict1 = stagingView.props.mergeConflicts.filter(c => c.filePath === 'modified-on-both-ours.txt')[0];
      const contentsWithMarkers = fs.readFileSync(path.join(workdirPath, conflict1.filePath), 'utf8');
      assert.include(contentsWithMarkers, '>>>>>>>');
      assert.include(contentsWithMarkers, '<<<<<<<');

      // click Cancel
      confirm.returns(1);
      await stagingView.dblclickOnItem({}, conflict1).selectionUpdatePromise;

      await assert.async.lengthOf(stagingView.props.mergeConflicts, 5);
      assert.lengthOf(stagingView.props.stagedChanges, 0);
      assert.isTrue(confirm.calledOnce);

      // click Stage
      confirm.reset();
      confirm.returns(0);
      await stagingView.dblclickOnItem({}, conflict1).selectionUpdatePromise;

      await assert.async.lengthOf(stagingView.props.mergeConflicts, 4);
      assert.lengthOf(stagingView.props.stagedChanges, 1);
      assert.isTrue(confirm.calledOnce);

      // clear merge markers
      const conflict2 = stagingView.props.mergeConflicts.filter(c => c.filePath === 'modified-on-both-theirs.txt')[0];
      confirm.reset();
      fs.writeFileSync(path.join(workdirPath, conflict2.filePath), 'text with no merge markers');
      stagingView.dblclickOnItem({}, conflict2);

      await assert.async.lengthOf(stagingView.props.mergeConflicts, 3);
      assert.lengthOf(stagingView.props.stagedChanges, 2);
      assert.isFalse(confirm.called);
    });

    it('avoids conflicts with pending file staging operations', async function() {
      const workdirPath = await cloneRepository('three-files');
      const repository = await buildRepository(workdirPath);
      fs.unlinkSync(path.join(workdirPath, 'a.txt'));
      fs.unlinkSync(path.join(workdirPath, 'b.txt'));
      const controller = new GitTabController({
        workspace, commandRegistry, tooltips, config, repository, resolutionProgress, refreshResolutionProgress,
      });

      await assert.async.isDefined(controller.refs.gitTab.refs.stagingView);
      const stagingView = controller.refs.gitTab.refs.stagingView;

      await assert.async.lengthOf(stagingView.props.unstagedChanges, 2);

      // ensure staging the same file twice does not cause issues
      // second stage action is a no-op since the first staging operation is in flight
      const file1StagingPromises = stagingView.confirmSelectedItems();
      stagingView.confirmSelectedItems();

      await file1StagingPromises.stageOperationPromise;
      await file1StagingPromises.selectionUpdatePromise;

      await assert.async.lengthOf(stagingView.props.unstagedChanges, 1);

      const file2StagingPromises = stagingView.confirmSelectedItems();
      await file2StagingPromises.stageOperationPromise;
      await file2StagingPromises.selectionUpdatePromise;

      await assert.async.lengthOf(stagingView.props.unstagedChanges, 0);
    });

    it('updates file status and paths when changed', async function() {
      const workdirPath = await cloneRepository('three-files');
      const repository = await buildRepository(workdirPath);
      fs.writeFileSync(path.join(workdirPath, 'new-file.txt'), 'foo\nbar\nbaz\n');

      const controller = new GitTabController({
        workspace, commandRegistry, tooltips, config, repository, resolutionProgress, refreshResolutionProgress,
      });
      await controller.getLastModelDataRefreshPromise();
      await etch.getScheduler().getNextUpdatePromise();
      const stagingView = controller.refs.gitTab.refs.stagingView;

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
      await repository.git.applyPatch(patchString, {index: true});
      repository.refresh();
      await controller.getLastModelDataRefreshPromise();
      await etch.getScheduler().getNextUpdatePromise();

      // since unstaged changes are calculated relative to the index,
      // which now has new-file.txt on it, the working directory version of
      // new-file.txt has a modified status
      const [modifiedFilePatch] = stagingView.props.unstagedChanges;
      assert.equal(modifiedFilePatch.status, 'modified');
      assert.equal(modifiedFilePatch.filePath, 'new-file.txt');
    });
  });
});
