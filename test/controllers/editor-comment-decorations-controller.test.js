import React from 'react';
import {shallow} from 'enzyme';

import EditorCommentDecorationsController from '../../lib/controllers/editor-comment-decorations-controller';
import CommentGutterDecorationController from '../../lib/controllers/comment-gutter-decoration-controller';
import Marker from '../../lib/atom/marker';
import Decoration from '../../lib/atom/decoration';
import {getEndpoint} from '../../lib/models/endpoint';

describe('EditorCommentDecorationsController', function() {
  let atomEnv, workspace, editor, wrapper;

  beforeEach(async function() {
    atomEnv = global.buildAtomEnvironment();
    workspace = atomEnv.workspace;
    editor = await workspace.open(__filename);
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function buildApp(opts = {}) {
    const props = {
      endpoint: getEndpoint('github.com'),
      owner: 'owner',
      repo: 'repo',
      number: 123,
      workdir: __dirname,

      workspace,
      editor,
      threadsForPath: [],
      commentTranslationsForPath: {
        diffToFilePosition: new Map(),
      },

      ...opts,
    };

    return <EditorCommentDecorationsController {...props} />;
  }

  it('renders nothing if no position translations are available for this path', function() {
    wrapper = shallow(buildApp({commentTranslationsForPath: null}));
    assert.isTrue(wrapper.isEmptyRender());
  });

  it('creates a marker and decoration controller for each comment thread at its translated line position', function() {
    const threadsForPath = [
      {rootCommentID: 'comment0', position: 4, threadID: 'thread0'},
      {rootCommentID: 'comment1', position: 10, threadID: 'thread1'},
      {rootCommentID: 'untranslateable', position: 20, threadID: 'thread2'},
      {rootCommentID: 'positionless', position: null, threadID: 'thread3'},
    ];

    const commentTranslationsForPath = {
      diffToFilePosition: new Map([
        [4, 7],
        [10, 13],
      ]),
    };

    wrapper = shallow(buildApp({threadsForPath, commentTranslationsForPath}));

    const markers = wrapper.find(Marker);
    assert.lengthOf(markers, 2);
    assert.isTrue(markers.someWhere(w => w.prop('bufferRange').isEqual([[6, 0], [6, 0]])));
    assert.isTrue(markers.someWhere(w => w.prop('bufferRange').isEqual([[12, 0], [12, 0]])));

    const controllers = wrapper.find(CommentGutterDecorationController);
    assert.lengthOf(controllers, 2);
    assert.isTrue(controllers.someWhere(w => w.prop('commentRow') === 6));
    assert.isTrue(controllers.someWhere(w => w.prop('commentRow') === 12));
  });

  it('creates a line decoration for each line with a comment', function() {
    const threadsForPath = [
      {rootCommentID: 'comment0', position: 4, threadID: 'thread0'},
      {rootCommentID: 'comment1', position: 10, threadID: 'thread1'},
    ];
    const commentTranslationsForPath = {
      diffToFilePosition: new Map([
        [4, 5],
        [10, 11],
      ]),
    };

    wrapper = shallow(buildApp({threadsForPath, commentTranslationsForPath}));

    const decorations = wrapper.find(Decoration);
    assert.lengthOf(decorations.findWhere(decoration => decoration.prop('type') === 'line'), 2);
  });
});
