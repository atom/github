/** @babel */

import sinon from 'sinon';
import StagingView from '../../lib/views/staging-view';

describe('StagingView', () => {
  describe('staging and unstaging files', () => {
    it('renders staged and unstaged files', async () => {
      const filePatches = [
        {filePath: 'a.txt', status: 'modified'},
        {filePath: 'b.txt', status: 'deleted'},
      ];
      const view = new StagingView({unstagedChanges: filePatches, stagedChanges: []});
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
        const view = new StagingView({unstagedChanges: filePatches, stagedChanges: [], stageFiles, unstageFiles});

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
      const view = new StagingView({unstagedChanges: [], stagedChanges: []});

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
          didSelectFilePath, didSelectMergeConflictFile,
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
          didSelectFilePath, didSelectMergeConflictFile,
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
      const view = new StagingView({unstagedChanges, stagedChanges: []});

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
});
