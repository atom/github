/** @babel */

import path from 'path';
import React from 'react';
import {shallow} from 'enzyme';

import EditorConflictController from '../../lib/controllers/editor-conflict-controller';
import ConflictController from '../../lib/controllers/conflict-controller';

describe('EditorConflictController', function() {
  let atomEnv, workspace, app, editor, conflictControllers;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
    workspace = atomEnv.workspace;
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  const useFixture = async function(fixtureName) {
    editor = await workspace.open(path.join(
      path.dirname(__filename), '..', 'fixtures', 'conflict-marker-examples', fixtureName));

    app = <EditorConflictController workspace={workspace} editor={editor} isRebase={false} />;
    const wrapper = shallow(app);
    conflictControllers = wrapper.find(ConflictController);
  };

  const textFromSide = function(side) {
    return editor.getTextInBufferRange(side.marker.getBufferRange());
  };

  describe('on a file with 2-way diff markers', function() {
    beforeEach(async function() {
      await useFixture('triple-2way-diff.txt');
    });

    it('creates a conflict controller for each conflict', function() {
      const conflicts = conflictControllers.map(c => c.props().conflict);
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
  });

  describe('on a file with 3-way diff markers', function() {
    beforeEach(() => useFixture('single-3way-diff.txt'));

    it('creates a conflict controller for each conflict', function() {
      const conflicts = conflictControllers.map(c => c.props().conflict);
      assert.lengthOf(conflicts, 1);

      assert.equal(textFromSide(conflicts[0].base), 'These are original texts\n');
    });
  });
});
