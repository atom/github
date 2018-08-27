import path from 'path';
import fs from 'fs-extra';
import React from 'react';
import {shallow, mount} from 'enzyme';

import {cloneRepository, buildRepository} from '../helpers';
import FilePatchView from '../../lib/views/file-patch-view';
import FilePatchSelection from '../../lib/models/file-patch-selection';
import {nullFilePatch} from '../../lib/models/patch/file-patch';
import {nullFile} from '../../lib/models/patch/file';
import Hunk from '../../lib/models/patch/hunk';
import {Addition, Deletion, NoNewline} from '../../lib/models/patch/region';
import IndexedRowRange from '../../lib/models/indexed-row-range';

describe('FilePatchView', function() {
  let atomEnv, repository, filePatch;

  beforeEach(async function() {
    atomEnv = global.buildAtomEnvironment();

    const workdirPath = await cloneRepository();
    repository = await buildRepository(workdirPath);

    // a.txt: unstaged changes
    await fs.writeFile(path.join(workdirPath, 'a.txt'), 'zero\none\ntwo\nthree\nfour\n');
    filePatch = await repository.getFilePatchForPath('a.txt', {staged: false});
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function buildApp(overrideProps = {}) {
    const props = {
      relPath: 'a.txt',
      stagingStatus: 'unstaged',
      isPartiallyStaged: false,
      filePatch,
      selection: new FilePatchSelection(filePatch.getHunks()),
      repository,

      commands: atomEnv.commands,
      tooltips: atomEnv.tooltips,

      mouseDownOnHeader: () => {},
      mouseDownOnLineNumber: () => {},
      mouseMoveOnLineNumber: () => {},
      mouseUp: () => {},
      selectedRowsChanged: () => {},

      diveIntoMirrorPatch: () => {},
      openFile: () => {},
      toggleFile: () => {},
      selectAndToggleHunk: () => {},
      toggleLines: () => {},
      toggleModeChange: () => {},
      toggleSymlinkChange: () => {},
      undoLastDiscard: () => {},
      discardLines: () => {},
      selectAndDiscardHunk: () => {},
      selectNextHunk: () => {},
      selectPreviousHunk: () => {},
      togglePatchSelectionMode: () => {},

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
    assert.strictEqual(editor.instance().getModel().getText(), filePatch.getBufferText());
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

  it('renders a header for each hunk', function() {
    const bufferText = '0000\n0001\n0002\n0003\n0004\n0005\n';
    const hunks = [
      new Hunk({
        oldStartRow: 1, oldRowCount: 2, newStartRow: 1, newRowCount: 3,
        sectionHeading: 'first hunk',
        rowRange: new IndexedRowRange({bufferRange: [[0, 0], [2, 0]], startOffset: 0, endOffset: 15}),
        changes: [
          new Addition(new IndexedRowRange({bufferRange: [[1, 0], [1, 0]], startOffset: 5, endOffset: 10})),
        ],
      }),
      new Hunk({
        oldStartRow: 10, oldRowCount: 3, newStartRow: 11, newRowCount: 2,
        sectionHeading: 'second hunk',
        rowRange: new IndexedRowRange({bufferRange: [[3, 0], [5, 0]], startOffset: 15, endOffset: 30}),
        changes: [
          new Deletion(new IndexedRowRange({bufferRange: [[4, 0], [4, 0]], startOffset: 5, endOffset: 10})),
        ],
      }),
    ];
    const fp = filePatch.clone({
      patch: filePatch.getPatch().clone({hunks, bufferText}),
    });
    const wrapper = mount(buildApp({filePatch: fp}));
    assert.isTrue(wrapper.find('HunkHeaderView').someWhere(h => h.prop('hunk') === hunks[0]));
    assert.isTrue(wrapper.find('HunkHeaderView').someWhere(h => h.prop('hunk') === hunks[1]));
  });

  describe('hunk lines', function() {
    let linesPatch;

    beforeEach(function() {
      const bufferText =
        '0000\n0001\n0002\n0003\n0004\n0005\n0006\n0007\n0008\n0009\n' +
        '0010\n0011\n0012\n0013\n0014\n0015\n0016\n' +
        ' No newline at end of file\n';
      const hunks = [
        new Hunk({
          oldStartRow: 1, oldRowCount: 3, newStartRow: 1, newRowCount: 6,
          sectionHeading: 'first hunk',
          rowRange: new IndexedRowRange({bufferRange: [[0, 0], [6, 0]], startOffset: 0, endOffset: 35}),
          changes: [
            new Addition(new IndexedRowRange({bufferRange: [[1, 0], [2, 0]], startOffset: 5, endOffset: 15})),
            new Deletion(new IndexedRowRange({bufferRange: [[3, 0], [3, 0]], startOffset: 15, endOffset: 20})),
            new Addition(new IndexedRowRange({bufferRange: [[4, 0], [5, 0]], startOffset: 20, endOffset: 30})),
          ],
        }),
        new Hunk({
          oldStartRow: 10, oldRowCount: 0, newStartRow: 13, newRowCount: 0,
          sectionHeading: 'second hunk',
          rowRange: new IndexedRowRange({bufferRange: [[7, 0], [17, 0]], startOffset: 35, endOffset: 112}),
          changes: [
            new Deletion(new IndexedRowRange({bufferRange: [[8, 0], [10, 0]], startOffset: 40, endOffset: 55})),
            new Addition(new IndexedRowRange({bufferRange: [[12, 0], [14, 0]], startOffset: 60, endOffset: 75})),
            new Deletion(new IndexedRowRange({bufferRange: [[15, 0], [15, 0]], startOffset: 75, endOffset: 80})),
            new NoNewline(new IndexedRowRange({bufferRange: [[17, 0], [17, 0]], startOffset: 85, endOffset: 112})),
          ],
        }),
      ];

      linesPatch = filePatch.clone({
        patch: filePatch.getPatch().clone({hunks, bufferText}),
      });
    });

    it('decorates added lines', function() {
      const wrapper = mount(buildApp({filePatch: linesPatch}));

      const decorationSelector = 'Decoration[type="line"][className="github-FilePatchView-line--added"]';
      const decoration = wrapper.find(decorationSelector);
      assert.isTrue(decoration.exists());

      const layer = wrapper.find('MarkerLayer').filterWhere(each => each.find(decorationSelector).exists());
      const markers = layer.find('Marker').map(marker => marker.prop('bufferRange').serialize());
      assert.deepEqual(markers, [
        [[1, 0], [2, 0]],
        [[4, 0], [5, 0]],
        [[12, 0], [14, 0]],
      ]);
    });

    it('decorates deleted lines', function() {
      const wrapper = mount(buildApp({filePatch: linesPatch}));

      const decorationSelector = 'Decoration[type="line"][className="github-FilePatchView-line--deleted"]';
      const decoration = wrapper.find(decorationSelector);
      assert.isTrue(decoration.exists());

      const layer = wrapper.find('MarkerLayer').filterWhere(each => each.find(decorationSelector).exists());
      const markers = layer.find('Marker').map(marker => marker.prop('bufferRange').serialize());
      assert.deepEqual(markers, [
        [[3, 0], [3, 0]],
        [[8, 0], [10, 0]],
        [[15, 0], [15, 0]],
      ]);
    });

    it('decorates the nonewline line', function() {
      const wrapper = mount(buildApp({filePatch: linesPatch}));

      const decorationSelector = 'Decoration[type="line"][className="github-FilePatchView-line--nonewline"]';
      const decoration = wrapper.find(decorationSelector);
      assert.isTrue(decoration.exists());

      const layer = wrapper.find('MarkerLayer').filterWhere(each => each.find(decorationSelector).exists());
      const markers = layer.find('Marker').map(marker => marker.prop('bufferRange').serialize());
      assert.deepEqual(markers, [
        [[17, 0], [17, 0]],
      ]);
    });
  });

  it('notifies a callback when the editor selection changes', function() {
    const selectedRowsChanged = sinon.spy();
    const wrapper = mount(buildApp({selectedRowsChanged}));
    const editor = wrapper.find('atom-text-editor').getDOMNode().getModel();

    assert.isFalse(selectedRowsChanged.called);

    editor.addSelectionForBufferRange([[3, 1], [4, 0]]);

    assert.isTrue(selectedRowsChanged.calledWith(new Set([3, 4])));
  });

  describe('when viewing an empty patch', function() {
    it('renders an empty patch message', function() {
      const wrapper = shallow(buildApp({filePatch: nullFilePatch}));
      assert.isTrue(wrapper.find('.github-FilePatchView').hasClass('github-FilePatchView--blank'));
      assert.isTrue(wrapper.find('.github-FilePatchView-message').exists());
    });

    it('shows navigation controls', function() {
      const wrapper = shallow(buildApp({filePatch: nullFilePatch}));
      assert.isTrue(wrapper.find('FilePatchHeaderView').exists());
    });
  });

  describe('registers Atom commands', function() {
    it('toggles the patch selection mode', function() {
      const togglePatchSelectionMode = sinon.spy();
      const wrapper = mount(buildApp({togglePatchSelectionMode}));

      atomEnv.commands.dispatch(wrapper.getDOMNode(), 'github:toggle-patch-selection-mode');

      assert.isTrue(togglePatchSelectionMode.called);
    });

    it('toggles the current selection', function() {
      const toggleLines = sinon.spy();
      const wrapper = mount(buildApp({toggleLines}));

      atomEnv.commands.dispatch(wrapper.getDOMNode(), 'core:confirm');

      assert.isTrue(toggleLines.called);
    });

    it('selects the next hunk', function() {
      const selectNextHunk = sinon.spy();
      const wrapper = mount(buildApp({selectNextHunk}));

      atomEnv.commands.dispatch(wrapper.getDOMNode(), 'github:select-next-hunk');

      assert.isTrue(selectNextHunk.called);
    });

    it('selects the previous hunk', function() {
      const selectPreviousHunk = sinon.spy();
      const wrapper = mount(buildApp({selectPreviousHunk}));

      atomEnv.commands.dispatch(wrapper.getDOMNode(), 'github:select-previous-hunk');

      assert.isTrue(selectPreviousHunk.called);
    });

    describe('opening the file', function() {
      let fp;

      beforeEach(function() {
        const bufferText = '0000\n0001\n0002\n0003\n0004\n0005\n0006\n0007\n0008\n';
        const hunks = [
          new Hunk({
            oldStartRow: 2, oldRowCount: 2, newStartRow: 2, newRowCount: 3,
            sectionHeading: 'first hunk',
            rowRange: new IndexedRowRange({bufferRange: [[0, 0], [2, 0]], startOffset: 0, endOffset: 15}),
            changes: [
              new Addition(new IndexedRowRange({bufferRange: [[1, 0], [1, 0]], startOffset: 5, endOffset: 10})),
            ],
          }),
          new Hunk({
            oldStartRow: 10, oldRowCount: 6, newStartRow: 11, newRowCount: 3,
            sectionHeading: 'second hunk',
            rowRange: new IndexedRowRange({bufferRange: [[3, 0], [8, 0]], startOffset: 15, endOffset: 45}),
            changes: [
              new Deletion(new IndexedRowRange({bufferRange: [[4, 0], [4, 0]], startOffset: 20, endOffset: 25})),
              new Deletion(new IndexedRowRange({bufferRange: [[6, 0], [7, 0]], startOffset: 30, endOffset: 40})),
            ],
          }),
        ];
        fp = filePatch.clone({
          patch: filePatch.getPatch().clone({hunks, bufferText}),
        });
      });

      it('opens the file at the current unchanged row', function() {
        const openFile = sinon.spy();
        const wrapper = mount(buildApp({filePatch: fp, openFile}));

        const editor = wrapper.find('atom-text-editor').getDOMNode().getModel();
        editor.setCursorBufferPosition([3, 2]);

        atomEnv.commands.dispatch(wrapper.getDOMNode(), 'github:open-file');

        assert.isTrue(openFile.calledWith([[11, 2]]));
      });

      it('opens the file at a current added row', function() {
        const openFile = sinon.spy();
        const wrapper = mount(buildApp({filePatch: fp, openFile}));

        const editor = wrapper.find('atom-text-editor').getDOMNode().getModel();
        editor.setCursorBufferPosition([1, 3]);

        atomEnv.commands.dispatch(wrapper.getDOMNode(), 'github:open-file');

        assert.isTrue(openFile.calledWith([[3, 3]]));
      });

      it('opens the file at the beginning of the previous added or unchanged row', function() {
        const openFile = sinon.spy();
        const wrapper = mount(buildApp({filePatch: fp, openFile}));

        const editor = wrapper.find('atom-text-editor').getDOMNode().getModel();
        editor.setCursorBufferPosition([4, 2]);

        atomEnv.commands.dispatch(wrapper.getDOMNode(), 'github:open-file');

        assert.isTrue(openFile.calledWith([[11, 0]]));
      });

      it('preserves multiple cursors', function() {
        const openFile = sinon.spy();
        const wrapper = mount(buildApp({filePatch: fp, openFile}));

        const editor = wrapper.find('atom-text-editor').getDOMNode().getModel();
        editor.setCursorBufferPosition([3, 2]);
        editor.addCursorAtBufferPosition([4, 2]);
        editor.addCursorAtBufferPosition([1, 3]);
        editor.addCursorAtBufferPosition([6, 2]);
        editor.addCursorAtBufferPosition([7, 1]);

        // The cursors at [6, 2] and [7, 1] are both collapsed to a single one on the unchanged line.

        atomEnv.commands.dispatch(wrapper.getDOMNode(), 'github:open-file');

        assert.isTrue(openFile.calledWith([
          [11, 2],
          [11, 0],
          [3, 3],
          [12, 0],
        ]));
      });
    });
  });
});
