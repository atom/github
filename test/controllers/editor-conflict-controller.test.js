import path from 'path';
import React from 'react';
import {mount} from 'enzyme';

import ResolutionProgress from '../../lib/models/conflicts/resolution-progress';
import EditorConflictController from '../../lib/controllers/editor-conflict-controller';
import ConflictController from '../../lib/controllers/conflict-controller';

describe('EditorConflictController', function() {
  let atomEnv, workspace, commandRegistry, app, wrapper, editor, editorView, resolutionProgress;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
    workspace = atomEnv.workspace;
    commandRegistry = atomEnv.commands;

    resolutionProgress = ResolutionProgress.empty();
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  const useFixture = async function(fixtureName) {
    editor = await workspace.open(path.join(
      path.dirname(__filename), '..', 'fixtures', 'conflict-marker-examples', fixtureName));
    editorView = atomEnv.views.getView(editor);

    app = (
      <EditorConflictController
        workspace={workspace}
        commandRegistry={commandRegistry}
        editor={editor}
        resolutionProgress={resolutionProgress}
        isRebase={false}
      />
    );
    wrapper = mount(app);
  };

  const textFromSide = function(side) {
    return editor.getTextInBufferRange(side.marker.getBufferRange());
  };

  describe('on a file with 2-way diff markers', function() {
    let conflicts;

    beforeEach(async function() {
      await useFixture('triple-2way-diff.txt');

      conflicts = wrapper.state('conflicts');
    });

    it('creates a Conflict from each conflict marker', function() {
      assert.lengthOf(conflicts, 3);

      assert.equal(textFromSide(conflicts[0].ours), 'My changes\nMulti-line even\n');
      assert.equal(textFromSide(conflicts[0].separator), '=======\n');
      assert.equal(textFromSide(conflicts[0].theirs), 'Your changes\n');

      assert.equal(textFromSide(conflicts[1].ours), 'My middle changes\n');
      assert.equal(textFromSide(conflicts[1].separator), '=======\n');
      assert.equal(textFromSide(conflicts[1].theirs), 'Your middle changes\n');

      assert.equal(textFromSide(conflicts[2].ours), 'More of my changes\n');
      assert.equal(textFromSide(conflicts[2].separator), '=======\n');
      assert.equal(textFromSide(conflicts[2].theirs), 'More of your changes\n');
    });

    it('renders a ConflictController for each Conflict', function() {
      const conflictControllers = wrapper.find(ConflictController);
      assert.lengthOf(conflictControllers, conflicts.length);

      conflicts.forEach(conflict => {
        assert.isTrue(conflictControllers.someWhere(cc => cc.prop('conflict') === conflict));
      });
    });

    it('reports the unresolved conflict count on render', function() {
      assert.equal(resolutionProgress.getRemaining(editor.getPath()), 3);
    });

    it('resolves a conflict as "ours"', function() {
      const conflict = conflicts[1];
      assert.isFalse(conflict.isResolved());

      editor.setCursorBufferPosition([16, 6]); // On "Your middle changes"
      commandRegistry.dispatch(editorView, 'github:resolve-as-ours');

      assert.isTrue(conflict.isResolved());
      assert.strictEqual(conflict.getChosenSide(), conflict.ours);
      assert.deepEqual(conflict.getUnchosenSides(), [conflict.theirs]);

      assert.include(editor.getText(), 'Text in between 0 and 1.\n\nMy middle changes\n\nText in between 1 and 2.');
    });

    it('resolves a conflict as "theirs"', function() {
      const conflict = conflicts[1];

      editor.setCursorBufferPosition([14, 1]); // On "My middle changes"
      commandRegistry.dispatch(editorView, 'github:resolve-as-theirs');

      assert.isTrue(conflict.isResolved());
      assert.strictEqual(conflict.getChosenSide(), conflict.theirs);
      assert.deepEqual(conflict.getUnchosenSides(), [conflict.ours]);

      assert.include(editor.getText(), 'Text in between 0 and 1.\n\nYour middle changes\n\nText in between 1 and 2.');
    });

    it('resolves a conflict as current', function() {
      const conflict = conflicts[1];

      editor.setCursorBufferPosition([14, 1]); // On "My middle changes"
      commandRegistry.dispatch(editorView, 'github:resolve-as-current');

      assert.isTrue(conflict.isResolved());
      assert.strictEqual(conflict.getChosenSide(), conflict.ours);
      assert.deepEqual(conflict.getUnchosenSides(), [conflict.theirs]);

      assert.include(editor.getText(), 'Text in between 0 and 1.\n\nMy middle changes\n\nText in between 1 and 2.');
    });

    it('resolves multiple conflicts as current', function() {
      editor.setCursorBufferPosition([14, 1]); // On "My middle changes"
      editor.addCursorAtBufferPosition([24, 3]); // On "More of your changes"

      commandRegistry.dispatch(editorView, 'github:resolve-as-current');

      assert.isFalse(conflicts[0].isResolved());
      assert.isTrue(conflicts[1].isResolved());
      assert.strictEqual(conflicts[1].getChosenSide(), conflicts[1].ours);
      assert.isTrue(conflicts[2].isResolved());
      assert.strictEqual(conflicts[2].getChosenSide(), conflicts[2].theirs);
    });

    it('disregards conflicts with cursors on both sides', function() {
      editor.setCursorBufferPosition([6, 3]); // On "Multi-line even"
      editor.addCursorAtBufferPosition([14, 1]); // On "My middle changes"
      editor.addCursorAtBufferPosition([16, 0]); // On "Your middle changes"

      commandRegistry.dispatch(editorView, 'github:resolve-as-current');

      assert.isTrue(conflicts[0].isResolved());
      assert.strictEqual(conflicts[0].getChosenSide(), conflicts[0].ours);
      assert.isFalse(conflicts[1].isResolved());
      assert.isFalse(conflicts[2].isResolved());
    });

    it('resolves a conflict as "ours then theirs"', function() {
      const conflict = conflicts[1];

      editor.setCursorBufferPosition([14, 1]); // On "My middle changes"
      commandRegistry.dispatch(editorView, 'github:resolve-as-ours-then-theirs');

      assert.isTrue(conflict.isResolved());
      assert.include(editor.getText(), 'Text in between 0 and 1.' +
        '\n\nMy middle changes\nYour middle changes\n\nText in between 1 and 2.');
    });

    it('resolves a conflict as "theirs then ours"', function() {
      const conflict = conflicts[1];

      editor.setCursorBufferPosition([14, 1]); // On "My middle changes"
      commandRegistry.dispatch(editorView, 'github:resolve-as-theirs-then-ours');

      assert.isTrue(conflict.isResolved());
      assert.include(editor.getText(), 'Text in between 0 and 1.' +
        '\n\nYour middle changes\nMy middle changes\n\nText in between 1 and 2.');
    });

    it('resolves a conflict as custom text', function() {
      const conflict = conflicts[1];
      const range = conflict.ours.getMarker().getBufferRange();
      editor.setTextInBufferRange(range, 'Actually it should be this\n');

      editor.setCursorBufferPosition([16, 6]); // On "Your middle changes"
      commandRegistry.dispatch(editorView, 'github:resolve-as-ours');

      assert.isTrue(conflict.isResolved());
      assert.strictEqual(conflict.getChosenSide(), conflict.ours);

      assert.include(editor.getText(), 'Text in between 0 and 1.\n\n' +
        'Actually it should be this\n\nText in between 1 and 2.');
    });

    it('preserves a modified side banner', function() {
      const conflict = conflicts[1];
      const range = conflict.ours.getBannerMarker().getBufferRange();
      editor.setTextInBufferRange(range, '>>>>>>> Changed this myself\n');

      assert.isTrue(conflict.ours.isBannerModified());

      editor.setCursorBufferPosition([16, 6]); // On "Your middle changes"
      commandRegistry.dispatch(editorView, 'github:resolve-as-ours');

      assert.isTrue(conflict.isResolved());
      assert.strictEqual(conflict.getChosenSide(), conflict.ours);

      assert.include(editor.getText(), 'Text in between 0 and 1.\n\n' +
        '>>>>>>> Changed this myself\n' +
        'My middle changes\n\n' +
        'Text in between 1 and 2.');
    });

    it('preserves a modified separator', function() {
      const conflict = conflicts[1];
      const range = conflict.getSeparator().getMarker().getBufferRange();
      editor.setTextInBufferRange(range, '==== hooray ====\n');

      assert.isTrue(conflict.getSeparator().isModified());

      editor.setCursorBufferPosition([16, 6]); // On "Your middle changes"
      commandRegistry.dispatch(editorView, 'github:resolve-as-ours');

      assert.include(editor.getText(), 'Text in between 0 and 1.\n\n' +
        'My middle changes\n' +
        '==== hooray ====\n\n' +
        'Text in between 1 and 2.');
    });

    it('reports resolution progress', function() {
      assert.equal(resolutionProgress.getRemaining(editor.getPath()), 3);

      editor.setCursorBufferPosition([16, 6]); // On "Your middle changes"
      commandRegistry.dispatch(editorView, 'github:resolve-as-ours');

      assert.equal(resolutionProgress.getRemaining(editor.getPath()), 2);
    });
  });

  describe('on a file with 3-way diff markers', function() {
    let conflicts, conflict;

    beforeEach(async function() {
      await useFixture('single-3way-diff.txt');
      conflicts = wrapper.state('conflicts');
      conflict = conflicts[0];
    });

    it('creates a conflict controller for each conflict', function() {
      assert.lengthOf(conflicts, 1);

      assert.equal(textFromSide(conflicts[0].base), 'These are original texts\n');
    });

    it('resolves a conflict as "ours"', function() {
      assert.isFalse(conflict.isResolved());

      editor.setCursorBufferPosition([3, 4]); // On "These are original texts"
      commandRegistry.dispatch(editorView, 'github:resolve-as-ours');

      assert.isTrue(conflict.isResolved());
      assert.strictEqual(conflict.getChosenSide(), conflict.ours);
      assert.deepEqual(conflict.getUnchosenSides(), [conflict.theirs, conflict.base]);

      assert.include(editor.getText(), 'These are my changes\n\nPast the end\n');
    });

    it('resolves a conflict as "theirs"', function() {
      editor.setCursorBufferPosition([3, 4]); // On "These are original texts"
      commandRegistry.dispatch(editorView, 'github:resolve-as-theirs');

      assert.isTrue(conflict.isResolved());
      assert.strictEqual(conflict.getChosenSide(), conflict.theirs);
      assert.deepEqual(conflict.getUnchosenSides(), [conflict.ours, conflict.base]);

      assert.include(editor.getText(), 'These are your changes\n\nPast the end\n');
    });

    it('resolves a conflict as "base"', function() {
      editor.setCursorBufferPosition([1, 0]); // On "These are my changes"
      commandRegistry.dispatch(editorView, 'github:resolve-as-base');

      assert.isTrue(conflict.isResolved());
      assert.strictEqual(conflict.getChosenSide(), conflict.base);
      assert.deepEqual(conflict.getUnchosenSides(), [conflict.ours, conflict.theirs]);

      assert.include(editor.getText(), 'These are original texts\n\nPast the end\n');
    });

    it('resolves a conflict as "ours then theirs"', function() {
      editor.setCursorBufferPosition([3, 4]); // On "These are original texts"
      commandRegistry.dispatch(editorView, 'github:resolve-as-ours-then-theirs');

      assert.isTrue(conflict.isResolved());
      assert.include(editor.getText(), 'These are my changes\nThese are your changes\n\nPast the end\n');
    });

    it('resolves a conflict as "theirs then ours"', function() {
      editor.setCursorBufferPosition([3, 4]); // On "These are original texts"
      commandRegistry.dispatch(editorView, 'github:resolve-as-theirs-then-ours');

      assert.isTrue(conflict.isResolved());
      assert.include(editor.getText(), 'These are your changes\nThese are my changes\n\nPast the end\n');
    });
  });
});
