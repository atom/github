import path from 'path';
import React from 'react';
import {shallow} from 'enzyme';

import Conflict from '../../lib/models/conflicts/conflict';
import ConflictController from '../../lib/controllers/conflict-controller';
import Decoration from '../../lib/views/decoration';

describe('ConflictController', function() {
  let atomEnv, workspace, app, editor, conflict, controller, decorations;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
    workspace = atomEnv.workspace;
  });

  afterEach(async function() {
    await atomEnv.destroy();
  });

  const useFixture = async function(fixtureName, conflictIndex) {
    editor = await workspace.open(path.join(
      path.dirname(__filename), '..', 'fixtures', 'conflict-marker-examples', fixtureName));

    const conflicts = Conflict.all(editor, false);
    conflict = conflicts[conflictIndex];

    app = <ConflictController workspace={workspace} editor={editor} conflict={conflict} />;
    const wrapper = shallow(app);
    controller = wrapper.instance();
    decorations = wrapper.find(Decoration);
  };

  const decorationsMatching = query => decorations.filterWhere(d => {
    const queryKeys = Object.keys(query);
    const props = d.props();
    for (let i = 0; i < queryKeys.length; i++) {
      const key = queryKeys[i];

      if (props[key] !== query[key]) {
        return false;
      }
    }
    return true;
  });

  const textFromDecoration = function(d) {
    return editor.getTextInBufferRange(d.props().marker.getBufferRange());
  };

  it('creates a Decoration for each conflict', async function() {
    await useFixture('triple-2way-diff.txt', 1);

    const bannerDecorations = decorationsMatching({type: 'line', class: 'conflict-banner'});
    assert.deepEqual(bannerDecorations.map(textFromDecoration), [
      '<<<<<<< HEAD\n',
      '>>>>>>> other-branch\n',
    ]);

    const bannerLineDecorations = decorationsMatching({type: 'line-number', class: 'conflict-banner'});
    assert.deepEqual(bannerLineDecorations.map(textFromDecoration), [
      '<<<<<<< HEAD\n',
      '>>>>>>> other-branch\n',
    ]);

    const ourSideDecorations = decorationsMatching({type: 'line', class: 'conflict-ours'});
    assert.deepEqual(ourSideDecorations.map(textFromDecoration), [
      'My middle changes\n',
    ]);

    const separatorDecorations = decorationsMatching({type: 'line', class: 'conflict-separator'});
    assert.deepEqual(separatorDecorations.map(textFromDecoration), [
      '=======\n',
    ]);

    const theirSideDecorations = decorationsMatching({type: 'line', class: 'conflict-theirs'});
    assert.deepEqual(theirSideDecorations.map(textFromDecoration), [
      'Your middle changes\n',
    ]);
  });

  describe('resolving two-way diff markers', function() {
    beforeEach(async function() {
      await useFixture('triple-2way-diff.txt', 1);
    });

    it('resolves a conflict as "ours"', function() {
      assert.isFalse(conflict.isResolved());

      controller.resolveAsOurs();

      assert.isTrue(conflict.isResolved());
      assert.strictEqual(conflict.getChosenSide(), conflict.ours);
      assert.deepEqual(conflict.getUnchosenSides(), [conflict.theirs]);

      assert.include(editor.getText(), 'Text in between 0 and 1.\n\nMy middle changes\n\nText in between 1 and 2.');
    });

    it('resolves a conflict as "theirs"', function() {
      controller.resolveAsTheirs();

      assert.isTrue(conflict.isResolved());
      assert.strictEqual(conflict.getChosenSide(), conflict.theirs);
      assert.deepEqual(conflict.getUnchosenSides(), [conflict.ours]);

      assert.include(editor.getText(), 'Text in between 0 and 1.\n\nYour middle changes\n\nText in between 1 and 2.');
    });

    it('resolves a conflict as "ours then theirs"', function() {
      controller.resolveAsOursThenTheirs();

      assert.isTrue(conflict.isResolved());
      assert.include(editor.getText(), 'Text in between 0 and 1.' +
        '\n\nMy middle changes\nYour middle changes\n\nText in between 1 and 2.');
    });

    it('resolves a conflict as "theirs then ours"', function() {
      controller.resolveAsTheirsThenOurs();

      assert.isTrue(conflict.isResolved());
      assert.include(editor.getText(), 'Text in between 0 and 1.' +
        '\n\nYour middle changes\nMy middle changes\n\nText in between 1 and 2.');
    });

    it('resolves a conflict as custom text', function() {
      const range = conflict.ours.getMarker().getBufferRange();
      editor.setTextInBufferRange(range, 'Actually it should be this\n');

      assert.isTrue(conflict.ours.isModified());

      controller.resolveAsOurs();

      assert.isTrue(conflict.isResolved());
      assert.strictEqual(conflict.getChosenSide(), conflict.ours);

      assert.include(editor.getText(), 'Text in between 0 and 1.\n\n' +
        'Actually it should be this\n\nText in between 1 and 2.');
    });

    it('preserves a modified side banner', function() {
      const range = conflict.ours.getBannerMarker().getBufferRange();
      editor.setTextInBufferRange(range, '>>>>>>> Changed this myself\n');

      assert.isTrue(conflict.ours.isBannerModified());

      controller.resolveAsOurs();

      assert.isTrue(conflict.isResolved());
      assert.strictEqual(conflict.getChosenSide(), conflict.ours);

      assert.include(editor.getText(), 'Text in between 0 and 1.\n\n' +
        '>>>>>>> Changed this myself\n' +
        'My middle changes\n\n' +
        'Text in between 1 and 2.');
    });

    it('preserves a modified separator', function() {
      const range = conflict.getSeparator().getMarker().getBufferRange();
      editor.setTextInBufferRange(range, '==== hooray ====\n');

      assert.isTrue(conflict.getSeparator().isModified());

      controller.resolveAsOurs();

      assert.include(editor.getText(), 'Text in between 0 and 1.\n\n' +
        'My middle changes\n' +
        '==== hooray ====\n\n' +
        'Text in between 1 and 2.');
    });
  });
});
