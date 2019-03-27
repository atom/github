import React from 'react';
import {shallow} from 'enzyme';

import EditorCommentDecorationsController from '../../lib/controllers/editor-comment-decorations-controller';
import Marker from '../../lib/atom/marker';
import Decoration from '../../lib/atom/decoration';
import {getEndpoint} from '../../lib/models/endpoint';
import ReviewsItem from '../../lib/items/reviews-item';

describe('EditorCommentDecorationsController', function() {
  let atomEnv, workspace, editor, wrapper;
  let translationPromise, resolveTranslationPromise;

  beforeEach(async function() {
    atomEnv = global.buildAtomEnvironment();
    workspace = atomEnv.workspace;
    editor = await workspace.open(__filename);
    translationPromise = new Promise(resolve => {
      resolveTranslationPromise = resolve;
    });
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
      comments: [],

      translateLines: lines => Promise.resolve(
        new Map(lines.map(line => [line, {newPosition: line + 2}])),
      ),
      didFinishTranslation: resolveTranslationPromise,

      ...opts,
    };

    return <EditorCommentDecorationsController {...props} />;
  }

  it('creates a marker for each comment at its translated line position', async function() {
    const comments = [
      {id: 'comment0', position: 4, isMinimized: false, threadID: 'thread0'},
      {id: 'comment1', position: 10, isMinimized: false, threadID: 'thread1'},
    ];

    wrapper = shallow(buildApp({comments}));
    await translationPromise;

    const markers = wrapper.find(Marker);
    assert.lengthOf(markers, 2);
    assert.isTrue(markers.someWhere(w => w.prop('bufferRange').isEqual([[5, 0], [5, 0]])));
    assert.isTrue(markers.someWhere(w => w.prop('bufferRange').isEqual([[11, 0], [11, 0]])));
  });

  it('creates a line decoration for each line with a comment', async function() {
    const comments = [
      {id: 'comment0', position: 4, isMinimized: false, threadID: 'thread0'},
      {id: 'comment1', position: 10, isMinimized: false, threadID: 'thread1'},
    ];
    wrapper = shallow(buildApp({comments}));
    await translationPromise;

    const decorations = wrapper.find(Decoration);
    assert.lengthOf(decorations.findWhere(decoration => decoration.prop('type') === 'line'), 2);
  });

  it('creates a gutter decoration for each line with a comment', async function() {
    const comments = [
      {id: 'comment0', position: 4, isMinimized: false, threadID: 'thread0'},
      {id: 'comment1', position: 10, isMinimized: false, threadID: 'thread1'},
    ];
    wrapper = shallow(buildApp({comments}));
    await translationPromise;

    const decorations = wrapper.find(Decoration);
    assert.lengthOf(decorations.findWhere(decoration => decoration.prop('type') === 'gutter'), 2);
  });

  it('does not create markers or decorations if no comments exist', async function() {
    wrapper = shallow(buildApp({comments: []}));
    await translationPromise;

    assert.isFalse(wrapper.find(Marker).exists());
    assert.isFalse(wrapper.find(Decoration).exists());
  });

  it('does not create decorations for minimized comments', async function() {
    const comments = [
      {id: 'comment1', position: 10, isMinimized: true, threadID: 'thread1'},
    ];
    wrapper = shallow(buildApp({comments}));
    await translationPromise;

    assert.lengthOf(wrapper.find(Decoration), 0);
  });

  it('does not create decorations for comments with null positions', async function() {
    const comments = [
      {id: 'comment0', position: null, isMinimized: false, threadID: 'thread0'},
    ];
    wrapper = shallow(buildApp({comments}));
    await translationPromise;

    assert.lengthOf(wrapper.find(Decoration), 0);
  });

  it('jumps to the comment thread ID when the decoration is clicked', async function() {
    const jumpToThread = sinon.spy();
    sinon.stub(workspace, 'open').resolves({jumpToThread});

    const comments = [
      {id: 'comment0', position: 4, isMinimized: false, threadID: 'thread0'},
      {id: 'comment1', position: 10, isMinimized: false, threadID: 'thread1'},
    ];

    wrapper = shallow(buildApp({
      endpoint: getEndpoint('github.enterprise.horse'),
      owner: 'atom',
      repo: 'github',
      number: 1995,
      workdir: '/',
      comments,
    }));
    await translationPromise;

    await wrapper
      .find(Marker)
      .filterWhere(w => w.prop('bufferRange').isEqual([[11, 0], [11, 0]]))
      .find('button')
      .prop('onClick')();

    assert.isTrue(workspace.open.calledWith(
      ReviewsItem.buildURI('github.enterprise.horse', 'atom', 'github', 1995, '/'),
      {searchAllPanes: true},
    ));
    assert.isTrue(jumpToThread.calledWith('thread1'));
  });
});
