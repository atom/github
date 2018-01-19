import React from 'react';
import {shallow, mount} from 'enzyme';

import FilePatchView from '../../lib/views/file-patch-view';
import Hunk from '../../lib/models/hunk';
import HunkLine from '../../lib/models/hunk-line';

import {assertEqualSets} from '../helpers';

describe('FilePatchView', function() {
  let atomEnv, commandRegistry, tooltips, component;
  let attemptLineStageOperation, attemptHunkStageOperation, attemptFileStageOperation, attemptSymlinkStageOperation;
  let attemptModeStageOperation, discardLines, undoLastDiscard, openCurrentFile;
  let didSurfaceFile, didDiveIntoCorrespondingFilePatch, handleShowDiffClick;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
    commandRegistry = atomEnv.commands;
    tooltips = atomEnv.tooltips;

    attemptLineStageOperation = sinon.spy();
    attemptHunkStageOperation = sinon.spy();
    attemptModeStageOperation = sinon.spy();
    attemptFileStageOperation = sinon.spy();
    attemptSymlinkStageOperation = sinon.spy();
    discardLines = sinon.spy();
    undoLastDiscard = sinon.spy();
    openCurrentFile = sinon.spy();
    didSurfaceFile = sinon.spy();
    didDiveIntoCorrespondingFilePatch = sinon.spy();
    handleShowDiffClick = sinon.spy();

    component = (
      <FilePatchView
        commandRegistry={commandRegistry}
        tooltips={tooltips}
        filePath="filename.js"
        hunks={[]}
        stagingStatus="unstaged"
        isPartiallyStaged={false}
        hasUndoHistory={false}
        attemptLineStageOperation={attemptLineStageOperation}
        attemptFileStageOperation={attemptFileStageOperation}
        attemptModeStageOperation={attemptModeStageOperation}
        attemptHunkStageOperation={attemptHunkStageOperation}
        attemptSymlinkStageOperation={attemptSymlinkStageOperation}
        discardLines={discardLines}
        undoLastDiscard={undoLastDiscard}
        openCurrentFile={openCurrentFile}
        didSurfaceFile={didSurfaceFile}
        didDiveIntoCorrespondingFilePatch={didDiveIntoCorrespondingFilePatch}
        handleShowDiffClick={handleShowDiffClick}
      />
    );
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  describe('mouse selection', () => {
    it('allows lines and hunks to be selected via mouse drag', function() {
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

      const wrapper = shallow(React.cloneElement(component, {hunks}));
      const getHunkView = index => wrapper.find({hunk: hunks[index]});

      // drag a selection
      getHunkView(0).prop('mousedownOnLine')({button: 0, detail: 1}, hunks[0], hunks[0].lines[2]);
      getHunkView(1).prop('mousemoveOnLine')({}, hunks[1], hunks[1].lines[1]);
      wrapper.instance().mouseup();

      assert.isTrue(getHunkView(0).prop('isSelected'));
      assert.isTrue(getHunkView(0).prop('selectedLines').has(hunks[0].lines[2]));
      assert.isTrue(getHunkView(1).prop('isSelected'));
      assert.isTrue(getHunkView(1).prop('selectedLines').has(hunks[1].lines[1]));

      // start a new selection, drag it across an existing selection
      getHunkView(1).prop('mousedownOnLine')({button: 0, detail: 1, metaKey: true}, hunks[1], hunks[1].lines[3]);
      getHunkView(0).prop('mousemoveOnLine')({}, hunks[0], hunks[0].lines[0]);

      assert.isTrue(getHunkView(0).prop('isSelected'));
      assert.isTrue(getHunkView(0).prop('selectedLines').has(hunks[0].lines[1]));
      assert.isTrue(getHunkView(0).prop('selectedLines').has(hunks[0].lines[2]));
      assert.isTrue(getHunkView(1).prop('isSelected'));
      assert.isTrue(getHunkView(1).prop('selectedLines').has(hunks[1].lines[1]));
      assert.isTrue(getHunkView(1).prop('selectedLines').has(hunks[1].lines[2]));
      assert.isTrue(getHunkView(1).prop('selectedLines').has(hunks[1].lines[3]));

      // drag back down without releasing mouse; the other selection remains intact
      getHunkView(1).prop('mousemoveOnLine')({}, hunks[1], hunks[1].lines[3]);

      assert.isTrue(getHunkView(0).prop('isSelected'));
      assert.isFalse(getHunkView(0).prop('selectedLines').has(hunks[0].lines[1]));
      assert.isTrue(getHunkView(0).prop('selectedLines').has(hunks[0].lines[2]));
      assert.isTrue(getHunkView(1).prop('isSelected'));
      assert.isTrue(getHunkView(1).prop('selectedLines').has(hunks[1].lines[1]));
      assert.isFalse(getHunkView(1).prop('selectedLines').has(hunks[1].lines[2]));
      assert.isTrue(getHunkView(1).prop('selectedLines').has(hunks[1].lines[3]));

      // drag back up so selections are adjacent, then release the mouse. selections should merge.
      getHunkView(1).prop('mousemoveOnLine')({}, hunks[1], hunks[1].lines[2]);
      wrapper.instance().mouseup();

      assert.isTrue(getHunkView(0).prop('isSelected'));
      assert.isTrue(getHunkView(0).prop('selectedLines').has(hunks[0].lines[2]));
      assert.isTrue(getHunkView(1).prop('isSelected'));
      assert.isTrue(getHunkView(1).prop('selectedLines').has(hunks[1].lines[1]));
      assert.isTrue(getHunkView(1).prop('selectedLines').has(hunks[1].lines[2]));
      assert.isTrue(getHunkView(1).prop('selectedLines').has(hunks[1].lines[3]));

      // we detect merged selections based on the head here
      wrapper.instance().selectToNext();

      assert.isFalse(getHunkView(0).prop('isSelected'));
      assert.isFalse(getHunkView(0).prop('selectedLines').has(hunks[0].lines[2]));

      // double-clicking clears the existing selection and starts hunk-wise selection
      getHunkView(0).prop('mousedownOnLine')({button: 0, detail: 2}, hunks[0], hunks[0].lines[2]);

      assert.isTrue(getHunkView(0).prop('isSelected'));
      assert.isTrue(getHunkView(0).prop('selectedLines').has(hunks[0].lines[1]));
      assert.isTrue(getHunkView(0).prop('selectedLines').has(hunks[0].lines[2]));
      assert.isFalse(getHunkView(1).prop('isSelected'));

      getHunkView(1).prop('mousemoveOnLine')({}, hunks[1], hunks[1].lines[1]);

      assert.isTrue(getHunkView(0).prop('isSelected'));
      assert.isTrue(getHunkView(0).prop('selectedLines').has(hunks[0].lines[1]));
      assert.isTrue(getHunkView(0).prop('selectedLines').has(hunks[0].lines[2]));
      assert.isTrue(getHunkView(1).prop('isSelected'));
      assert.isTrue(getHunkView(1).prop('selectedLines').has(hunks[1].lines[1]));
      assert.isTrue(getHunkView(1).prop('selectedLines').has(hunks[1].lines[2]));
      assert.isTrue(getHunkView(1).prop('selectedLines').has(hunks[1].lines[3]));

      // clicking the header clears the existing selection and starts hunk-wise selection
      getHunkView(0).prop('mousedownOnHeader')({button: 0, detail: 1}, hunks[0], hunks[0].lines[2]);

      assert.isTrue(getHunkView(0).prop('isSelected'));
      assert.isTrue(getHunkView(0).prop('selectedLines').has(hunks[0].lines[1]));
      assert.isTrue(getHunkView(0).prop('selectedLines').has(hunks[0].lines[2]));
      assert.isFalse(getHunkView(1).prop('isSelected'));

      getHunkView(1).prop('mousemoveOnLine')({}, hunks[1], hunks[1].lines[1]);

      assert.isTrue(getHunkView(0).prop('isSelected'));
      assert.isTrue(getHunkView(0).prop('selectedLines').has(hunks[0].lines[1]));
      assert.isTrue(getHunkView(0).prop('selectedLines').has(hunks[0].lines[2]));
      assert.isTrue(getHunkView(1).prop('isSelected'));
      assert.isTrue(getHunkView(1).prop('selectedLines').has(hunks[1].lines[1]));
      assert.isTrue(getHunkView(1).prop('selectedLines').has(hunks[1].lines[2]));
      assert.isTrue(getHunkView(1).prop('selectedLines').has(hunks[1].lines[3]));
    });

    it('allows lines and hunks to be selected via cmd-clicking', function() {
      const hunk0 = new Hunk(1, 1, 2, 4, '', [
        new HunkLine('line-0', 'added', -1, 1),
        new HunkLine('line-1', 'added', -1, 2),
        new HunkLine('line-2', 'added', -1, 3),
      ]);
      const hunk1 = new Hunk(5, 7, 1, 4, '', [
        new HunkLine('line-3', 'added', -1, 7),
        new HunkLine('line-4', 'added', -1, 8),
        new HunkLine('line-5', 'added', -1, 9),
        new HunkLine('line-6', 'added', -1, 10),
      ]);

      const wrapper = shallow(React.cloneElement(component, {
        hunks: [hunk0, hunk1],
      }));
      const getHunkView = index => wrapper.find({hunk: [hunk0, hunk1][index]});

      // in line selection mode, cmd-click line
      getHunkView(0).prop('mousedownOnLine')({button: 0, detail: 1}, hunk0, hunk0.lines[2]);
      wrapper.instance().mouseup();

      assert.equal(wrapper.instance().getPatchSelectionMode(), 'line');
      assertEqualSets(wrapper.instance().getSelectedHunks(), new Set([hunk0]));
      assertEqualSets(wrapper.instance().getSelectedLines(), new Set([hunk0.lines[2]]));

      getHunkView(1).prop('mousedownOnLine')({button: 0, detail: 1, metaKey: true}, hunk1, hunk1.lines[2]);
      wrapper.instance().mouseup();

      assertEqualSets(wrapper.instance().getSelectedHunks(), new Set([hunk0, hunk1]));
      assertEqualSets(wrapper.instance().getSelectedLines(), new Set([hunk0.lines[2], hunk1.lines[2]]));

      getHunkView(1).prop('mousedownOnLine')({button: 0, detail: 1, metaKey: true}, hunk1, hunk1.lines[2]);
      wrapper.instance().mouseup();

      assertEqualSets(wrapper.instance().getSelectedHunks(), new Set([hunk0]));
      assertEqualSets(wrapper.instance().getSelectedLines(), new Set([hunk0.lines[2]]));

      // in line selection mode, cmd-click hunk header for separate hunk
      getHunkView(0).prop('mousedownOnLine')({button: 0, detail: 1}, hunk0, hunk0.lines[2]);
      wrapper.instance().mouseup();

      assert.equal(wrapper.instance().getPatchSelectionMode(), 'line');
      assertEqualSets(wrapper.instance().getSelectedHunks(), new Set([hunk0]));
      assertEqualSets(wrapper.instance().getSelectedLines(), new Set([hunk0.lines[2]]));

      getHunkView(1).prop('mousedownOnHeader')({button: 0, metaKey: true});
      wrapper.instance().mouseup();

      assertEqualSets(wrapper.instance().getSelectedHunks(), new Set([hunk0, hunk1]));
      assertEqualSets(wrapper.instance().getSelectedLines(), new Set([hunk0.lines[2], ...hunk1.lines]));

      getHunkView(1).prop('mousedownOnHeader')({button: 0, metaKey: true});
      wrapper.instance().mouseup();

      assertEqualSets(wrapper.instance().getSelectedHunks(), new Set([hunk0]));
      assertEqualSets(wrapper.instance().getSelectedLines(), new Set([hunk0.lines[2]]));

      // in hunk selection mode, cmd-click line for separate hunk
      getHunkView(0).prop('mousedownOnLine')({button: 0, detail: 1}, hunk0, hunk0.lines[2]);
      wrapper.instance().mouseup();
      wrapper.instance().togglePatchSelectionMode();

      assert.equal(wrapper.instance().getPatchSelectionMode(), 'hunk');
      assertEqualSets(wrapper.instance().getSelectedHunks(), new Set([hunk0]));
      assertEqualSets(wrapper.instance().getSelectedLines(), new Set(hunk0.lines));

      // in hunk selection mode, cmd-click hunk header for separate hunk
      getHunkView(0).prop('mousedownOnLine')({button: 0, detail: 1}, hunk0, hunk0.lines[2]);
      wrapper.instance().mouseup();
      wrapper.instance().togglePatchSelectionMode();

      assert.equal(wrapper.instance().getPatchSelectionMode(), 'hunk');
      assertEqualSets(wrapper.instance().getSelectedHunks(), new Set([hunk0]));
      assertEqualSets(wrapper.instance().getSelectedLines(), new Set(hunk0.lines));
    });

    it('allows lines and hunks to be selected via shift-clicking', () => {
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
      const hunks = [hunk0, hunk1, hunk2];

      const wrapper = shallow(React.cloneElement(component, {hunks}));
      const getHunkView = index => wrapper.find({hunk: hunks[index]});

      // in line selection mode, shift-click line in separate hunk that comes after selected line
      getHunkView(0).prop('mousedownOnLine')({button: 0, detail: 1}, hunk0, hunk0.lines[2]);
      wrapper.instance().mouseup();

      assertEqualSets(wrapper.instance().getSelectedHunks(), new Set([hunk0]));
      assertEqualSets(wrapper.instance().getSelectedLines(), new Set([hunk0.lines[2]]));

      getHunkView(2).prop('mousedownOnLine')({button: 0, detail: 1, shiftKey: true}, hunk2, hunk2.lines[2]);
      wrapper.instance().mouseup();

      assertEqualSets(wrapper.instance().getSelectedHunks(), new Set([hunk0, hunk1, hunk2]));
      assertEqualSets(wrapper.instance().getSelectedLines(), new Set([...hunk0.lines.slice(2), ...hunk1.lines, ...hunk2.lines.slice(0, 3)]));

      getHunkView(1).prop('mousedownOnLine')({button: 0, detail: 1, shiftKey: true}, hunk1, hunk1.lines[2]);
      wrapper.instance().mouseup();

      assertEqualSets(wrapper.instance().getSelectedHunks(), new Set([hunk0, hunk1]));
      assertEqualSets(wrapper.instance().getSelectedLines(), new Set([...hunk0.lines.slice(2), ...hunk1.lines.slice(0, 3)]));

      // in line selection mode, shift-click hunk header for separate hunk that comes after selected line
      getHunkView(0).prop('mousedownOnLine')({button: 0, detail: 1}, hunk0, hunk0.lines[2]);
      wrapper.instance().mouseup();

      assertEqualSets(wrapper.instance().getSelectedHunks(), new Set([hunk0]));
      assertEqualSets(wrapper.instance().getSelectedLines(), new Set([hunk0.lines[2]]));

      getHunkView(2).prop('mousedownOnHeader')({button: 0, shiftKey: true}, hunk2);
      wrapper.instance().mouseup();

      assertEqualSets(wrapper.instance().getSelectedHunks(), new Set([hunk0, hunk1, hunk2]));
      assertEqualSets(wrapper.instance().getSelectedLines(), new Set([...hunk0.lines.slice(2), ...hunk1.lines, ...hunk2.lines]));

      getHunkView(1).prop('mousedownOnHeader')({button: 0, shiftKey: true}, hunk1);
      wrapper.instance().mouseup();

      assertEqualSets(wrapper.instance().getSelectedHunks(), new Set([hunk0, hunk1]));
      assertEqualSets(wrapper.instance().getSelectedLines(), new Set([...hunk0.lines.slice(2), ...hunk1.lines]));

      // in line selection mode, shift-click hunk header for separate hunk that comes before selected line
      getHunkView(2).prop('mousedownOnLine')({button: 0, detail: 1}, hunk2, hunk2.lines[2]);
      wrapper.instance().mouseup();

      assertEqualSets(wrapper.instance().getSelectedHunks(), new Set([hunk2]));
      assertEqualSets(wrapper.instance().getSelectedLines(), new Set([hunk2.lines[2]]));

      getHunkView(0).prop('mousedownOnHeader')({button: 0, shiftKey: true}, hunk0);
      wrapper.instance().mouseup();

      assertEqualSets(wrapper.instance().getSelectedHunks(), new Set([hunk0, hunk1, hunk2]));
      assertEqualSets(wrapper.instance().getSelectedLines(), new Set([...hunk0.lines.slice(1), ...hunk1.lines, ...hunk2.lines.slice(0, 3)]));

      getHunkView(1).prop('mousedownOnHeader')({button: 0, shiftKey: true}, hunk1);
      wrapper.instance().mouseup();

      assertEqualSets(wrapper.instance().getSelectedHunks(), new Set([hunk1, hunk2]));
      assertEqualSets(wrapper.instance().getSelectedLines(), new Set([...hunk1.lines, ...hunk2.lines.slice(0, 3)]));

      // in hunk selection mode, shift-click hunk header for separate hunk that comes after selected line
      getHunkView(0).prop('mousedownOnHeader')({button: 0}, hunk0);
      wrapper.instance().mouseup();

      assertEqualSets(wrapper.instance().getSelectedHunks(), new Set([hunk0]));
      assertEqualSets(wrapper.instance().getSelectedLines(), new Set(hunk0.lines.slice(1)));

      getHunkView(2).prop('mousedownOnHeader')({button: 0, shiftKey: true}, hunk2);
      wrapper.instance().mouseup();

      assertEqualSets(wrapper.instance().getSelectedHunks(), new Set([hunk0, hunk1, hunk2]));
      assertEqualSets(wrapper.instance().getSelectedLines(), new Set([...hunk0.lines.slice(1), ...hunk1.lines, ...hunk2.lines]));

      getHunkView(1).prop('mousedownOnHeader')({button: 0, shiftKey: true}, hunk1);
      wrapper.instance().mouseup();

      assertEqualSets(wrapper.instance().getSelectedHunks(), new Set([hunk0, hunk1]));
      assertEqualSets(wrapper.instance().getSelectedLines(), new Set([...hunk0.lines.slice(1), ...hunk1.lines]));

      // in hunk selection mode, shift-click hunk header for separate hunk that comes before selected line
      getHunkView(2).prop('mousedownOnHeader')({button: 0}, hunk2);
      wrapper.instance().mouseup();

      assertEqualSets(wrapper.instance().getSelectedHunks(), new Set([hunk2]));
      assertEqualSets(wrapper.instance().getSelectedLines(), new Set(hunk2.lines));

      getHunkView(0).prop('mousedownOnHeader')({button: 0, shiftKey: true}, hunk0);
      wrapper.instance().mouseup();

      assertEqualSets(wrapper.instance().getSelectedHunks(), new Set([hunk0, hunk1, hunk2]));
      assertEqualSets(wrapper.instance().getSelectedLines(), new Set([...hunk0.lines.slice(1), ...hunk1.lines, ...hunk2.lines]));

      getHunkView(1).prop('mousedownOnHeader')({button: 0, shiftKey: true}, hunk1);
      wrapper.instance().mouseup();

      assertEqualSets(wrapper.instance().getSelectedHunks(), new Set([hunk1, hunk2]));
      assertEqualSets(wrapper.instance().getSelectedLines(), new Set([...hunk1.lines, ...hunk2.lines]));
    });

    if (process.platform !== 'win32') {
      // https://github.com/atom/github/issues/514
      describe('mousedownOnLine', function() {
        it('does not select line or set selection to be in progress if ctrl-key is pressed and not on windows', function() {
          const hunk0 = new Hunk(1, 1, 2, 4, '', [
            new HunkLine('line-1', 'added', -1, 1),
            new HunkLine('line-2', 'added', -1, 2),
            new HunkLine('line-3', 'added', -1, 3),
          ]);

          const wrapper = shallow(React.cloneElement(component, {hunks: [hunk0]}));

          wrapper.instance().togglePatchSelectionMode();
          assert.equal(wrapper.instance().getPatchSelectionMode(), 'line');

          sinon.spy(wrapper.state('selection'), 'addOrSubtractLineSelection');
          sinon.spy(wrapper.state('selection'), 'selectLine');

          wrapper.find('HunkView').prop('mousedownOnLine')({button: 0, detail: 1, ctrlKey: true}, hunk0, hunk0.lines[2]);
          assert.isFalse(wrapper.state('selection').addOrSubtractLineSelection.called);
          assert.isFalse(wrapper.state('selection').selectLine.called);
          assert.isFalse(wrapper.instance().mouseSelectionInProgress);
        });
      });

      // https://github.com/atom/github/issues/514
      describe('mousedownOnHeader', function() {
        it('does not select line or set selection to be in progress if ctrl-key is pressed and not on windows', function() {
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

          const wrapper = shallow(React.cloneElement(component, {hunks: [hunk0, hunk1]}));

          wrapper.instance().togglePatchSelectionMode();
          assert.equal(wrapper.instance().getPatchSelectionMode(), 'line');

          sinon.spy(wrapper.state('selection'), 'addOrSubtractLineSelection');
          sinon.spy(wrapper.state('selection'), 'selectLine');

          // ctrl-click hunk line
          wrapper.find({hunk: hunk0}).prop('mousedownOnHeader')({button: 0, detail: 1, ctrlKey: true}, hunk0);

          assert.isFalse(wrapper.state('selection').addOrSubtractLineSelection.called);
          assert.isFalse(wrapper.state('selection').selectLine.called);
          assert.isFalse(wrapper.instance().mouseSelectionInProgress);
        });
      });
    }
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

    const root = document.createElement('div');
    root.style.overflow = 'scroll';
    root.style.height = '100px';
    document.body.appendChild(root);

    const wrapper = mount(React.cloneElement(component, {hunks}), {attachTo: root});

    wrapper.instance().togglePatchSelectionMode();
    wrapper.instance().selectNext();
    await new Promise(resolve => root.addEventListener('scroll', resolve));
    assert.isAbove(root.scrollTop, 0);
    const initScrollTop = root.scrollTop;

    wrapper.instance().togglePatchSelectionMode();
    wrapper.instance().selectNext();
    await new Promise(resolve => root.addEventListener('scroll', resolve));
    assert.isAbove(root.scrollTop, initScrollTop);

    root.remove();
  });

  it('assigns the appropriate stage button label on hunks based on the stagingStatus and selection mode', function() {
    const hunk = new Hunk(1, 1, 1, 2, '', [new HunkLine('line-1', 'added', -1, 1)]);

    const wrapper = shallow(React.cloneElement(component, {
      hunks: [hunk],
      stagingStatus: 'unstaged',
    }));

    assert.equal(wrapper.find('HunkView').prop('stageButtonLabel'), 'Stage Hunk');
    wrapper.setProps({stagingStatus: 'staged'});
    assert.equal(wrapper.find('HunkView').prop('stageButtonLabel'), 'Unstage Hunk');

    wrapper.instance().togglePatchSelectionMode();

    assert.equal(wrapper.find('HunkView').prop('stageButtonLabel'), 'Unstage Selection');
    wrapper.setProps({stagingStatus: 'unstaged'});
    assert.equal(wrapper.find('HunkView').prop('stageButtonLabel'), 'Stage Selection');
  });

  describe('didClickStageButtonForHunk', function() {
    // ref: https://github.com/atom/github/issues/339
    it('selects the next hunk after staging', function() {
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

      const wrapper = shallow(React.cloneElement(component, {
        hunks,
        stagingStatus: 'unstaged',
      }));

      wrapper.find({hunk: hunks[2]}).prop('didClickStageButton')();
      wrapper.setProps({hunks: hunks.filter(h => h !== hunks[2])});

      assertEqualSets(wrapper.state('selection').getSelectedHunks(), new Set([hunks[1]]));
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

      const wrapper = mount(React.cloneElement(component, {hunks}));
      commandRegistry.dispatch(wrapper.getDOMNode(), 'core:move-right');

      assert.equal(didSurfaceFile.callCount, 1);
    });
  });

  describe('openFile', function() {
    describe('when the selected line is an added line', function() {
      it('calls this.props.openCurrentFile with the first selected line\'s new line number', function() {
        const hunks = [
          new Hunk(1, 1, 2, 4, '', [
            new HunkLine('line-1', 'unchanged', 1, 1),
            new HunkLine('line-2', 'added', -1, 2),
            new HunkLine('line-3', 'added', -1, 3),
            new HunkLine('line-4', 'added', -1, 4),
            new HunkLine('line-5', 'unchanged', 2, 5),
          ]),
        ];

        const wrapper = shallow(React.cloneElement(component, {hunks}));

        wrapper.instance().mousedownOnLine({button: 0, detail: 1}, hunks[0], hunks[0].lines[2]);
        wrapper.instance().mousemoveOnLine({}, hunks[0], hunks[0].lines[3]);
        wrapper.instance().mouseup();

        wrapper.instance().openFile();
        assert.isTrue(openCurrentFile.calledWith({lineNumber: 3}));
      });
    });

    describe('when the selected line is a deleted line in a non-empty file', function() {
      it('calls this.props.openCurrentFile with the new start row of the first selected hunk', function() {
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

        const wrapper = shallow(React.cloneElement(component, {hunks}));

        wrapper.instance().mousedownOnLine({button: 0, detail: 1}, hunks[1], hunks[1].lines[2]);
        wrapper.instance().mousemoveOnLine({}, hunks[1], hunks[1].lines[3]);
        wrapper.instance().mouseup();

        wrapper.instance().openFile();
        assert.isTrue(openCurrentFile.calledWith({lineNumber: 17}));
      });
    });

    describe('when the selected line is a deleted line in an empty file', function() {
      it('calls this.props.openCurrentFile with a line number of 0', function() {
        const hunks = [
          new Hunk(1, 0, 4, 0, '', [
            new HunkLine('line-5', 'deleted', 1, -1),
            new HunkLine('line-6', 'deleted', 2, -1),
            new HunkLine('line-7', 'deleted', 3, -1),
            new HunkLine('line-8', 'deleted', 4, -1),
          ]),
        ];

        const wrapper = shallow(React.cloneElement(component, {hunks}));

        wrapper.instance().mousedownOnLine({button: 0, detail: 1}, hunks[0], hunks[0].lines[2]);
        wrapper.instance().mouseup();

        wrapper.instance().openFile();
        assert.isTrue(openCurrentFile.calledWith({lineNumber: 0}));
      });
    });
  });
});
