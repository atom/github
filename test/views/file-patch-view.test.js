import React from 'react';
import {shallow, mount} from 'enzyme';

import {cloneRepository, buildRepository} from '../helpers';
import FilePatchView from '../../lib/views/file-patch-view';
import {buildFilePatch} from '../../lib/models/patch';
import {nullFile} from '../../lib/models/patch/file';
import {nullFilePatch} from '../../lib/models/patch/file-patch';

describe('FilePatchView', function() {
  let atomEnv, repository, filePatch;

  beforeEach(async function() {
    atomEnv = global.buildAtomEnvironment();

    const workdirPath = await cloneRepository();
    repository = await buildRepository(workdirPath);

    // a.txt: unstaged changes
    filePatch = buildFilePatch([{
      oldPath: 'path.txt',
      oldMode: '100644',
      newPath: 'path.txt',
      newMode: '100644',
      status: 'modified',
      hunks: [
        {
          oldStartLine: 5, oldLineCount: 3, newStartLine: 5, newLineCount: 3,
          heading: 'heading',
          lines: [' 0000', '+0001', '-0002', ' 0003'],
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
      selectedRows: new Set(),
      repository,

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
      const markers = layer.find('Marker').map(marker => marker.prop('bufferRange').serialize());
      assert.deepEqual(markers, [
        [[1, 0], [2, 3]],
        [[4, 0], [5, 3]],
        [[12, 0], [14, 3]],
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
        [[3, 0], [3, 3]],
        [[8, 0], [10, 3]],
        [[15, 0], [15, 3]],
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
        [[17, 0], [17, 25]],
      ]);
    });
  });

  it('notifies a callback when the editor selection changes', function() {
    const selectedRowsChanged = sinon.spy();
    const wrapper = mount(buildApp({selectedRowsChanged}));
    const editor = wrapper.find('atom-text-editor').getDOMNode().getModel();

    selectedRowsChanged.resetHistory();

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
    it('toggles the current selection', function() {
      const toggleRows = sinon.spy();
      const wrapper = mount(buildApp({toggleRows}));

      atomEnv.commands.dispatch(wrapper.getDOMNode(), 'core:confirm');

      assert.isTrue(toggleRows.called);
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
              lines: [' 0000', '+0001', ' 0002'],
            },
            {
              oldStartLine: 10, oldLineCount: 6, newStartLine: 11, newLineCount: 3,
              heading: 'second hunk',
              lines: [' 0003', '-0004', ' 0005', '-0006', '-0007', ' 0008'],
            },
          ],
        }]);
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
