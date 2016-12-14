/** @babel */

import sinon from 'sinon';
import StagingView from '../../lib/views/staging-view';

import {assertEqualSets} from '../helpers';

describe('StagingView', () => {
  let commandRegistry;

  beforeEach(() => {
    const atomEnv = global.buildAtomEnvironment();
    commandRegistry = atomEnv.commands;
  });

  describe('staging and unstaging files', () => {
    it('renders staged and unstaged files', async () => {
      const filePatches = [
        {filePath: 'a.txt', status: 'modified'},
        {filePath: 'b.txt', status: 'deleted'},
      ];
      const view = new StagingView({commandRegistry, unstagedChanges: filePatches, stagedChanges: []});
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

    describe('confirmSelectedItems()', () => {
      it('calls stageFilePatch or unstageFilePatch depending on the current staging state of the toggled file patch', async () => {
        const filePatches = [
          {filePath: 'a.txt', status: 'modified'},
          {filePath: 'b.txt', status: 'deleted'},
        ];
        const stageFiles = sinon.spy();
        const unstageFiles = sinon.spy();
        const view = new StagingView({commandRegistry, unstagedChanges: filePatches, stagedChanges: [], stageFiles, unstageFiles});

        view.mousedownOnItem({detail: 1}, filePatches[1]);
        view.confirmSelectedItems();
        assert.isTrue(stageFiles.calledWith(['b.txt']));

        await view.update({unstagedChanges: [filePatches[0]], stagedChanges: [filePatches[1]], stageFiles, unstageFiles});
        view.mousedownOnItem({detail: 1}, filePatches[1]);
        view.confirmSelectedItems();
        assert.isTrue(unstageFiles.calledWith(['b.txt']));
      });
    });
  });

  describe('merge conflicts list', () => {
    it('is visible only when conflicted paths are passed', async () => {
      const view = new StagingView({commandRegistry, unstagedChanges: [], stagedChanges: []});

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
  });

  describe('when the selection changes', () => {
    describe('when github.keyboardNavigationDelay is 0', () => {
      beforeEach(() => {
        atom.config.set('github.keyboardNavigationDelay', 0);
      });

      it('synchronously notifies the parent component via the appropriate callback', async () => {
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

        const didSelectFilePath = sinon.spy();
        const didSelectMergeConflictFile = sinon.spy();

        const view = new StagingView({
          commandRegistry, didSelectFilePath, didSelectMergeConflictFile,
          unstagedChanges: filePatches, mergeConflicts, stagedChanges: [],
        });
        document.body.appendChild(view.element);
        assert.equal(didSelectFilePath.callCount, 0);

        view.focus();
        await view.selectNext();
        assert.isTrue(didSelectFilePath.calledWith(filePatches[1].filePath));
        await view.selectNext();
        assert.isTrue(didSelectMergeConflictFile.calledWith(mergeConflicts[0].filePath));

        document.body.focus();
        assert.isFalse(view.isFocused());
        didSelectFilePath.reset();
        didSelectMergeConflictFile.reset();
        await view.selectNext();
        assert.equal(didSelectMergeConflictFile.callCount, 0);

        view.element.remove();
      });
    });

    describe('when github.keyboardNavigationDelay is greater than 0', () => {
      beforeEach(() => {
        atom.config.set('github.keyboardNavigationDelay', 50);
      });

      it('asynchronously notifies the parent component via the appropriate callback', async () => {
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

        const didSelectFilePath = sinon.spy();
        const didSelectMergeConflictFile = sinon.spy();

        const view = new StagingView({
          commandRegistry, didSelectFilePath, didSelectMergeConflictFile,
          unstagedChanges: filePatches, mergeConflicts, stagedChanges: [],
        });
        document.body.appendChild(view.element);
        assert.equal(didSelectFilePath.callCount, 0);

        view.focus();
        await view.selectNext();
        assert.isFalse(didSelectFilePath.calledWith(filePatches[1].filePath));
        await new Promise(resolve => setTimeout(resolve, 100));
        assert.isTrue(didSelectFilePath.calledWith(filePatches[1].filePath));
        await view.selectNext();
        assert.isFalse(didSelectMergeConflictFile.calledWith(mergeConflicts[0].filePath));
        await new Promise(resolve => setTimeout(resolve, 100));
        assert.isTrue(didSelectMergeConflictFile.calledWith(mergeConflicts[0].filePath));

        document.body.focus();
        assert.isFalse(view.isFocused());
        didSelectFilePath.reset();
        didSelectMergeConflictFile.reset();
        await view.selectNext();
        await new Promise(resolve => setTimeout(resolve, 100));
        assert.equal(didSelectMergeConflictFile.callCount, 0);

        view.element.remove();
      });
    });

    it('autoscroll to the selected item if it is out of view', async () => {
      const unstagedChanges = [
        {filePath: 'a.txt', status: 'modified'},
        {filePath: 'b.txt', status: 'modified'},
        {filePath: 'c.txt', status: 'modified'},
        {filePath: 'd.txt', status: 'modified'},
        {filePath: 'e.txt', status: 'modified'},
        {filePath: 'f.txt', status: 'modified'},
      ];
      const view = new StagingView({commandRegistry, unstagedChanges, stagedChanges: []});

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

    it('invokes a callback when advanced at the last item', async () => {
      const unstagedChanges = [
        {filePath: 'a.txt', status: 'modified'},
        {filePath: 'b.txt', status: 'deleted'},
      ];
      const mergeConflicts = [
        {filePath: 'conflicted-path', status: {file: 'modified', ours: 'deleted', theirs: 'modified'}},
      ];

      const didSelectPastEnd = sinon.spy();

      const view = new StagingView({commandRegistry, unstagedChanges, mergeConflicts, stagedChanges: [], didSelectPastEnd});

      view.activateLastList();
      await view.selectLast();

      assert.equal(didSelectPastEnd.callCount, 0);

      await view.selectNext();

      assert.equal(didSelectPastEnd.callCount, 1);
    });
  });

  describe('when dragging a mouse across multiple items', () => {
    // https://github.com/atom/github/issues/352
    it('selects the items', async () => {
      const unstagedChanges = [
        {filePath: 'a.txt', status: 'modified'},
        {filePath: 'b.txt', status: 'modified'},
        {filePath: 'c.txt', status: 'modified'},
      ];
      const didSelectFilePath = sinon.stub();
      const view = new StagingView({commandRegistry, unstagedChanges, stagedChanges: [], didSelectFilePath});
      view.isFocused = sinon.stub().returns(true);

      document.body.appendChild(view.element);
      await view.mousedownOnItem({detail: 1}, unstagedChanges[0]);
      await view.mousemoveOnItem({}, unstagedChanges[1]);
      view.mouseup();
      assertEqualSets(view.selection.getSelectedItems(), new Set(unstagedChanges.slice(0, 2)));
      assert.equal(view.props.didSelectFilePath.callCount, 0);
    });
  });

  describe('when advancing and retreating activation', () => {
    let view, stagedChanges;

    beforeEach(() => {
      const unstagedChanges = [
        {filePath: 'unstaged-one.txt', status: 'modified'},
        {filePath: 'unstaged-two.txt', status: 'modified'},
        {filePath: 'unstaged-two.txt', status: 'modified'},
      ];
      const mergeConflicts = [
        {filePath: 'conflict-one.txt', status: {file: 'modified', ours: 'deleted', theirs: 'modified'}},
        {filePath: 'conflict-two.txt', status: {file: 'modified', ours: 'added', theirs: 'modified'}},
      ];
      stagedChanges = [
        {filePath: 'staged-one.txt', status: 'staged'},
        {filePath: 'staged-two.txt', status: 'staged'},
      ];
      view = new StagingView({commandRegistry, unstagedChanges, stagedChanges, mergeConflicts});
    });

    const assertSelected = expected => {
      const actual = Array.from(view.selection.getSelectedItems()).map(item => item.filePath);
      assert.deepEqual(actual, expected);
    };

    it('selects the first item of the next list', () => {
      assert.isTrue(view.activateNextList());
      assertSelected(['conflict-one.txt']);

      assert.isTrue(view.activateNextList());
      assertSelected(['staged-one.txt']);

      assert.isFalse(view.activateNextList());
      assertSelected(['staged-one.txt']);
    });

    it('selects the first item of the previous list', () => {
      view.mousedownOnItem({detail: 1}, stagedChanges[1]);
      view.mouseup();
      assertSelected(['staged-two.txt']);

      assert.isTrue(view.activatePreviousList());
      assertSelected(['conflict-one.txt']);

      assert.isTrue(view.activatePreviousList());
      assertSelected(['unstaged-one.txt']);

      assert.isFalse(view.activatePreviousList());
      assertSelected(['unstaged-one.txt']);
    });

    it('selects the first item of the final list', () => {
      assertSelected(['unstaged-one.txt']);

      assert.isTrue(view.activateLastList());
      assertSelected(['staged-one.txt']);
    });
  });
});
