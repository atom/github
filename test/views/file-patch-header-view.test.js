import React from 'react';
import {shallow} from 'enzyme';

import FilePatchHeaderView from '../../lib/views/file-patch-header-view';

describe('FilePatchHeaderView', function() {
  let atomEnv;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function buildApp(overrideProps = {}) {
    return (
      <FilePatchHeaderView
        relPath="dir/a.txt"
        stagingStatus="unstaged"
        isPartiallyStaged={false}
        hasHunks={true}
        hasUndoHistory={false}

        tooltips={atomEnv.tooltips}

        undoLastDiscard={() => {}}
        diveIntoMirrorPatch={() => {}}
        openFile={() => {}}
        toggleFile={() => {}}

        {...overrideProps}
      />
    );
  }

  describe('the title', function() {
    it('renders for an unstaged patch', function() {
      const wrapper = shallow(buildApp({stagingStatus: 'unstaged'}));
      assert.strictEqual(wrapper.find('.github-FilePatchView-title').text(), 'Unstaged Changes for dir/a.txt');
    });

    it('renders for a staged patch', function() {
      const wrapper = shallow(buildApp({stagingStatus: 'staged'}));
      assert.strictEqual(wrapper.find('.github-FilePatchView-title').text(), 'Staged Changes for dir/a.txt');
    });
  });

  describe('the button group', function() {
    it('includes undo discard if undo history is available and the patch is unstaged', function() {
      const undoLastDiscard = sinon.stub();
      const wrapper = shallow(buildApp({hasUndoHistory: true, stagingStatus: 'unstaged', undoLastDiscard}));
      assert.isTrue(wrapper.find('button.icon-history').exists());

      wrapper.find('button.icon-history').simulate('click');
      assert.isTrue(undoLastDiscard.called);

      wrapper.setProps({hasUndoHistory: false, stagingStatus: 'unstaged'});
      assert.isFalse(wrapper.find('button.icon-history').exists());

      wrapper.setProps({hasUndoHistory: true, stagingStatus: 'staged'});
      assert.isFalse(wrapper.find('button.icon-history').exists());
    });

    function createPatchToggleTest({overrideProps, stagingStatus, buttonClass, oppositeButtonClass, tooltip}) {
      return function() {
        const diveIntoMirrorPatch = sinon.stub();
        const wrapper = shallow(buildApp({stagingStatus, diveIntoMirrorPatch, ...overrideProps}));

        assert.isTrue(wrapper.find(`button.${buttonClass}`).exists(),
          `${buttonClass} expected, but not found`);
        assert.isFalse(wrapper.find(`button.${oppositeButtonClass}`).exists(),
          `${oppositeButtonClass} not expected, but found`);

        wrapper.find(`button.${buttonClass}`).simulate('click');
        assert.isTrue(diveIntoMirrorPatch.called, `${buttonClass} click did nothing`);

        assert.isTrue(wrapper.find('Tooltip').someWhere(n => n.prop('title') === tooltip));
      };
    }

    function createUnstagedPatchToggleTest(overrideProps) {
      return createPatchToggleTest({
        overrideProps,
        stagingStatus: 'unstaged',
        buttonClass: 'icon-tasklist',
        oppositeButtonClass: 'icon-list-unordered',
        tooltip: 'View staged changes',
      });
    }

    function createStagedPatchToggleTest(overrideProps) {
      return createPatchToggleTest({
        overrideProps,
        stagingStatus: 'staged',
        buttonClass: 'icon-list-unordered',
        oppositeButtonClass: 'icon-tasklist',
        tooltip: 'View unstaged changes',
      });
    }

    describe('when the patch is partially staged', function() {
      const props = {isPartiallyStaged: true};

      it('includes a toggle to staged button when unstaged', createUnstagedPatchToggleTest(props));

      it('includes a toggle to unstaged button when staged', createStagedPatchToggleTest(props));
    });

    describe('when the patch contains no hunks', function() {
      const props = {hasHunks: false};

      it('includes a toggle to staged button when unstaged', createUnstagedPatchToggleTest(props));

      it('includes a toggle to unstaged button when staged', createStagedPatchToggleTest(props));
    });

    it('includes an open file button', function() {
      const openFile = sinon.stub();
      const wrapper = shallow(buildApp({openFile}));

      wrapper.find('button.icon-code').simulate('click');
      assert.isTrue(openFile.called);
    });

    function createToggleFileTest({stagingStatus, buttonClass, oppositeButtonClass}) {
      return function() {
        const toggleFile = sinon.stub();
        const wrapper = shallow(buildApp({toggleFile, stagingStatus}));

        assert.isTrue(wrapper.find(`button.${buttonClass}`).exists(),
          `${buttonClass} expected, but not found`);
        assert.isFalse(wrapper.find(`button.${oppositeButtonClass}`).exists(),
          `${oppositeButtonClass} not expected, but found`);

        wrapper.find(`button.${buttonClass}`).simulate('click');
        assert.isTrue(toggleFile.called, `${buttonClass} click did nothing`);
      };
    }

    it('includes a stage file button when unstaged', createToggleFileTest({
      stagingStatus: 'unstaged',
      buttonClass: 'icon-move-down',
      oppositeButtonClass: 'icon-move-up',
    }));

    it('includes an unstage file button when staged', createToggleFileTest({
      stagingStatus: 'staged',
      buttonClass: 'icon-move-up',
      oppositeButtonClass: 'icon-move-down',
    }));
  });
});
