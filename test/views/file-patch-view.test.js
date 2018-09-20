import React from 'react';
import {shallow, mount} from 'enzyme';

import {cloneRepository, buildRepository} from '../helpers';
import FilePatchView from '../../lib/views/file-patch-view';
import {buildFilePatch} from '../../lib/models/patch';
import {nullFile} from '../../lib/models/patch/file';
import FilePatch from '../../lib/models/patch/file-patch';

describe('FilePatchView', function() {
  let atomEnv, workspace, repository, filePatch;

  beforeEach(async function() {
    atomEnv = global.buildAtomEnvironment();
    workspace = atomEnv.workspace;

    const workdirPath = await cloneRepository();
    repository = await buildRepository(workdirPath);

    // path.txt: unstaged changes
    filePatch = buildFilePatch([{
      oldPath: 'path.txt',
      oldMode: '100644',
      newPath: 'path.txt',
      newMode: '100644',
      status: 'modified',
      hunks: [
        {
          oldStartLine: 4, oldLineCount: 3, newStartLine: 4, newLineCount: 4,
          heading: 'zero',
          lines: [' 0000', '+0001', '+0002', '-0003', ' 0004'],
        },
        {
          oldStartLine: 8, oldLineCount: 3, newStartLine: 9, newLineCount: 3,
          heading: 'one',
          lines: [' 0005', '+0006', '-0007', ' 0008'],
        },
      ],
    }]);
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function buildApp(overrideProps = {}) {
    const props = {
      relPath: 'path.txt',
      stagingStatus: 'unstaged',
      isPartiallyStaged: false,
      filePatch,
      selectionMode: 'line',
      selectedRows: new Set(),
      repository,

      workspace,
      commands: atomEnv.commands,
      tooltips: atomEnv.tooltips,

      selectedRowsChanged: () => {},

      diveIntoMirrorPatch: () => {},
      openFile: () => {},
      toggleFile: () => {},
      toggleRows: () => {},
      toggleModeChange: () => {},
      toggleSymlinkChange: () => {},
      undoLastDiscard: () => {},
      discardRows: () => {},

      ...overrideProps,
    };

    return <FilePatchView {...props} />;
  }

  it('renders the file header', function() {
    const wrapper = shallow(buildApp());
    assert.isTrue(wrapper.find('FilePatchHeaderView').exists());
  });

  it('renders the file patch within an editor', function() {
    const wrapper = mount(buildApp());

    const editor = wrapper.find('AtomTextEditor');
    assert.strictEqual(editor.instance().getModel().getText(), filePatch.getBuffer().getText());
  });

  it('preserves the selection index when a new file patch arrives in line selection mode', function() {
    const selectedRowsChanged = sinon.spy();
    const wrapper = mount(buildApp({
      selectedRows: new Set([2]),
      selectionMode: 'line',
      selectedRowsChanged,
    }));

    const nextPatch = buildFilePatch([{
      oldPath: 'path.txt',
      oldMode: '100644',
      newPath: 'path.txt',
      newMode: '100644',
      status: 'modified',
      hunks: [
        {
          oldStartLine: 5, oldLineCount: 4, newStartLine: 5, newLineCount: 3,
          heading: 'heading',
          lines: [' 0000', '+0001', ' 0002', '-0003', ' 0004'],
        },
      ],
    }]);

    wrapper.setProps({filePatch: nextPatch});
    assert.sameMembers(Array.from(selectedRowsChanged.lastCall.args[0]), [3]);
    assert.strictEqual(selectedRowsChanged.lastCall.args[1], 'line');

    const editor = wrapper.find('AtomTextEditor').instance().getModel();
    assert.deepEqual(editor.getSelectedBufferRanges().map(r => r.serialize()), [
      [[3, 0], [3, 4]],
    ]);

    selectedRowsChanged.resetHistory();
    wrapper.setProps({isPartiallyStaged: true});
    assert.isFalse(selectedRowsChanged.called);
  });

  it('selects the next full hunk when a new file patch arrives in hunk selection mode', function() {
    const multiHunkPatch = buildFilePatch([{
      oldPath: 'path.txt',
      oldMode: '100644',
      newPath: 'path.txt',
      newMode: '100644',
      status: 'modified',
      hunks: [
        {
          oldStartLine: 10, oldLineCount: 4, newStartLine: 10, newLineCount: 4,
          heading: '0',
          lines: [' 0000', '+0001', ' 0002', '-0003', ' 0004'],
        },
        {
          oldStartLine: 20, oldLineCount: 3, newStartLine: 20, newLineCount: 4,
          heading: '1',
          lines: [' 0005', '+0006', '+0007', '-0008', ' 0009'],
        },
        {
          oldStartLine: 30, oldLineCount: 3, newStartLine: 31, newLineCount: 3,
          heading: '2',
          lines: [' 0010', '+0011', '-0012', ' 0013'],
        },
        {
          oldStartLine: 40, oldLineCount: 4, newStartLine: 41, newLineCount: 4,
          heading: '3',
          lines: [' 0014', '-0015', ' 0016', '+0017', ' 0018'],
        },
      ],
    }]);

    const selectedRowsChanged = sinon.spy();
    const wrapper = mount(buildApp({
      filePatch: multiHunkPatch,
      selectedRows: new Set([6, 7, 8]),
      selectionMode: 'hunk',
      selectedRowsChanged,
    }));

    const nextPatch = buildFilePatch([{
      oldPath: 'path.txt',
      oldMode: '100644',
      newPath: 'path.txt',
      newMode: '100644',
      status: 'modified',
      hunks: [
        {
          oldStartLine: 10, oldLineCount: 4, newStartLine: 10, newLineCount: 4,
          heading: '0',
          lines: [' 0000', '+0001', ' 0002', '-0003', ' 0004'],
        },
        {
          oldStartLine: 30, oldLineCount: 3, newStartLine: 30, newLineCount: 3,
          heading: '2',
          //       5         6        7        8
          lines: [' 0010', '+0011', '-0012', ' 0013'],
        },
        {
          oldStartLine: 40, oldLineCount: 4, newStartLine: 40, newLineCount: 4,
          heading: '3',
          lines: [' 0014', '-0015', ' 0016', '+0017', ' 0018'],
        },
      ],
    }]);

    wrapper.setProps({filePatch: nextPatch});

    assert.sameMembers(Array.from(selectedRowsChanged.lastCall.args[0]), [6, 7]);
    assert.strictEqual(selectedRowsChanged.lastCall.args[1], 'hunk');
    const editor = wrapper.find('AtomTextEditor').instance().getModel();
    assert.deepEqual(editor.getSelectedBufferRanges().map(r => r.serialize()), [
      [[5, 0], [8, 4]],
    ]);
  });

  it('unregisters the mouseup handler on unmount', function() {
    sinon.spy(window, 'addEventListener');
    sinon.spy(window, 'removeEventListener');

    const wrapper = shallow(buildApp());
    assert.strictEqual(window.addEventListener.callCount, 1);
    const addCall = window.addEventListener.getCall(0);
    assert.strictEqual(addCall.args[0], 'mouseup');
    const handler = window.addEventListener.getCall(0).args[1];

    wrapper.unmount();

    assert.isTrue(window.removeEventListener.calledWith('mouseup', handler));
  });

  describe('executable mode changes', function() {
    it('does not render if the mode has not changed', function() {
      const fp = filePatch.clone({
        oldFile: filePatch.getOldFile().clone({mode: '100644'}),
        newFile: filePatch.getNewFile().clone({mode: '100644'}),
      });

      const wrapper = shallow(buildApp({filePatch: fp}));
      assert.isFalse(wrapper.find('FilePatchMetaView[title="Mode change"]').exists());
    });

    it('renders change details within a meta container', function() {
      const fp = filePatch.clone({
        oldFile: filePatch.getOldFile().clone({mode: '100644'}),
        newFile: filePatch.getNewFile().clone({mode: '100755'}),
      });

      const wrapper = mount(buildApp({filePatch: fp, stagingStatus: 'unstaged'}));

      const meta = wrapper.find('FilePatchMetaView[title="Mode change"]');
      assert.strictEqual(meta.prop('actionIcon'), 'icon-move-down');
      assert.strictEqual(meta.prop('actionText'), 'Stage Mode Change');

      const details = meta.find('.github-FilePatchView-metaDetails');
      assert.strictEqual(details.text(), 'File changed modefrom non executable 100644to executable 100755');
    });

    it("stages or unstages the mode change when the meta container's action is triggered", function() {
      const fp = filePatch.clone({
        oldFile: filePatch.getOldFile().clone({mode: '100644'}),
        newFile: filePatch.getNewFile().clone({mode: '100755'}),
      });

      const toggleModeChange = sinon.stub();
      const wrapper = shallow(buildApp({filePatch: fp, stagingStatus: 'staged', toggleModeChange}));

      const meta = wrapper.find('FilePatchMetaView[title="Mode change"]');
      assert.isTrue(meta.exists());
      assert.strictEqual(meta.prop('actionIcon'), 'icon-move-up');
      assert.strictEqual(meta.prop('actionText'), 'Unstage Mode Change');

      meta.prop('action')();
      assert.isTrue(toggleModeChange.called);
    });
  });

  describe('symlink changes', function() {
    it('does not render if the symlink status is unchanged', function() {
      const fp = filePatch.clone({
        oldFile: filePatch.getOldFile().clone({mode: '100644'}),
        newFile: filePatch.getNewFile().clone({mode: '100755'}),
      });

      const wrapper = mount(buildApp({filePatch: fp}));
      assert.lengthOf(wrapper.find('FilePatchMetaView').filterWhere(v => v.prop('title').startsWith('Symlink')), 0);
    });

    it('renders symlink change information within a meta container', function() {
      const fp = filePatch.clone({
        oldFile: filePatch.getOldFile().clone({mode: '120000', symlink: '/old.txt'}),
        newFile: filePatch.getNewFile().clone({mode: '120000', symlink: '/new.txt'}),
      });

      const wrapper = mount(buildApp({filePatch: fp, stagingStatus: 'unstaged'}));
      const meta = wrapper.find('FilePatchMetaView[title="Symlink changed"]');
      assert.isTrue(meta.exists());
      assert.strictEqual(meta.prop('actionIcon'), 'icon-move-down');
      assert.strictEqual(meta.prop('actionText'), 'Stage Symlink Change');
      assert.strictEqual(
        meta.find('.github-FilePatchView-metaDetails').text(),
        'Symlink changedfrom /old.txtto /new.txt.',
      );
    });

    it('stages or unstages the symlink change', function() {
      const toggleSymlinkChange = sinon.stub();
      const fp = filePatch.clone({
        oldFile: filePatch.getOldFile().clone({mode: '120000', symlink: '/old.txt'}),
        newFile: filePatch.getNewFile().clone({mode: '120000', symlink: '/new.txt'}),
      });

      const wrapper = mount(buildApp({filePatch: fp, stagingStatus: 'staged', toggleSymlinkChange}));
      const meta = wrapper.find('FilePatchMetaView[title="Symlink changed"]');
      assert.isTrue(meta.exists());
      assert.strictEqual(meta.prop('actionIcon'), 'icon-move-up');
      assert.strictEqual(meta.prop('actionText'), 'Unstage Symlink Change');

      meta.find('button.icon-move-up').simulate('click');
      assert.isTrue(toggleSymlinkChange.called);
    });

    it('renders details for a symlink deletion', function() {
      const fp = filePatch.clone({
        oldFile: filePatch.getOldFile().clone({mode: '120000', symlink: '/old.txt'}),
        newFile: nullFile,
      });

      const wrapper = mount(buildApp({filePatch: fp}));
      const meta = wrapper.find('FilePatchMetaView[title="Symlink deleted"]');
      assert.isTrue(meta.exists());
      assert.strictEqual(
        meta.find('.github-FilePatchView-metaDetails').text(),
        'Symlinkto /old.txtdeleted.',
      );
    });

    it('renders details for a symlink creation', function() {
      const fp = filePatch.clone({
        oldFile: nullFile,
        newFile: filePatch.getOldFile().clone({mode: '120000', symlink: '/new.txt'}),
      });

      const wrapper = mount(buildApp({filePatch: fp}));
      const meta = wrapper.find('FilePatchMetaView[title="Symlink created"]');
      assert.isTrue(meta.exists());
      assert.strictEqual(
        meta.find('.github-FilePatchView-metaDetails').text(),
        'Symlinkto /new.txtcreated.',
      );
    });
  });

  describe('hunk headers', function() {
    it('renders one for each hunk', function() {
      const fp = buildFilePatch([{
        oldPath: 'path.txt',
        oldMode: '100644',
        newPath: 'path.txt',
        newMode: '100644',
        status: 'modified',
        hunks: [
          {
            oldStartLine: 1, oldLineCount: 2, newStartLine: 1, newLineCount: 3,
            heading: 'first hunk',
            lines: [' 0000', '+0001', ' 0002'],
          },
          {
            oldStartLine: 10, oldLineCount: 3, newStartLine: 11, newLineCount: 2,
            heading: 'second hunk',
            lines: [' 0003', '-0004', ' 0005'],
          },
        ],
      }]);
      const hunks = fp.getHunks();

      const wrapper = mount(buildApp({filePatch: fp}));
      assert.isTrue(wrapper.find('HunkHeaderView').someWhere(h => h.prop('hunk') === hunks[0]));
      assert.isTrue(wrapper.find('HunkHeaderView').someWhere(h => h.prop('hunk') === hunks[1]));
    });

    it('pluralizes the toggle and discard button labels', function() {
      const wrapper = shallow(buildApp({selectedRows: new Set([2]), selectionMode: 'line'}));
      assert.strictEqual(wrapper.find('HunkHeaderView').at(0).prop('toggleSelectionLabel'), 'Stage Selection');
      assert.strictEqual(wrapper.find('HunkHeaderView').at(0).prop('discardSelectionLabel'), 'Discard Selection');
      assert.strictEqual(wrapper.find('HunkHeaderView').at(1).prop('toggleSelectionLabel'), 'Stage Hunk');
      assert.strictEqual(wrapper.find('HunkHeaderView').at(1).prop('discardSelectionLabel'), 'Discard Hunk');

      wrapper.setProps({selectedRows: new Set([1, 2, 3]), selectionMode: 'line'});
      assert.strictEqual(wrapper.find('HunkHeaderView').at(0).prop('toggleSelectionLabel'), 'Stage Selections');
      assert.strictEqual(wrapper.find('HunkHeaderView').at(0).prop('discardSelectionLabel'), 'Discard Selections');
      assert.strictEqual(wrapper.find('HunkHeaderView').at(1).prop('toggleSelectionLabel'), 'Stage Hunk');
      assert.strictEqual(wrapper.find('HunkHeaderView').at(1).prop('discardSelectionLabel'), 'Discard Hunk');

      wrapper.setProps({selectedRows: new Set([1, 2, 3]), selectionMode: 'hunk'});
      assert.strictEqual(wrapper.find('HunkHeaderView').at(0).prop('toggleSelectionLabel'), 'Stage Hunk');
      assert.strictEqual(wrapper.find('HunkHeaderView').at(0).prop('discardSelectionLabel'), 'Discard Hunk');
      assert.strictEqual(wrapper.find('HunkHeaderView').at(1).prop('toggleSelectionLabel'), 'Stage Hunk');
      assert.strictEqual(wrapper.find('HunkHeaderView').at(1).prop('discardSelectionLabel'), 'Discard Hunk');

      wrapper.setProps({selectedRows: new Set([1, 2, 3, 6, 7]), selectionMode: 'hunk'});
      assert.strictEqual(wrapper.find('HunkHeaderView').at(0).prop('toggleSelectionLabel'), 'Stage Hunks');
      assert.strictEqual(wrapper.find('HunkHeaderView').at(0).prop('discardSelectionLabel'), 'Discard Hunks');
      assert.strictEqual(wrapper.find('HunkHeaderView').at(1).prop('toggleSelectionLabel'), 'Stage Hunks');
      assert.strictEqual(wrapper.find('HunkHeaderView').at(1).prop('discardSelectionLabel'), 'Discard Hunks');
    });

    it('uses the appropriate staging action verb in hunk header button labels', function() {
      const wrapper = shallow(buildApp({
        selectedRows: new Set([2]),
        stagingStatus: 'unstaged',
        selectionMode: 'line',
      }));
      assert.strictEqual(wrapper.find('HunkHeaderView').at(0).prop('toggleSelectionLabel'), 'Stage Selection');
      assert.strictEqual(wrapper.find('HunkHeaderView').at(1).prop('toggleSelectionLabel'), 'Stage Hunk');

      wrapper.setProps({stagingStatus: 'staged'});
      assert.strictEqual(wrapper.find('HunkHeaderView').at(0).prop('toggleSelectionLabel'), 'Unstage Selection');
      assert.strictEqual(wrapper.find('HunkHeaderView').at(1).prop('toggleSelectionLabel'), 'Unstage Hunk');
    });

    it('uses the appropriate staging action noun in hunk header button labels', function() {
      const wrapper = shallow(buildApp({
        selectedRows: new Set([1, 2, 3]),
        stagingStatus: 'unstaged',
        selectionMode: 'line',
      }));

      assert.strictEqual(wrapper.find('HunkHeaderView').at(0).prop('toggleSelectionLabel'), 'Stage Selections');
      assert.strictEqual(wrapper.find('HunkHeaderView').at(1).prop('toggleSelectionLabel'), 'Stage Hunk');

      wrapper.setProps({selectionMode: 'hunk'});

      assert.strictEqual(wrapper.find('HunkHeaderView').at(0).prop('toggleSelectionLabel'), 'Stage Hunk');
      assert.strictEqual(wrapper.find('HunkHeaderView').at(1).prop('toggleSelectionLabel'), 'Stage Hunk');
    });

    it('handles mousedown as a selection event', function() {
      const fp = buildFilePatch([{
        oldPath: 'path.txt',
        oldMode: '100644',
        newPath: 'path.txt',
        newMode: '100644',
        status: 'modified',
        hunks: [
          {
            oldStartLine: 1, oldLineCount: 2, newStartLine: 1, newLineCount: 3,
            heading: 'first hunk',
            lines: [' 0000', '+0001', ' 0002'],
          },
          {
            oldStartLine: 10, oldLineCount: 3, newStartLine: 11, newLineCount: 2,
            heading: 'second hunk',
            lines: [' 0003', '-0004', ' 0005'],
          },
        ],
      }]);

      const selectedRowsChanged = sinon.spy();
      const wrapper = mount(buildApp({filePatch: fp, selectedRowsChanged, selectionMode: 'line'}));

      wrapper.find('HunkHeaderView').at(1).prop('mouseDown')({button: 0}, fp.getHunks()[1]);

      assert.sameMembers(Array.from(selectedRowsChanged.lastCall.args[0]), [4]);
      assert.strictEqual(selectedRowsChanged.lastCall.args[1], 'hunk');
    });

    it('handles a toggle click on a hunk containing a selection', function() {
      const toggleRows = sinon.spy();
      const wrapper = mount(buildApp({selectedRows: new Set([2]), toggleRows, selectionMode: 'line'}));

      wrapper.find('HunkHeaderView').at(0).prop('toggleSelection')();
      assert.sameMembers(Array.from(toggleRows.lastCall.args[0]), [2]);
      assert.strictEqual(toggleRows.lastCall.args[1], 'line');
    });

    it('handles a toggle click on a hunk not containing a selection', function() {
      const toggleRows = sinon.spy();
      const wrapper = mount(buildApp({selectedRows: new Set([2]), toggleRows, selectionMode: 'line'}));

      wrapper.find('HunkHeaderView').at(1).prop('toggleSelection')();
      assert.sameMembers(Array.from(toggleRows.lastCall.args[0]), [6, 7]);
      assert.strictEqual(toggleRows.lastCall.args[1], 'hunk');
    });

    it('handles a discard click on a hunk containing a selection', function() {
      const discardRows = sinon.spy();
      const wrapper = mount(buildApp({selectedRows: new Set([2]), discardRows, selectionMode: 'line'}));

      wrapper.find('HunkHeaderView').at(0).prop('discardSelection')();
      assert.sameMembers(Array.from(discardRows.lastCall.args[0]), [2]);
      assert.strictEqual(discardRows.lastCall.args[1], 'line');
    });

    it('handles a discard click on a hunk not containing a selection', function() {
      const discardRows = sinon.spy();
      const wrapper = mount(buildApp({selectedRows: new Set([2]), discardRows, selectionMode: 'line'}));

      wrapper.find('HunkHeaderView').at(1).prop('discardSelection')();
      assert.sameMembers(Array.from(discardRows.lastCall.args[0]), [6, 7]);
      assert.strictEqual(discardRows.lastCall.args[1], 'hunk');
    });
  });

  describe('custom gutters', function() {
    let wrapper, instance, editor;

    beforeEach(function() {
      wrapper = mount(buildApp());
      instance = wrapper.instance();
      editor = wrapper.find('AtomTextEditor').instance().getModel();
    });

    it('computes the old line number for a buffer row', function() {
      assert.strictEqual(instance.oldLineNumberLabel({bufferRow: 5, softWrapped: false}), '\u00a08');
      assert.strictEqual(instance.oldLineNumberLabel({bufferRow: 6, softWrapped: false}), '\u00a0\u00a0');
      assert.strictEqual(instance.oldLineNumberLabel({bufferRow: 6, softWrapped: true}), '\u00a0\u00a0');
      assert.strictEqual(instance.oldLineNumberLabel({bufferRow: 7, softWrapped: false}), '\u00a09');
      assert.strictEqual(instance.oldLineNumberLabel({bufferRow: 8, softWrapped: false}), '10');
      assert.strictEqual(instance.oldLineNumberLabel({bufferRow: 8, softWrapped: true}), '\u00a0•');

      assert.strictEqual(instance.oldLineNumberLabel({bufferRow: 999, softWrapped: false}), '\u00a0\u00a0');
    });

    it('computes the new line number for a buffer row', function() {
      assert.strictEqual(instance.newLineNumberLabel({bufferRow: 5, softWrapped: false}), '\u00a09');
      assert.strictEqual(instance.newLineNumberLabel({bufferRow: 6, softWrapped: false}), '10');
      assert.strictEqual(instance.newLineNumberLabel({bufferRow: 6, softWrapped: true}), '\u00a0•');
      assert.strictEqual(instance.newLineNumberLabel({bufferRow: 7, softWrapped: false}), '\u00a0\u00a0');
      assert.strictEqual(instance.newLineNumberLabel({bufferRow: 7, softWrapped: true}), '\u00a0\u00a0');
      assert.strictEqual(instance.newLineNumberLabel({bufferRow: 8, softWrapped: false}), '11');

      assert.strictEqual(instance.newLineNumberLabel({bufferRow: 999, softWrapped: false}), '\u00a0\u00a0');
    });

    it('selects a single line on click', function() {
      instance.didMouseDownOnLineNumber({bufferRow: 2, domEvent: {button: 0}});
      assert.deepEqual(editor.getSelectedBufferRanges().map(r => r.serialize()), [
        [[2, 0], [2, 4]],
      ]);
    });

    it('changes to line selection mode on click', function() {
      const selectedRowsChanged = sinon.spy();
      wrapper.setProps({selectedRowsChanged, selectionMode: 'hunk'});

      instance.didMouseDownOnLineNumber({bufferRow: 2, domEvent: {button: 0}});
      assert.sameMembers(Array.from(selectedRowsChanged.lastCall.args[0]), [2]);
      assert.strictEqual(selectedRowsChanged.lastCall.args[1], 'line');
    });

    it('ignores right clicks', function() {
      instance.didMouseDownOnLineNumber({bufferRow: 2, domEvent: {button: 1}});
      assert.deepEqual(editor.getSelectedBufferRanges().map(r => r.serialize()), [
        [[1, 0], [1, 4]],
      ]);
    });

    if (process.platform !== 'win32') {
      it('ignores ctrl-clicks on non-Windows platforms', function() {
        instance.didMouseDownOnLineNumber({bufferRow: 2, domEvent: {button: 0, ctrlKey: true}});
        assert.deepEqual(editor.getSelectedBufferRanges().map(r => r.serialize()), [
          [[1, 0], [1, 4]],
        ]);
      });
    }

    it('selects a range of lines on click and drag', function() {
      instance.didMouseDownOnLineNumber({bufferRow: 2, domEvent: {button: 0}});
      assert.deepEqual(editor.getSelectedBufferRanges().map(r => r.serialize()), [
        [[2, 0], [2, 4]],
      ]);

      instance.didMouseMoveOnLineNumber({bufferRow: 2, domEvent: {button: 0}});
      assert.deepEqual(editor.getSelectedBufferRanges().map(r => r.serialize()), [
        [[2, 0], [2, 4]],
      ]);

      instance.didMouseMoveOnLineNumber({bufferRow: 3, domEvent: {button: 0}});
      assert.deepEqual(editor.getSelectedBufferRanges().map(r => r.serialize()), [
        [[2, 0], [3, 4]],
      ]);

      instance.didMouseMoveOnLineNumber({bufferRow: 3, domEvent: {button: 0}});
      assert.deepEqual(editor.getSelectedBufferRanges().map(r => r.serialize()), [
        [[2, 0], [3, 4]],
      ]);

      instance.didMouseMoveOnLineNumber({bufferRow: 4, domEvent: {button: 0}});
      assert.deepEqual(editor.getSelectedBufferRanges().map(r => r.serialize()), [
        [[2, 0], [4, 4]],
      ]);

      instance.didMouseUp();
      assert.deepEqual(editor.getSelectedBufferRanges().map(r => r.serialize()), [
        [[2, 0], [4, 4]],
      ]);

      instance.didMouseMoveOnLineNumber({bufferRow: 5, domEvent: {button: 0}});
      // Unchanged after mouse up
      assert.deepEqual(editor.getSelectedBufferRanges().map(r => r.serialize()), [
        [[2, 0], [4, 4]],
      ]);
    });

    describe('shift-click', function() {
      it('selects a range of lines', function() {
        instance.didMouseDownOnLineNumber({bufferRow: 2, domEvent: {button: 0}});
        assert.deepEqual(editor.getSelectedBufferRanges().map(r => r.serialize()), [
          [[2, 0], [2, 4]],
        ]);
        instance.didMouseUp();

        instance.didMouseDownOnLineNumber({bufferRow: 4, domEvent: {shiftKey: true, button: 0}});
        instance.didMouseUp();
        assert.deepEqual(editor.getSelectedBufferRanges().map(r => r.serialize()), [
          [[2, 0], [4, 4]],
        ]);
      });

      it("extends to the range's beginning when the selection is reversed", function() {
        editor.setSelectedBufferRange([[4, 4], [2, 0]], {reversed: true});

        instance.didMouseDownOnLineNumber({bufferRow: 6, domEvent: {shiftKey: true, button: 0}});
        assert.isFalse(editor.getLastSelection().isReversed());
        assert.deepEqual(editor.getLastSelection().getBufferRange().serialize(), [[2, 0], [6, 4]]);
      });

      it('reverses the selection if the extension line is before the existing selection', function() {
        editor.setSelectedBufferRange([[3, 0], [4, 4]]);

        instance.didMouseDownOnLineNumber({bufferRow: 1, domEvent: {shiftKey: true, button: 0}});
        assert.isTrue(editor.getLastSelection().isReversed());
        assert.deepEqual(editor.getLastSelection().getBufferRange().serialize(), [[1, 0], [4, 4]]);
      });
    });

    describe('ctrl- or meta-click', function() {
      beforeEach(function() {
        // Select an initial row range.
        instance.didMouseDownOnLineNumber({bufferRow: 2, domEvent: {button: 0}});
        instance.didMouseDownOnLineNumber({bufferRow: 5, domEvent: {shiftKey: true, button: 0}});
        instance.didMouseUp();
        // [[2, 0], [5, 4]]
      });

      it('deselects a line at the beginning of an existing selection', function() {
        instance.didMouseDownOnLineNumber({bufferRow: 2, domEvent: {metaKey: true, button: 0}});
        assert.deepEqual(editor.getSelectedBufferRanges().map(r => r.serialize()), [
          [[3, 0], [5, 4]],
        ]);
      });

      it('deselects a line within an existing selection', function() {
        instance.didMouseDownOnLineNumber({bufferRow: 3, domEvent: {metaKey: true, button: 0}});
        assert.deepEqual(editor.getSelectedBufferRanges().map(r => r.serialize()), [
          [[2, 0], [2, 4]],
          [[4, 0], [5, 4]],
        ]);
      });

      it('deselects a line at the end of an existing selection', function() {
        instance.didMouseDownOnLineNumber({bufferRow: 5, domEvent: {metaKey: true, button: 0}});
        assert.deepEqual(editor.getSelectedBufferRanges().map(r => r.serialize()), [
          [[2, 0], [4, 4]],
        ]);
      });

      it('selects a line outside of an existing selection', function() {
        instance.didMouseDownOnLineNumber({bufferRow: 8, domEvent: {metaKey: true, button: 0}});
        assert.deepEqual(editor.getSelectedBufferRanges().map(r => r.serialize()), [
          [[2, 0], [5, 4]],
          [[8, 0], [8, 4]],
        ]);
      });

      it('deselects the only line within an existing selection', function() {
        instance.didMouseDownOnLineNumber({bufferRow: 7, domEvent: {metaKey: true, button: 0}});
        instance.didMouseUp();
        assert.deepEqual(editor.getSelectedBufferRanges().map(r => r.serialize()), [
          [[2, 0], [5, 4]],
          [[7, 0], [7, 4]],
        ]);

        instance.didMouseDownOnLineNumber({bufferRow: 7, domEvent: {metaKey: true, button: 0}});
        assert.deepEqual(editor.getSelectedBufferRanges().map(r => r.serialize()), [
          [[2, 0], [5, 4]],
        ]);
      });

      it('cannot deselect the only selection', function() {
        instance.didMouseDownOnLineNumber({bufferRow: 7, domEvent: {button: 0}});
        instance.didMouseUp();
        assert.deepEqual(editor.getSelectedBufferRanges().map(r => r.serialize()), [
          [[7, 0], [7, 4]],
        ]);

        instance.didMouseDownOnLineNumber({bufferRow: 7, domEvent: {metaKey: true, button: 0}});
        assert.deepEqual(editor.getSelectedBufferRanges().map(r => r.serialize()), [
          [[7, 0], [7, 4]],
        ]);
      });

      it('bonus points: understands ranges that do not cleanly align with editor rows', function() {
        instance.handleSelectionEvent({metaKey: true, button: 0}, [[3, 1], [5, 2]]);
        assert.deepEqual(editor.getSelectedBufferRanges().map(r => r.serialize()), [
          [[2, 0], [3, 1]],
          [[5, 2], [5, 4]],
        ]);
      });
    });

    it('does nothing on a click without a buffer row', function() {
      instance.didMouseDownOnLineNumber({bufferRow: NaN, domEvent: {button: 0}});
      assert.deepEqual(editor.getSelectedBufferRanges().map(r => r.serialize()), [
        [[1, 0], [1, 4]],
      ]);

      instance.didMouseDownOnLineNumber({bufferRow: undefined, domEvent: {button: 0}});
      assert.deepEqual(editor.getSelectedBufferRanges().map(r => r.serialize()), [
        [[1, 0], [1, 4]],
      ]);
    });
  });

  describe('hunk lines', function() {
    let linesPatch;

    beforeEach(function() {
      linesPatch = buildFilePatch([{
        oldPath: 'file.txt',
        oldMode: '100644',
        newPath: 'file.txt',
        newMode: '100644',
        status: 'modified',
        hunks: [
          {
            oldStartLine: 1, oldLineCount: 3, newStartLine: 1, newLineCount: 6,
            heading: 'first hunk',
            lines: [' 0000', '+0001', '+0002', '-0003', '+0004', '+0005', ' 0006'],
          },
          {
            oldStartLine: 10, oldLineCount: 0, newStartLine: 13, newLineCount: 0,
            heading: 'second hunk',
            lines: [
              ' 0007', '-0008', '-0009', '-0010', ' 0011', '+0012', '+0013', '+0014', '-0015', ' 0016',
              '\\ No newline at end of file',
            ],
          },
        ],
      }]);
    });

    it('decorates added lines', function() {
      const wrapper = mount(buildApp({filePatch: linesPatch}));

      const decorationSelector = 'Decoration[type="line"][className="github-FilePatchView-line--added"]';
      const decoration = wrapper.find(decorationSelector);
      assert.isTrue(decoration.exists());

      const layer = wrapper.find('MarkerLayer').filterWhere(each => each.find(decorationSelector).exists());
      assert.strictEqual(layer.prop('id'), linesPatch.getAdditionLayer().id);
    });

    it('decorates deleted lines', function() {
      const wrapper = mount(buildApp({filePatch: linesPatch}));

      const decorationSelector = 'Decoration[type="line"][className="github-FilePatchView-line--deleted"]';
      const decoration = wrapper.find(decorationSelector);
      assert.isTrue(decoration.exists());

      const layer = wrapper.find('MarkerLayer').filterWhere(each => each.find(decorationSelector).exists());
      assert.strictEqual(layer.prop('id'), linesPatch.getDeletionLayer().id);
    });

    it('decorates the nonewline line', function() {
      const wrapper = mount(buildApp({filePatch: linesPatch}));

      const decorationSelector = 'Decoration[type="line"][className="github-FilePatchView-line--nonewline"]';
      const decoration = wrapper.find(decorationSelector);
      assert.isTrue(decoration.exists());

      const layer = wrapper.find('MarkerLayer').filterWhere(each => each.find(decorationSelector).exists());
      assert.strictEqual(layer.prop('id'), linesPatch.getNoNewlineLayer().id);
    });
  });

  it('notifies a callback when the editor selection changes', function() {
    const selectedRowsChanged = sinon.spy();
    const wrapper = mount(buildApp({selectedRowsChanged}));
    const editor = wrapper.find('AtomTextEditor').instance().getModel();

    selectedRowsChanged.resetHistory();

    editor.setSelectedBufferRange([[5, 1], [6, 2]]);

    assert.sameMembers(Array.from(selectedRowsChanged.lastCall.args[0]), [6]);
    assert.strictEqual(selectedRowsChanged.lastCall.args[1], 'line');
  });

  describe('when viewing an empty patch', function() {
    it('renders an empty patch message', function() {
      const wrapper = shallow(buildApp({filePatch: FilePatch.createNull()}));
      assert.isTrue(wrapper.find('.github-FilePatchView').hasClass('github-FilePatchView--blank'));
      assert.isTrue(wrapper.find('.github-FilePatchView-message').exists());
    });

    it('shows navigation controls', function() {
      const wrapper = shallow(buildApp({filePatch: FilePatch.createNull()}));
      assert.isTrue(wrapper.find('FilePatchHeaderView').exists());
    });
  });

  describe('registers Atom commands', function() {
    it('toggles the current selection', function() {
      const toggleRows = sinon.spy();
      const wrapper = mount(buildApp({toggleRows}));

      atomEnv.commands.dispatch(wrapper.getDOMNode(), 'core:confirm');

      assert.isTrue(toggleRows.called);
    });

    it('toggles the patch selection mode from line to hunk', function() {
      const selectedRowsChanged = sinon.spy();
      const selectedRows = new Set([2]);
      const wrapper = mount(buildApp({selectedRowsChanged, selectedRows, selectionMode: 'line'}));
      const editor = wrapper.find('AtomTextEditor').instance().getModel();
      editor.setSelectedBufferRanges([[[2, 0], [2, 0]]]);

      selectedRowsChanged.resetHistory();
      atomEnv.commands.dispatch(wrapper.getDOMNode(), 'github:toggle-patch-selection-mode');

      assert.isTrue(selectedRowsChanged.called);
      assert.sameMembers(Array.from(selectedRowsChanged.lastCall.args[0]), [1, 2, 3]);
      assert.strictEqual(selectedRowsChanged.lastCall.args[1], 'hunk');
    });

    it('toggles from line to hunk when no change rows are selected', function() {
      const selectedRowsChanged = sinon.spy();
      const selectedRows = new Set([]);
      const wrapper = mount(buildApp({selectedRowsChanged, selectedRows, selectionMode: 'line'}));
      const editor = wrapper.find('AtomTextEditor').instance().getModel();
      editor.setSelectedBufferRanges([[[5, 0], [5, 2]]]);

      selectedRowsChanged.resetHistory();
      atomEnv.commands.dispatch(wrapper.getDOMNode(), 'github:toggle-patch-selection-mode');

      assert.isTrue(selectedRowsChanged.called);
      assert.sameMembers(Array.from(selectedRowsChanged.lastCall.args[0]), [6, 7]);
      assert.strictEqual(selectedRowsChanged.lastCall.args[1], 'hunk');
    });

    it('toggles the patch selection mode from hunk to line', function() {
      const selectedRowsChanged = sinon.spy();
      const selectedRows = new Set([6, 7]);
      const wrapper = mount(buildApp({selectedRowsChanged, selectedRows, selectionMode: 'hunk'}));
      const editor = wrapper.find('AtomTextEditor').instance().getModel();
      editor.setSelectedBufferRanges([[[5, 0], [8, 4]]]);

      selectedRowsChanged.resetHistory();

      atomEnv.commands.dispatch(wrapper.getDOMNode(), 'github:toggle-patch-selection-mode');

      assert.isTrue(selectedRowsChanged.called);
      assert.sameMembers(Array.from(selectedRowsChanged.lastCall.args[0]), [6]);
      assert.strictEqual(selectedRowsChanged.lastCall.args[1], 'line');
    });

    describe('opening the file', function() {
      let fp;

      beforeEach(function() {
        fp = buildFilePatch([{
          oldPath: 'path.txt',
          oldMode: '100644',
          newPath: 'path.txt',
          newMode: '100644',
          status: 'modified',
          hunks: [
            {
              oldStartLine: 2, oldLineCount: 2, newStartLine: 2, newLineCount: 3,
              heading: 'first hunk',
              //        2        3        4
              lines: [' 0000', '+0001', ' 0002'],
            },
            {
              oldStartLine: 10, oldLineCount: 5, newStartLine: 11, newLineCount: 6,
              heading: 'second hunk',
              //        11       12       13                14       15                16
              lines: [' 0003', '+0004', '+0005', '-0006', ' 0007', '+0008', '-0009', ' 0010'],
            },
          ],
        }]);
      });

      it('opens the file at the current unchanged row', function() {
        const openFile = sinon.spy();
        const wrapper = mount(buildApp({filePatch: fp, openFile}));

        const editor = wrapper.find('AtomTextEditor').instance().getModel();
        editor.setCursorBufferPosition([7, 2]);

        atomEnv.commands.dispatch(wrapper.getDOMNode(), 'github:open-file');

        assert.isTrue(openFile.calledWith([[14, 2]]));
      });

      it('opens the file at a current added row', function() {
        const openFile = sinon.spy();
        const wrapper = mount(buildApp({filePatch: fp, openFile}));

        const editor = wrapper.find('AtomTextEditor').instance().getModel();
        editor.setCursorBufferPosition([8, 3]);

        atomEnv.commands.dispatch(wrapper.getDOMNode(), 'github:open-file');

        assert.isTrue(openFile.calledWith([[15, 3]]));
      });

      it('opens the file at the beginning of the previous added or unchanged row', function() {
        const openFile = sinon.spy();
        const wrapper = mount(buildApp({filePatch: fp, openFile}));

        const editor = wrapper.find('AtomTextEditor').instance().getModel();
        editor.setCursorBufferPosition([9, 2]);

        atomEnv.commands.dispatch(wrapper.getDOMNode(), 'github:open-file');

        assert.isTrue(openFile.calledWith([[15, 0]]));
      });

      it('preserves multiple cursors', function() {
        const openFile = sinon.spy();
        const wrapper = mount(buildApp({filePatch: fp, openFile}));

        const editor = wrapper.find('AtomTextEditor').instance().getModel();
        editor.setCursorBufferPosition([3, 2]);
        editor.addCursorAtBufferPosition([4, 2]);
        editor.addCursorAtBufferPosition([1, 3]);
        editor.addCursorAtBufferPosition([9, 2]);
        editor.addCursorAtBufferPosition([9, 3]);

        // [9, 2] and [9, 3] should be collapsed into a single cursor at [15, 0]

        atomEnv.commands.dispatch(wrapper.getDOMNode(), 'github:open-file');

        assert.isTrue(openFile.calledWith([
          [11, 2],
          [12, 2],
          [3, 3],
          [15, 0],
        ]));
      });
    });
  });
});
