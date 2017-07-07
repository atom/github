import path from 'path';
import StagingView from '../../lib/views/staging-view';
import ResolutionProgress from '../../lib/models/conflicts/resolution-progress';

import {assertEqualSets} from '../helpers';

describe('StagingView', function() {
  const workingDirectoryPath = '/not/real/';
  let atomEnv, commandRegistry, workspace, showFilePatchItem;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
    commandRegistry = atomEnv.commands;
    workspace = atomEnv.workspace;

    showFilePatchItem = sinon.stub(StagingView.prototype, 'showFilePatchItem');
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  describe('staging and unstaging files', function() {
    it('renders staged and unstaged files', async function() {
      const filePatches = [
        {filePath: 'a.txt', status: 'modified'},
        {filePath: 'b.txt', status: 'deleted'},
      ];
      const view = new StagingView({
        workspace,
        commandRegistry,
        workingDirectoryPath,
        unstagedChanges: filePatches,
        stagedChanges: [],
      });
      const {refs} = view;
      function textContentOfChildren(element) {
        return Array.from(element.children).map(child => child.textContent);
      }

      assert.deepEqual(textContentOfChildren(refs.unstagedChanges), ['a.txt', 'b.txt']);
      assert.deepEqual(textContentOfChildren(refs.stagedChanges), []);

      await view.update({unstagedChanges: [filePatches[0]], stagedChanges: [filePatches[1]]});
      assert.deepEqual(textContentOfChildren(refs.unstagedChanges), ['a.txt']);
      assert.deepEqual(textContentOfChildren(refs.stagedChanges), ['b.txt']);
    });

    describe('confirmSelectedItems()', function() {
      it('calls attemptFileStageOperation with the paths to stage/unstage and the staging status', async function() {
        const filePatches = [
          {filePath: 'a.txt', status: 'modified'},
          {filePath: 'b.txt', status: 'deleted'},
        ];
        const attemptFileStageOperation = sinon.spy();
        const view = new StagingView({
          workspace,
          commandRegistry,
          workingDirectoryPath,
          unstagedChanges: filePatches,
          stagedChanges: [],
          attemptFileStageOperation,
        });

        view.mousedownOnItem({button: 0}, filePatches[1]);
        view.mouseup();
        view.confirmSelectedItems();
        assert.isTrue(attemptFileStageOperation.calledWith(['b.txt'], 'unstaged'));

        attemptFileStageOperation.reset();
        await view.update({unstagedChanges: [filePatches[0]], stagedChanges: [filePatches[1]], attemptFileStageOperation});
        view.mousedownOnItem({button: 0}, filePatches[1]);
        view.mouseup();
        view.confirmSelectedItems();
        assert.isTrue(attemptFileStageOperation.calledWith(['b.txt'], 'staged'));
      });
    });
  });

  describe('merge conflicts list', function() {
    it('is visible only when conflicted paths are passed', async function() {
      const view = new StagingView({
        workspace,
        workingDirectoryPath,
        commandRegistry,
        unstagedChanges: [],
        stagedChanges: [],
      });

      assert.isUndefined(view.refs.mergeConflicts);

      const mergeConflicts = [{
        filePath: 'conflicted-path',
        status: {
          file: 'modified',
          ours: 'deleted',
          theirs: 'modified',
        },
      }];
      await view.update({unstagedChanges: [], mergeConflicts, stagedChanges: []});
      assert.isDefined(view.refs.mergeConflicts);
    });

    it('shows "calculating" while calculating the number of conflicts', function() {
      const mergeConflicts = [{
        filePath: 'conflicted-path',
        status: {file: 'modified', ours: 'deleted', theirs: 'modified'},
      }];

      const resolutionProgress = new ResolutionProgress();

      const view = new StagingView({
        workspace,
        workingDirectoryPath,
        commandRegistry,
        unstagedChanges: [],
        stagedChanges: [],
        mergeConflicts,
        resolutionProgress,
      });
      const mergeConflictsElement = view.refs.mergeConflicts;

      const remainingElements = mergeConflictsElement.getElementsByClassName('github-RemainingConflicts');
      assert.lengthOf(remainingElements, 1);
      const remainingElement = remainingElements[0];
      assert.equal(remainingElement.innerHTML, 'calculating');
    });

    it('shows the number of remaining conflicts', function() {
      const mergeConflicts = [{
        filePath: 'conflicted-path',
        status: {file: 'modified', ours: 'deleted', theirs: 'modified'},
      }];

      const resolutionProgress = new ResolutionProgress();
      resolutionProgress.reportMarkerCount(path.join(workingDirectoryPath, 'conflicted-path'), 10);

      const view = new StagingView({
        workspace,
        workingDirectoryPath,
        commandRegistry,
        unstagedChanges: [],
        stagedChanges: [],
        mergeConflicts,
        resolutionProgress,
      });
      const mergeConflictsElement = view.refs.mergeConflicts;

      const remainingElements = mergeConflictsElement.getElementsByClassName('github-RemainingConflicts');
      assert.lengthOf(remainingElements, 1);
      const remainingElement = remainingElements[0];
      assert.equal(remainingElement.innerHTML, '10 conflicts remaining');
    });

    it('shows a checkmark when there are no remaining conflicts', function() {
      const mergeConflicts = [{
        filePath: 'conflicted-path',
        status: {file: 'modified', ours: 'deleted', theirs: 'modified'},
      }];

      const resolutionProgress = new ResolutionProgress();
      resolutionProgress.reportMarkerCount(path.join(workingDirectoryPath, 'conflicted-path'), 0);

      const view = new StagingView({
        workspace,
        workingDirectoryPath,
        commandRegistry,
        unstagedChanges: [],
        stagedChanges: [],
        mergeConflicts,
        resolutionProgress,
      });
      const mergeConflictsElement = view.refs.mergeConflicts;

      assert.lengthOf(mergeConflictsElement.getElementsByClassName('icon-check'), 1);
    });

    it('disables the "stage all" button while there are unresolved conflicts', function() {
      const mergeConflicts = [
        {
          filePath: 'conflicted-path-0.txt',
          status: {file: 'modified', ours: 'deleted', theirs: 'modified'},
        },
        {
          filePath: 'conflicted-path-1.txt',
          status: {file: 'modified', ours: 'modified', theirs: 'modified'},
        },
      ];

      const resolutionProgress = new ResolutionProgress();
      resolutionProgress.reportMarkerCount(path.join(workingDirectoryPath, 'conflicted-path-0.txt'), 2);
      resolutionProgress.reportMarkerCount(path.join(workingDirectoryPath, 'conflicted-path-1.txt'), 0);

      const view = new StagingView({
        workspace,
        workingDirectoryPath,
        commandRegistry,
        unstagedChanges: [],
        stagedChanges: [],
        mergeConflicts,
        isMerging: true,
        resolutionProgress,
      });

      const conflictHeader = view.element.getElementsByClassName('github-MergeConflictPaths')[0];
      const conflictButtons = conflictHeader.getElementsByClassName('github-StagingView-headerButton');
      assert.lengthOf(conflictButtons, 1);
      const stageAllButton = Array.from(conflictButtons).find(element => element.innerHTML === 'Stage All');
      assert.isDefined(stageAllButton);
      assert.isTrue(stageAllButton.hasAttribute('disabled'));
    });

    it('enables the "stage all" button when all conflicts are resolved', function() {
      const mergeConflicts = [{
        filePath: 'conflicted-path',
        status: {file: 'modified', ours: 'deleted', theirs: 'modified'},
      }];

      const resolutionProgress = new ResolutionProgress();
      resolutionProgress.reportMarkerCount(path.join(workingDirectoryPath, 'conflicted-path'), 0);

      const view = new StagingView({
        workspace,
        workingDirectoryPath,
        commandRegistry,
        unstagedChanges: [],
        stagedChanges: [],
        mergeConflicts,
        isMerging: true,
        resolutionProgress,
      });

      const conflictHeader = view.element.getElementsByClassName('github-MergeConflictPaths')[0];
      const conflictButtons = conflictHeader.getElementsByClassName('github-StagingView-headerButton');
      assert.lengthOf(conflictButtons, 1);
      const stageAllButton = Array.from(conflictButtons).find(element => element.innerHTML === 'Stage All');
      assert.isDefined(stageAllButton);
      assert.isFalse(stageAllButton.hasAttribute('disabled'));
    });
  });

  describe('when the selection changes', function() {
    describe('when github.keyboardNavigationDelay is 0', function() {
      beforeEach(function() {
        atom.config.set('github.keyboardNavigationDelay', 0);
      });

      it('synchronously notifies the parent component via the appropriate callback', async function() {
        const filePatches = [
          {filePath: 'a.txt', status: 'modified'},
          {filePath: 'b.txt', status: 'deleted'},
        ];
        const mergeConflicts = [{
          filePath: 'conflicted-path',
          status: {
            file: 'modified',
            ours: 'deleted',
            theirs: 'modified',
          },
        }];

        const didSelectMergeConflictFile = sinon.spy();

        const view = new StagingView({
          workspace, workingDirectoryPath, commandRegistry, didSelectMergeConflictFile,
          unstagedChanges: filePatches, mergeConflicts, stagedChanges: [],
        });
        document.body.appendChild(view.element);

        sinon.stub(view, 'pendingFilePatchItemPresent').returns(true);
        await view.selectNext();
        assert.isTrue(showFilePatchItem.calledWith(filePatches[1].filePath));
        await view.selectNext();
        assert.isTrue(didSelectMergeConflictFile.calledWith(mergeConflicts[0].filePath));

        document.body.focus();
        showFilePatchItem.reset();
        didSelectMergeConflictFile.reset();
        await view.selectNext();
        assert.equal(didSelectMergeConflictFile.callCount, 1);

        view.element.remove();
      });
    });

    describe('when github.keyboardNavigationDelay is greater than 0', function() {
      beforeEach(function() {
        atom.config.set('github.keyboardNavigationDelay', 50);
      });

      it('asynchronously notifies the parent component via the appropriate callback', async function() {
        const filePatches = [
          {filePath: 'a.txt', status: 'modified'},
          {filePath: 'b.txt', status: 'deleted'},
        ];
        const mergeConflicts = [{
          filePath: 'conflicted-path',
          status: {
            file: 'modified',
            ours: 'deleted',
            theirs: 'modified',
          },
        }];

        const didSelectMergeConflictFile = sinon.spy();

        const view = new StagingView({
          workspace, workingDirectoryPath, commandRegistry,
          didSelectMergeConflictFile,
          unstagedChanges: filePatches, mergeConflicts, stagedChanges: [],
        });
        document.body.appendChild(view.element);

        sinon.stub(view, 'pendingFilePatchItemPresent').returns(true);

        await view.selectNext();
        assert.isFalse(showFilePatchItem.calledWith(filePatches[1].filePath));
        await assert.async.isTrue(showFilePatchItem.calledWith(filePatches[1].filePath));
        await view.selectNext();
        assert.isFalse(didSelectMergeConflictFile.calledWith(mergeConflicts[0].filePath));
        await assert.async.isTrue(didSelectMergeConflictFile.calledWith(mergeConflicts[0].filePath));

        document.body.focus();
        showFilePatchItem.reset();
        didSelectMergeConflictFile.reset();
        await view.selectNext();
        await assert.async.isTrue(didSelectMergeConflictFile.callCount === 1);

        view.element.remove();
      });
    });

    it('autoscroll to the selected item if it is out of view', async function() {
      const unstagedChanges = [
        {filePath: 'a.txt', status: 'modified'},
        {filePath: 'b.txt', status: 'modified'},
        {filePath: 'c.txt', status: 'modified'},
        {filePath: 'd.txt', status: 'modified'},
        {filePath: 'e.txt', status: 'modified'},
        {filePath: 'f.txt', status: 'modified'},
      ];
      const view = new StagingView({
        workspace, workingDirectoryPath, commandRegistry,
        unstagedChanges, stagedChanges: [],
      });

      // Actually loading the style sheet is complicated and prone to timing
      // issues, so this applies some minimal styling to allow the unstaged
      // changes list to scroll.
      document.body.appendChild(view.element);
      view.refs.unstagedChanges.style.flex = 'inherit';
      view.refs.unstagedChanges.style.overflow = 'scroll';
      view.refs.unstagedChanges.style.height = '50px';

      assert.equal(view.refs.unstagedChanges.scrollTop, 0);

      await view.selectNext();
      await view.selectNext();
      await view.selectNext();
      await view.selectNext();

      assert.isAbove(view.refs.unstagedChanges.scrollTop, 0);

      view.element.remove();
    });
  });

  describe('when dragging a mouse across multiple items', function() {
    // https://github.com/atom/github/issues/352
    it('selects the items', async function() {
      const unstagedChanges = [
        {filePath: 'a.txt', status: 'modified'},
        {filePath: 'b.txt', status: 'modified'},
        {filePath: 'c.txt', status: 'modified'},
      ];
      const view = new StagingView({
        workspace, workingDirectoryPath, commandRegistry,
        unstagedChanges, stagedChanges: [],
      });

      document.body.appendChild(view.element);
      await view.mousedownOnItem({button: 0}, unstagedChanges[0]);
      await view.mousemoveOnItem({}, unstagedChanges[0]);
      await view.mousemoveOnItem({}, unstagedChanges[1]);
      view.mouseup();
      assertEqualSets(view.selection.getSelectedItems(), new Set(unstagedChanges.slice(0, 2)));
      assert.equal(showFilePatchItem.callCount, 0);
      view.element.remove();
    });
  });

  describe('when advancing and retreating activation', function() {
    let view, stagedChanges;

    beforeEach(function() {
      const unstagedChanges = [
        {filePath: 'unstaged-1.txt', status: 'modified'},
        {filePath: 'unstaged-2.txt', status: 'modified'},
        {filePath: 'unstaged-3.txt', status: 'modified'},
      ];
      const mergeConflicts = [
        {filePath: 'conflict-1.txt', status: {file: 'modified', ours: 'deleted', theirs: 'modified'}},
        {filePath: 'conflict-2.txt', status: {file: 'modified', ours: 'added', theirs: 'modified'}},
      ];
      stagedChanges = [
        {filePath: 'staged-1.txt', status: 'staged'},
        {filePath: 'staged-2.txt', status: 'staged'},
      ];
      view = new StagingView({
        workspace, workingDirectoryPath, commandRegistry,
        unstagedChanges, stagedChanges, mergeConflicts,
      });
    });

    const assertSelected = expected => {
      const actual = Array.from(view.selection.getSelectedItems()).map(item => item.filePath);
      assert.deepEqual(actual, expected);
    };

    it("selects the next list, retaining that list's selection", () => {
      assert.isTrue(view.activateNextList());
      assertSelected(['conflict-1.txt']);

      assert.isTrue(view.activateNextList());
      assertSelected(['staged-1.txt']);

      assert.isFalse(view.activateNextList());
      assertSelected(['staged-1.txt']);
    });

    it("selects the previous list, retaining that list's selection", () => {
      view.mousedownOnItem({button: 0}, stagedChanges[1]);
      view.mouseup();
      assertSelected(['staged-2.txt']);

      assert.isTrue(view.activatePreviousList());
      assertSelected(['conflict-1.txt']);

      assert.isTrue(view.activatePreviousList());
      assertSelected(['unstaged-1.txt']);

      assert.isFalse(view.activatePreviousList());
      assertSelected(['unstaged-1.txt']);
    });

    it('selects the first item of the final list', function() {
      assertSelected(['unstaged-1.txt']);

      assert.isTrue(view.activateLastList());
      assertSelected(['staged-1.txt']);
    });
  });

  describe('when navigating with core:move-left', function() {
    let view, didDiveIntoFilePath, didDiveIntoMergeConflictPath;

    beforeEach(function() {
      const unstagedChanges = [
        {filePath: 'unstaged-1.txt', status: 'modified'},
        {filePath: 'unstaged-2.txt', status: 'modified'},
      ];
      const mergeConflicts = [
        {filePath: 'conflict-1.txt', status: {file: 'modified', ours: 'modified', theirs: 'modified'}},
        {filePath: 'conflict-2.txt', status: {file: 'modified', ours: 'modified', theirs: 'modified'}},
      ];

      didDiveIntoFilePath = sinon.spy();
      didDiveIntoMergeConflictPath = sinon.spy();

      view = new StagingView({
        workspace, commandRegistry, workingDirectoryPath,
        didDiveIntoMergeConflictPath,
        unstagedChanges, stagedChanges: [], mergeConflicts,
      });
    });

    it('invokes a callback with a single file selection', async function() {
      await view.selectFirst();

      commandRegistry.dispatch(view.element, 'core:move-left');

      assert.isTrue(showFilePatchItem.calledWith('unstaged-1.txt'), 'Callback invoked with unstaged-1.txt');
    });

    it('invokes a callback with a single merge conflict selection', async function() {
      await view.activateNextList();
      await view.selectFirst();

      commandRegistry.dispatch(view.element, 'core:move-left');

      assert.isTrue(didDiveIntoMergeConflictPath.calledWith('conflict-1.txt'), 'Callback invoked with conflict-1.txt');
    });

    it('does nothing with multiple files selections', async function() {
      await view.selectAll();

      commandRegistry.dispatch(view.element, 'core:move-left');

      assert.equal(didDiveIntoFilePath.callCount, 0);
      assert.equal(didDiveIntoMergeConflictPath.callCount, 0);
    });

    it('does nothing with multiple merge conflict selections', async function() {
      await view.activateNextList();
      await view.selectAll();

      commandRegistry.dispatch(view.element, 'core:move-left');

      assert.equal(didDiveIntoFilePath.callCount, 0);
      assert.equal(didDiveIntoMergeConflictPath.callCount, 0);
    });
  });

  // https://github.com/atom/github/issues/468
  it('updates selection on mousedown', async () => {
    const unstagedChanges = [
      {filePath: 'a.txt', status: 'modified'},
      {filePath: 'b.txt', status: 'modified'},
      {filePath: 'c.txt', status: 'modified'},
    ];
    const view = new StagingView({
      workspace, workingDirectoryPath, commandRegistry, unstagedChanges, stagedChanges: [],
    });

    document.body.appendChild(view.element);
    await view.mousedownOnItem({button: 0}, unstagedChanges[0]);
    view.mouseup();
    assertEqualSets(view.selection.getSelectedItems(), new Set([unstagedChanges[0]]));

    await view.mousedownOnItem({button: 0}, unstagedChanges[2]);
    assertEqualSets(view.selection.getSelectedItems(), new Set([unstagedChanges[2]]));
    view.element.remove();
  });

  if (process.platform !== 'win32') {
    // https://github.com/atom/github/issues/514
    describe('mousedownOnItem', () => {
      it('does not select item or set selection to be in progress if ctrl-key is pressed and not on windows', async () => {
        const unstagedChanges = [
          {filePath: 'a.txt', status: 'modified'},
          {filePath: 'b.txt', status: 'modified'},
          {filePath: 'c.txt', status: 'modified'},
        ];
        const view = new StagingView({workspace, commandRegistry, unstagedChanges, stagedChanges: []});

        sinon.spy(view.selection, 'addOrSubtractSelection');
        sinon.spy(view.selection, 'selectItem');

        document.body.appendChild(view.element);
        await view.mousedownOnItem({button: 0, ctrlKey: true}, unstagedChanges[0]);
        assert.isFalse(view.selection.addOrSubtractSelection.called);
        assert.isFalse(view.selection.selectItem.called);
        assert.isFalse(view.mouseSelectionInProgress);
        view.element.remove();
      });
    });
  }
});
