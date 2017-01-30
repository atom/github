import path from 'path';
import React from 'react';
import {shallow} from 'enzyme';

import Conflict from '../../lib/models/conflicts/conflict';
import ConflictController from '../../lib/controllers/conflict-controller';
import Decoration from '../../lib/views/decoration';

describe('ConflictController', function() {
  let atomEnv, workspace, app, editor, conflict, decorations;

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
});
