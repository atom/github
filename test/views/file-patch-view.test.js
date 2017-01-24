import FilePatchView from '../../lib/views/file-patch-view';
import Hunk from '../../lib/models/hunk';
import HunkLine from '../../lib/models/hunk-line';

import {assertEqualSets} from '../helpers';

describe('FilePatchView', function() {
  let atomEnv, commandRegistry;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
    commandRegistry = atomEnv.commands;
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  describe('mouse selection', () => {
    it('allows lines and hunks to be selected via mouse drag', async function() {
      const hunks = [
        new Hunk(1, 1, 2, 4, '', [
          new HunkLine('line-1', 'unchanged', 1, 1),
          new HunkLine('line-2', 'added', -1, 2),
          new HunkLine('line-3', 'added', -1, 3),
          new HunkLine('line-4', 'unchanged', 2, 4),
        ]),
        new Hunk(5, 7, 1, 4, '', [
          new HunkLine('line-5', 'unchanged', 5, 7),
          new HunkLine('line-6', 'added', -1, 8),
          new HunkLine('line-7', 'added', -1, 9),
          new HunkLine('line-8', 'added', -1, 10),
        ]),
      ];
      const hunkViews = new Map();
      function registerHunkView(hunk, view) { hunkViews.set(hunk, view); }

      const filePatchView = new FilePatchView({commandRegistry, hunks, registerHunkView});
      const hunkView0 = hunkViews.get(hunks[0]);
      const hunkView1 = hunkViews.get(hunks[1]);

      // drag a selection
      await hunkView0.props.mousedownOnLine({button: 0, detail: 1}, hunks[0], hunks[0].lines[2]);
      await hunkViews.get(hunks[1]).props.mousemoveOnLine({}, hunks[1], hunks[1].lines[1]);
      await filePatchView.mouseup();
      assert(hunkView0.props.isSelected);
      assert(hunkView0.props.selectedLines.has(hunks[0].lines[2]));
      assert(hunkView1.props.isSelected);
      assert(hunkView1.props.selectedLines.has(hunks[1].lines[1]));

      // start a new selection, drag it across an existing selection
      await hunkView1.props.mousedownOnLine({button: 0, detail: 1, metaKey: true}, hunks[1], hunks[1].lines[3]);
      await hunkView0.props.mousemoveOnLine({}, hunks[0], hunks[0].lines[0]);
      assert(hunkView0.props.isSelected);
      assert(hunkView0.props.selectedLines.has(hunks[0].lines[1]));
      assert(hunkView0.props.selectedLines.has(hunks[0].lines[2]));
      assert(hunkView1.props.isSelected);
      assert(hunkView1.props.selectedLines.has(hunks[1].lines[1]));
      assert(hunkView1.props.selectedLines.has(hunks[1].lines[2]));
      assert(hunkView1.props.selectedLines.has(hunks[1].lines[3]));

      // drag back down without releasing mouse; the other selection remains intact
      await hunkView1.props.mousemoveOnLine({}, hunks[1], hunks[1].lines[3]);
      assert(hunkView0.props.isSelected);
      assert(!hunkView0.props.selectedLines.has(hunks[0].lines[1]));
      assert(hunkView0.props.selectedLines.has(hunks[0].lines[2]));
      assert(hunkView1.props.isSelected);
      assert(hunkView1.props.selectedLines.has(hunks[1].lines[1]));
      assert(!hunkView1.props.selectedLines.has(hunks[1].lines[2]));
      assert(hunkView1.props.selectedLines.has(hunks[1].lines[3]));

      // drag back up so selections are adjacent, then release the mouse. selections should merge.
      await hunkView1.props.mousemoveOnLine({}, hunks[1], hunks[1].lines[2]);
      await filePatchView.mouseup();
      assert(hunkView0.props.isSelected);
      assert(hunkView0.props.selectedLines.has(hunks[0].lines[2]));
      assert(hunkView1.props.isSelected);
      assert(hunkView1.props.selectedLines.has(hunks[1].lines[1]));
      assert(hunkView1.props.selectedLines.has(hunks[1].lines[2]));
      assert(hunkView1.props.selectedLines.has(hunks[1].lines[3]));

      // we detect merged selections based on the head here
      await filePatchView.selectToNext();
      assert(!hunkView0.props.isSelected);
      assert(!hunkView0.props.selectedLines.has(hunks[0].lines[2]));

      // double-clicking clears the existing selection and starts hunk-wise selection
      await hunkView0.props.mousedownOnLine({button: 0, detail: 2}, hunks[0], hunks[0].lines[2]);
      assert(hunkView0.props.isSelected);
      assert(hunkView0.props.selectedLines.has(hunks[0].lines[1]));
      assert(hunkView0.props.selectedLines.has(hunks[0].lines[2]));
      assert(!hunkView1.props.isSelected);

      await hunkView1.props.mousemoveOnLine({}, hunks[1], hunks[1].lines[1]);
      assert(hunkView0.props.isSelected);
      assert(hunkView0.props.selectedLines.has(hunks[0].lines[1]));
      assert(hunkView0.props.selectedLines.has(hunks[0].lines[2]));
      assert(hunkView1.props.isSelected);
      assert(hunkView1.props.selectedLines.has(hunks[1].lines[1]));
      assert(hunkView1.props.selectedLines.has(hunks[1].lines[2]));
      assert(hunkView1.props.selectedLines.has(hunks[1].lines[3]));

      // clicking the header clears the existing selection and starts hunk-wise selection
      await hunkView0.props.mousedownOnHeader({button: 0, detail: 1}, hunks[0], hunks[0].lines[2]);
      assert(hunkView0.props.isSelected);
      assert(hunkView0.props.selectedLines.has(hunks[0].lines[1]));
      assert(hunkView0.props.selectedLines.has(hunks[0].lines[2]));
      assert(!hunkView1.props.isSelected);

      await hunkView1.props.mousemoveOnLine({}, hunks[1], hunks[1].lines[1]);
      assert(hunkView0.props.isSelected);
      assert(hunkView0.props.selectedLines.has(hunks[0].lines[1]));
      assert(hunkView0.props.selectedLines.has(hunks[0].lines[2]));
      assert(hunkView1.props.isSelected);
      assert(hunkView1.props.selectedLines.has(hunks[1].lines[1]));
      assert(hunkView1.props.selectedLines.has(hunks[1].lines[2]));
      assert(hunkView1.props.selectedLines.has(hunks[1].lines[3]));
    });

    it('allows lines and hunks to be selected via cmd-clicking', async () => {
      const hunk0 = new Hunk(1, 1, 2, 4, '', [
        new HunkLine('line-1', 'added', -1, 1),
        new HunkLine('line-2', 'added', -1, 2),
        new HunkLine('line-3', 'added', -1, 3),
      ]);
      const hunk1 = new Hunk(5, 7, 1, 4, '', [
        new HunkLine('line-5', 'added', -1, 7),
        new HunkLine('line-6', 'added', -1, 8),
        new HunkLine('line-7', 'added', -1, 9),
        new HunkLine('line-8', 'added', -1, 10),
      ]);
      const hunkViews = new Map();
      function registerHunkView(hunk, view) { hunkViews.set(hunk, view); }

      const filePatchView = new FilePatchView({commandRegistry, hunks: [hunk0, hunk1], registerHunkView});
      const hunkView0 = hunkViews.get(hunk0);
      const hunkView1 = hunkViews.get(hunk1);

      // in line selection mode, cmd-click line
      await hunkView0.props.mousedownOnLine({button: 0, detail: 1}, hunk0, hunk0.lines[2]);
      await filePatchView.mouseup();
      assert.equal(filePatchView.getPatchSelectionMode(), 'line');
      assertEqualSets(filePatchView.getSelectedHunks(), new Set([hunk0]));
      assertEqualSets(filePatchView.getSelectedLines(), new Set([hunk0.lines[2]]));
      await hunkView1.props.mousedownOnLine({button: 0, detail: 1, metaKey: true}, hunk1, hunk1.lines[2]);
      await filePatchView.mouseup();
      assertEqualSets(filePatchView.getSelectedHunks(), new Set([hunk0, hunk1]));
      assertEqualSets(filePatchView.getSelectedLines(), new Set([hunk0.lines[2], hunk1.lines[2]]));
      await hunkView1.props.mousedownOnLine({button: 0, detail: 1, metaKey: true}, hunk1, hunk1.lines[2]);
      await filePatchView.mouseup();
      assertEqualSets(filePatchView.getSelectedHunks(), new Set([hunk0]));
      assertEqualSets(filePatchView.getSelectedLines(), new Set([hunk0.lines[2]]));

      // in line selection mode, cmd-click hunk header for separate hunk
      await hunkView0.props.mousedownOnLine({button: 0, detail: 1}, hunk0, hunk0.lines[2]);
      await filePatchView.mouseup();
      assert.equal(filePatchView.getPatchSelectionMode(), 'line');
      assertEqualSets(filePatchView.getSelectedHunks(), new Set([hunk0]));
      assertEqualSets(filePatchView.getSelectedLines(), new Set([hunk0.lines[2]]));
      await hunkView1.props.mousedownOnHeader({button: 0, metaKey: true});
      await filePatchView.mouseup();
      assertEqualSets(filePatchView.getSelectedHunks(), new Set([hunk0, hunk1]));
      assertEqualSets(filePatchView.getSelectedLines(), new Set([hunk0.lines[2], ...hunk1.lines]));
      await hunkView1.props.mousedownOnHeader({button: 0, metaKey: true});
      await filePatchView.mouseup();
      assertEqualSets(filePatchView.getSelectedHunks(), new Set([hunk0]));
      assertEqualSets(filePatchView.getSelectedLines(), new Set([hunk0.lines[2]]));

      // in hunk selection mode, cmd-click line for separate hunk
      await hunkView0.props.mousedownOnLine({button: 0, detail: 1}, hunk0, hunk0.lines[2]);
      await filePatchView.mouseup();
      filePatchView.togglePatchSelectionMode();
      assert.equal(filePatchView.getPatchSelectionMode(), 'hunk');
      assertEqualSets(filePatchView.getSelectedHunks(), new Set([hunk0]));
      assertEqualSets(filePatchView.getSelectedLines(), new Set(hunk0.lines));

      // in hunk selection mode, cmd-click hunk header for separate hunk
      await hunkView0.props.mousedownOnLine({button: 0, detail: 1}, hunk0, hunk0.lines[2]);
      await filePatchView.mouseup();
      filePatchView.togglePatchSelectionMode();
      assert.equal(filePatchView.getPatchSelectionMode(), 'hunk');
      assertEqualSets(filePatchView.getSelectedHunks(), new Set([hunk0]));
      assertEqualSets(filePatchView.getSelectedLines(), new Set(hunk0.lines));
    });

    it('allows lines and hunks to be selected via shift-clicking', async () => {
      const hunk0 = new Hunk(1, 1, 2, 4, '', [
        new HunkLine('line-1', 'unchanged', 1, 1, 0),
        new HunkLine('line-2', 'added', -1, 2, 1),
        new HunkLine('line-3', 'added', -1, 3, 2),
      ]);
      const hunk1 = new Hunk(5, 7, 1, 4, '', [
        new HunkLine('line-5', 'added', -1, 7, 3),
        new HunkLine('line-6', 'added', -1, 8, 4),
        new HunkLine('line-7', 'added', -1, 9, 5),
        new HunkLine('line-8', 'added', -1, 10, 6),
      ]);
      const hunk2 = new Hunk(15, 17, 1, 4, '', [
        new HunkLine('line-15', 'added', -1, 15, 7),
        new HunkLine('line-16', 'added', -1, 18, 8),
        new HunkLine('line-17', 'added', -1, 19, 9),
        new HunkLine('line-18', 'added', -1, 20, 10),
      ]);
      const hunkViews = new Map();
      function registerHunkView(hunk, view) { hunkViews.set(hunk, view); }

      const filePatchView = new FilePatchView({commandRegistry, hunks: [hunk0, hunk1, hunk2], registerHunkView});
      const hunkView0 = hunkViews.get(hunk0);
      const hunkView1 = hunkViews.get(hunk1);
      const hunkView2 = hunkViews.get(hunk2);

      // in line selection mode, shift-click line in separate hunk that comes after selected line
      await hunkView0.props.mousedownOnLine({button: 0, detail: 1}, hunk0, hunk0.lines[2]);
      await filePatchView.mouseup();
      assertEqualSets(filePatchView.getSelectedHunks(), new Set([hunk0]));
      assertEqualSets(filePatchView.getSelectedLines(), new Set([hunk0.lines[2]]));
      await hunkView2.props.mousedownOnLine({button: 0, detail: 1, shiftKey: true}, hunk2, hunk2.lines[2]);
      await filePatchView.mouseup();
      assertEqualSets(filePatchView.getSelectedHunks(), new Set([hunk0, hunk1, hunk2]));
      assertEqualSets(filePatchView.getSelectedLines(), new Set([...hunk0.lines.slice(2), ...hunk1.lines, ...hunk2.lines.slice(0, 3)]));
      await hunkView1.props.mousedownOnLine({button: 0, detail: 1, shiftKey: true}, hunk1, hunk1.lines[2]);
      await filePatchView.mouseup();
      assertEqualSets(filePatchView.getSelectedHunks(), new Set([hunk0, hunk1]));
      assertEqualSets(filePatchView.getSelectedLines(), new Set([...hunk0.lines.slice(2), ...hunk1.lines.slice(0, 3)]));

      // in line selection mode, shift-click hunk header for separate hunk that comes after selected line
      await hunkView0.props.mousedownOnLine({button: 0, detail: 1}, hunk0, hunk0.lines[2]);
      await filePatchView.mouseup();
      assertEqualSets(filePatchView.getSelectedHunks(), new Set([hunk0]));
      assertEqualSets(filePatchView.getSelectedLines(), new Set([hunk0.lines[2]]));
      await hunkView2.props.mousedownOnHeader({button: 0, shiftKey: true}, hunk2);
      await filePatchView.mouseup();
      assertEqualSets(filePatchView.getSelectedHunks(), new Set([hunk0, hunk1, hunk2]));
      assertEqualSets(filePatchView.getSelectedLines(), new Set([...hunk0.lines.slice(2), ...hunk1.lines, ...hunk2.lines]));
      await hunkView1.props.mousedownOnHeader({button: 0, shiftKey: true}, hunk1);
      await filePatchView.mouseup();
      assertEqualSets(filePatchView.getSelectedHunks(), new Set([hunk0, hunk1]));
      assertEqualSets(filePatchView.getSelectedLines(), new Set([...hunk0.lines.slice(2), ...hunk1.lines]));

      // in line selection mode, shift-click hunk header for separate hunk that comes before selected line
      await hunkView2.props.mousedownOnLine({button: 0, detail: 1}, hunk2, hunk2.lines[2]);
      await filePatchView.mouseup();
      assertEqualSets(filePatchView.getSelectedHunks(), new Set([hunk2]));
      assertEqualSets(filePatchView.getSelectedLines(), new Set([hunk2.lines[2]]));
      await hunkView0.props.mousedownOnHeader({button: 0, shiftKey: true}, hunk0);
      await filePatchView.mouseup();
      assertEqualSets(filePatchView.getSelectedHunks(), new Set([hunk0, hunk1, hunk2]));
      assertEqualSets(filePatchView.getSelectedLines(), new Set([...hunk0.lines.slice(1), ...hunk1.lines, ...hunk2.lines.slice(0, 3)]));
      await hunkView1.props.mousedownOnHeader({button: 0, shiftKey: true}, hunk1);
      await filePatchView.mouseup();
      assertEqualSets(filePatchView.getSelectedHunks(), new Set([hunk1, hunk2]));
      assertEqualSets(filePatchView.getSelectedLines(), new Set([...hunk1.lines, ...hunk2.lines.slice(0, 3)]));

      // in hunk selection mode, shift-click hunk header for separate hunk that comes after selected line
      await hunkView0.props.mousedownOnHeader({button: 0}, hunk0);
      await filePatchView.mouseup();
      assertEqualSets(filePatchView.getSelectedHunks(), new Set([hunk0]));
      assertEqualSets(filePatchView.getSelectedLines(), new Set(hunk0.lines.slice(1)));
      await hunkView2.props.mousedownOnHeader({button: 0, shiftKey: true}, hunk2);
      await filePatchView.mouseup();
      assertEqualSets(filePatchView.getSelectedHunks(), new Set([hunk0, hunk1, hunk2]));
      assertEqualSets(filePatchView.getSelectedLines(), new Set([...hunk0.lines.slice(1), ...hunk1.lines, ...hunk2.lines]));
      await hunkView1.props.mousedownOnHeader({button: 0, shiftKey: true}, hunk1);
      await filePatchView.mouseup();
      assertEqualSets(filePatchView.getSelectedHunks(), new Set([hunk0, hunk1]));
      assertEqualSets(filePatchView.getSelectedLines(), new Set([...hunk0.lines.slice(1), ...hunk1.lines]));

      // in hunk selection mode, shift-click hunk header for separate hunk that comes before selected line
      await hunkView2.props.mousedownOnHeader({button: 0}, hunk2);
      await filePatchView.mouseup();
      assertEqualSets(filePatchView.getSelectedHunks(), new Set([hunk2]));
      assertEqualSets(filePatchView.getSelectedLines(), new Set(hunk2.lines));
      await hunkView0.props.mousedownOnHeader({button: 0, shiftKey: true}, hunk0);
      await filePatchView.mouseup();
      assertEqualSets(filePatchView.getSelectedHunks(), new Set([hunk0, hunk1, hunk2]));
      assertEqualSets(filePatchView.getSelectedLines(), new Set([...hunk0.lines.slice(1), ...hunk1.lines, ...hunk2.lines]));
      await hunkView1.props.mousedownOnHeader({button: 0, shiftKey: true}, hunk1);
      await filePatchView.mouseup();
      assertEqualSets(filePatchView.getSelectedHunks(), new Set([hunk1, hunk2]));
      assertEqualSets(filePatchView.getSelectedLines(), new Set([...hunk1.lines, ...hunk2.lines]));
    });
  });

  it('scrolls off-screen lines and hunks into view when they are selected', async function() {
    const hunks = [
      new Hunk(1, 1, 2, 4, '', [
        new HunkLine('line-1', 'unchanged', 1, 1),
        new HunkLine('line-2', 'added', -1, 2),
        new HunkLine('line-3', 'added', -1, 3),
        new HunkLine('line-4', 'unchanged', 2, 4),
      ]),
      new Hunk(5, 7, 1, 4, '', [
        new HunkLine('line-5', 'unchanged', 5, 7),
        new HunkLine('line-6', 'added', -1, 8),
        new HunkLine('line-7', 'added', -1, 9),
        new HunkLine('line-8', 'added', -1, 10),
      ]),
    ];
    const filePatchView = new FilePatchView({commandRegistry, hunks});
    document.body.appendChild(filePatchView.element);
    filePatchView.element.style.overflow = 'scroll';
    filePatchView.element.style.height = '100px';

    filePatchView.togglePatchSelectionMode();
    filePatchView.selectNext();
    await new Promise(resolve => filePatchView.element.addEventListener('scroll', resolve));
    assert.isAbove(filePatchView.element.scrollTop, 0);
    const initScrollTop = filePatchView.element.scrollTop;

    filePatchView.togglePatchSelectionMode();
    filePatchView.selectNext();
    await new Promise(resolve => filePatchView.element.addEventListener('scroll', resolve));
    assert.isAbove(filePatchView.element.scrollTop, initScrollTop);

    filePatchView.element.remove();
  });

  it('assigns the appropriate stage button label on hunks based on the stagingStatus and selection mode', async function() {
    const hunk = new Hunk(1, 1, 1, 2, '', [new HunkLine('line-1', 'added', -1, 1)]);
    let hunkView;
    function registerHunkView(_hunk, view) { hunkView = view; }
    const view = new FilePatchView({commandRegistry, hunks: [hunk], stagingStatus: 'unstaged', registerHunkView});
    assert.equal(hunkView.props.stageButtonLabel, 'Stage Hunk');
    await view.update({commandRegistry, hunks: [hunk], stagingStatus: 'staged', registerHunkView});
    assert.equal(hunkView.props.stageButtonLabel, 'Unstage Hunk');
    await view.togglePatchSelectionMode();
    assert.equal(hunkView.props.stageButtonLabel, 'Unstage Selection');
    await view.update({commandRegistry, hunks: [hunk], stagingStatus: 'unstaged', registerHunkView});
    assert.equal(hunkView.props.stageButtonLabel, 'Stage Selection');
  });

  describe('didClickStageButtonForHunk', function() {
    // ref: https://github.com/atom/github/issues/339
    it('selects the next hunk after staging', async function() {
      const hunks = [
        new Hunk(1, 1, 2, 4, '', [
          new HunkLine('line-1', 'unchanged', 1, 1),
          new HunkLine('line-2', 'added', -1, 2),
          new HunkLine('line-3', 'added', -1, 3),
          new HunkLine('line-4', 'unchanged', 2, 4),
        ]),
        new Hunk(5, 7, 1, 4, '', [
          new HunkLine('line-5', 'unchanged', 5, 7),
          new HunkLine('line-6', 'added', -1, 8),
          new HunkLine('line-7', 'added', -1, 9),
          new HunkLine('line-8', 'added', -1, 10),
        ]),
        new Hunk(15, 17, 1, 4, '', [
          new HunkLine('line-9', 'unchanged', 15, 17),
          new HunkLine('line-10', 'added', -1, 18),
          new HunkLine('line-11', 'added', -1, 19),
          new HunkLine('line-12', 'added', -1, 20),
        ]),
      ];

      const filePatchView = new FilePatchView({commandRegistry, hunks, stagingStatus: 'unstaged', attemptHunkStageOperation: sinon.stub()});
      filePatchView.didClickStageButtonForHunk(hunks[2]);
      await filePatchView.update({hunks: hunks.filter(h => h !== hunks[2])});
      assertEqualSets(filePatchView.selection.getSelectedHunks(), new Set([hunks[1]]));
    });
  });

  describe('keyboard navigation', function() {
    it('invokes the didSurfaceFile callback on core:move-right', function() {
      const hunks = [
        new Hunk(1, 1, 2, 2, '', [
          new HunkLine('line-1', 'unchanged', 1, 1),
          new HunkLine('line-2', 'added', -1, 2),
        ]),
      ];
      const didSurfaceFile = sinon.spy();

      const filePatchView = new FilePatchView({commandRegistry, hunks, didSurfaceFile});

      commandRegistry.dispatch(filePatchView.element, 'core:move-right');

      assert.equal(didSurfaceFile.callCount, 1);
    });
  });

  describe('openFile', () => {
    describe('when the selected line is an added line', () => {
      it('calls this.props.openCurrentFile with the first selected line\'s new line number', async () => {
        const hunks = [
          new Hunk(1, 1, 2, 4, '', [
            new HunkLine('line-1', 'unchanged', 1, 1),
            new HunkLine('line-2', 'added', -1, 2),
            new HunkLine('line-3', 'added', -1, 3),
            new HunkLine('line-4', 'added', -1, 4),
            new HunkLine('line-5', 'unchanged', 2, 5),
          ]),
        ];

        const openCurrentFile = sinon.stub();
        const filePatchView = new FilePatchView({commandRegistry, hunks, openCurrentFile});
        filePatchView.mousedownOnLine({button: 0, detail: 1}, hunks[0], hunks[0].lines[2]);
        await filePatchView.mousemoveOnLine({}, hunks[0], hunks[0].lines[3]);
        await filePatchView.mouseup();

        filePatchView.openFile();
        assert.deepEqual(openCurrentFile.args[0], [{lineNumber: 3}]);
      });
    });

    describe('when the selected line is a deleted line in a non-empty file', () => {
      it('calls this.props.openCurrentFile with the new start row of the first selected hunk', async () => {
        const hunks = [
          new Hunk(1, 1, 2, 4, '', [
            new HunkLine('line-1', 'unchanged', 1, 1),
            new HunkLine('line-2', 'added', -1, 2),
            new HunkLine('line-3', 'added', -1, 3),
            new HunkLine('line-4', 'added', -1, 4),
            new HunkLine('line-5', 'unchanged', 2, 5),
          ]),
          new Hunk(15, 17, 4, 1, '', [
            new HunkLine('line-5', 'unchanged', 15, 17),
            new HunkLine('line-6', 'deleted', 16, -1),
            new HunkLine('line-7', 'deleted', 17, -1),
            new HunkLine('line-8', 'deleted', 18, -1),
          ]),
        ];

        const openCurrentFile = sinon.stub();
        const filePatchView = new FilePatchView({commandRegistry, hunks, openCurrentFile});
        filePatchView.mousedownOnLine({button: 0, detail: 1}, hunks[1], hunks[1].lines[2]);
        await filePatchView.mousemoveOnLine({}, hunks[1], hunks[1].lines[3]);
        await filePatchView.mouseup();

        filePatchView.openFile();
        assert.deepEqual(openCurrentFile.args[0], [{lineNumber: 17}]);
      });
    });

    describe('when the selected line is a deleted line in an empty file', () => {
      it('calls this.props.openCurrentFile with a line number of 0', async () => {
        const hunks = [
          new Hunk(1, 0, 4, 0, '', [
            new HunkLine('line-5', 'deleted', 1, -1),
            new HunkLine('line-6', 'deleted', 2, -1),
            new HunkLine('line-7', 'deleted', 3, -1),
            new HunkLine('line-8', 'deleted', 4, -1),
          ]),
        ];

        const openCurrentFile = sinon.stub();
        const filePatchView = new FilePatchView({commandRegistry, hunks, openCurrentFile});
        filePatchView.mousedownOnLine({button: 0, detail: 1}, hunks[0], hunks[0].lines[2]);
        await filePatchView.mouseup();

        filePatchView.openFile();
        assert.deepEqual(openCurrentFile.args[0], [{lineNumber: 0}]);
      });
    });
  });
});
