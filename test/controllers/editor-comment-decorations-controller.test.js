import React from 'react';
import {shallow} from 'enzyme';

import EditorCommentDecorationsController from '../../lib/controllers/editor-comment-decorations-controller';
import Decoration from '../../lib/atom/decoration';

describe('EditorCommentDecorationsController', function() {
  let atomEnv, workspace, editor, wrapper;

  function buildApp(opts = {}) {
    const props = {
      comments: [{position: 2}, {position: 3}],
      ...opts,
    };

    return (
      <EditorCommentDecorationsController {...props} />
    );
  }

  beforeEach(async function() {
    atomEnv = global.buildAtomEnvironment();
    workspace = atomEnv.workspace;
    editor = await workspace.open('zzz');
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  it('creates a marker for each comment', function() {
    wrapper = shallow(buildApp({editor}));
    const markers = wrapper.find(Marker);
    assert.lengthOf(markers, 2);
  });

  it('creates a line decoration for each line with a comment', function() {
    wrapper = shallow(buildApp({editor}));
    const decorations = wrapper.find(Decoration);
    assert.lengthOf(decorations.findWhere(decoration => decoration.prop('type') === 'line'), 2);
  });

  it('creates a gutter decoration for each line with a comment', function() {
    wrapper = shallow(buildApp({editor}));
    const decorations = wrapper.find(Decoration);
    assert.lengthOf(decorations.findWhere(decoration => decoration.prop('type') === 'gutter'), 2);
  });

  it('does not create decorations if no comments exist', function() {
    wrapper = shallow(buildApp({editor, comments: []}));
    assert.lengthOf(wrapper.find(Decoration), 0);
  });

  it('does not create decorations for minimized comments', function() {
    wrapper = shallow(buildApp({editor, comments: [{isMinimized: true, position: 5}]}));
    assert.lengthOf(wrapper.find(Decoration), 0);
  });
  it('does not create decorations for comments with null position', function() {
    wrapper = shallow(buildApp({editor, comments: [{position: null}]}));
    assert.lengthOf(wrapper.find(Decoration), 0);
  });
});
