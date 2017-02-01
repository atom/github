import path from 'path';
import React from 'react';
import {mount} from 'enzyme';

import EditorConflictController from '../../lib/controllers/editor-conflict-controller';
import ConflictController from '../../lib/controllers/conflict-controller';

describe('EditorConflictController', function() {
  let atomEnv, workspace, app, editor, instance, conflictControllers;
  let atomEnv, workspace, commandRegistry, app, editor, editorView, conflictControllers;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
    workspace = atomEnv.workspace;
    commandRegistry = atomEnv.commands;
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
        isRebase={false}
      />
    );
    const wrapper = mount(app);
    conflictControllers = wrapper.find(ConflictController);
  };

  const textFromSide = function(side) {
    return editor.getTextInBufferRange(side.marker.getBufferRange());
  };

  describe('on a file with 2-way diff markers', function() {
    let conflicts;

    beforeEach(async function() {
      await useFixture('triple-2way-diff.txt');

      conflicts = conflictControllers.map(c => c.props().conflict);
    });

    it('creates a conflict controller for each conflict', function() {
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

    it('resolves multiple conflicts as current');

    it('disregards conflicts with cursors on both sides');

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
  });

  describe('on a file with 3-way diff markers', function() {
    let conflicts, conflict;

    beforeEach(async function() {
      await useFixture('single-3way-diff.txt');
      conflicts = conflictControllers.map(c => c.props().conflict);
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
