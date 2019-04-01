import React from 'react';
import {shallow} from 'enzyme';
import CommentGutterDecorationController from '../../lib/controllers/comment-gutter-decoration-controller';
import {getEndpoint} from '../../lib/models/endpoint';
import {Range} from 'atom';

describe.only('CommentGutterDecorationController', function() {
  let atomEnv, workspace, editor, wrapper;

  function buildApp(opts = {}) {
    const props = {
      workspace,
      editor,
      ...opts,
    };
    return <CommentGutterDecorationController {...props} />;
  }

  beforeEach(async function() {
    atomEnv = global.buildAtomEnvironment();
    workspace = atomEnv.workspace;
    editor = await workspace.open(__filename);
    wrapper = shallow(buildApp({
      commentRow: 420,
      threadId: 'my-thread-will-go-on',
      extraClasses: ['celine', 'dion'],
      endpoint: getEndpoint('github.com'),
      owner: 'owner',
      repo: 'repo',
      number: 1337,
      workdir: 'dir/path',
    }));
    editor.addGutter({name: 'github-comment-icon'});
  });

  afterEach(function() {
    atomEnv.destroy();
  });


  it('decorates the comment gutter', function() {
    const marker = wrapper.find('Marker');
    const decoration = marker.find('Decoration');
    assert.deepEqual(marker.prop('bufferRange'), new Range([420, 0], [420, 0]));
    assert.isTrue(decoration.hasClass('celine'));
    assert.isTrue(decoration.hasClass('dion'));
    assert.isTrue(decoration.hasClass('github-editorCommentGutterIcon'));
    assert.strictEqual(decoration.children('button.icon.icon-comment').length, 1);

  });

  it('opens review dock and jumps to thread when clicked');
});
