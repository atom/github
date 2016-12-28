/** @babel */

import path from 'path';
import React from 'react';
import {shallow} from 'enzyme';

import EditorConflictController from '../../lib/controllers/editor-conflict-controller';
import Decoration from '../../lib/views/decoration';

describe('EditorConflictController', () => {
  let atomEnv, workspace, app, editor, decorations;

  beforeEach(() => {
    atomEnv = global.buildAtomEnvironment();
    workspace = atomEnv.workspace;
  });

  afterEach(() => atomEnv.destroy());

  const decorationsFromFixture = async fixtureName => {
    editor = await workspace.open(path.join(
      path.dirname(__filename), '..', 'fixtures', 'conflict-marker-examples', fixtureName));

    app = <EditorConflictController workspace={workspace} editor={editor} isRebase={false} />;
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

  const textFromDecorations = ds => ds.map(d => {
    return editor.getTextInBufferRange(d.props().marker.getBufferRange());
  });

  describe('on a file with 2-way diff markers', () => {
    beforeEach(() => decorationsFromFixture('triple-2way-diff.txt'));

    it('decorates the banner lines for our and their sides', () => {
      const matches = decorationsMatching({type: 'line', class: 'conflict-banner'});
      assert.deepEqual(textFromDecorations(matches), [
        '<<<<<<< HEAD\n',
        '>>>>>>> other-branch\n',
        '<<<<<<< HEAD\n',
        '>>>>>>> other-branch\n',
        '<<<<<<< HEAD\n',
        '>>>>>>> other-branch\n',
      ]);
    });

    it('decorates the banner line numbers', () => {
      assert.lengthOf(decorationsMatching({type: 'line-number', class: 'conflict-banner'}), 6);
    });

    it('decorates separators', () => {
      const matches = decorationsMatching({type: 'line', class: 'conflict-separator'});
      assert.deepEqual(textFromDecorations(matches), ['=======\n', '=======\n', '=======\n']);
    });

    it('decorates our and their sides of each', () => {
      const ourLines = decorationsMatching({type: 'line', class: 'conflict-ours'});
      assert.deepEqual(textFromDecorations(ourLines), [
        'My changes\nMulti-line even\n',
        'My middle changes\n',
        'More of my changes\n',
      ]);

      const theirLines = decorationsMatching({type: 'line', class: 'conflict-theirs'});
      assert.deepEqual(textFromDecorations(theirLines), [
        'Your changes\n',
        'Your middle changes\n',
        'More of your changes\n',
      ]);
    });
  });

  describe('on a file with 3-way diff markers', () => {
    beforeEach(() => decorationsFromFixture('single-3way-diff.txt'));

    it('decorates the base banner', () => {
      const banners = decorationsMatching({type: 'line', class: 'conflict-banner'});
      assert.include(textFromDecorations(banners), '||||||| merged common ancestors\n');
    });

    it('decorates the base side lines', () => {
      const baseLines = decorationsMatching({type: 'line', class: 'conflict-base'});
      assert.deepEqual(textFromDecorations(baseLines), [
        'These are original texts\n',
      ]);
    });
  });
});
