import React from 'react';
import {mount} from 'enzyme';
import path from 'path';

import {BareCommentDecorationsController} from '../../lib/controllers/comment-decorations-controller';
import RelayNetworkLayerManager from '../../lib/relay-network-layer-manager';
import {aggregatedReviewsBuilder} from '../builder/graphql/aggregated-reviews-builder';
import {getEndpoint} from '../../lib/models/endpoint';
import pullRequestsQuery from '../../lib/controllers/__generated__/commentDecorationsController_pullRequests.graphql';
import {pullRequestBuilder} from '../builder/graphql/pr';
import Branch from '../../lib/models/branch';
import BranchSet from '../../lib/models/branch-set';
import Remote from '../../lib/models/remote';
import RemoteSet from '../../lib/models/remote-set';

describe.only('CommentDecorationsController', function() {
  let atomEnv, relayEnv;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
    relayEnv = RelayNetworkLayerManager.getEnvironmentForHost(getEndpoint('github.com'), '1234');
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function buildApp(override = {}) {
    const origin = new Remote('origin', 'git@github.com:owner/repo.git');
    const upstreamBranch = Branch.createRemoteTracking('refs/remotes/origin/featureBranch', 'origin', 'refs/heads/featureBranch');
    const branch = new Branch('featureBranch', upstreamBranch, upstreamBranch, true);
    const {commentThreads} = aggregatedReviewsBuilder()
      .addReviewThread(t => {
        t.addComment(c => c.id(0).path('file0.txt').position(2).bodyHTML('one'));
      })
      .addReviewThread(t => {
        t.addComment(c => c.id(1).path('file1.txt').position(15).bodyHTML('two'));
      })
      .addReviewThread(t => {
        t.addComment(c => c.id(2).path('file2.txt').position(7).bodyHTML('three'));
      })
      .addReviewThread(t => {
        t.addComment(c => c.id(3).path('file2.txt').position(10).bodyHTML('four'));
      })
      .build();

    const pr = pullRequestBuilder(pullRequestsQuery)
      .headRefName('featureBranch')
      .headRepository(r => {
        r.owner(o => o.login('owner'));
        r.name('repo');
      }).build();

    const props = {
      relay: {environment: relayEnv},
      pullRequests: [pr],
      repository: {},
      endpoint: getEndpoint('github.com'),
      owner: 'owner',
      repo: 'repo',
      workspace: atomEnv.workspace,
      repoData: {
        branches: new BranchSet([branch]),
        remotes: new RemoteSet([origin]),
        currentRemote: origin,
        workingDirectoryPath: __dirname,
      },
      commentThreads,
      commentTranslations: {
        get: () => {},
      },
      ...override,
    };

    return <BareCommentDecorationsController {...props} />;
  }

  describe('renders EditorCommentDecorationsController and Gutter', function() {
    let editor0, editor1, editor2, wrapper;

    beforeEach(async function() {
      editor0 = await atomEnv.workspace.open(path.join(__dirname, 'file0.txt'));
      editor1 = await atomEnv.workspace.open(path.join(__dirname, 'another-unrelated-file.txt'));
      editor2 = await atomEnv.workspace.open(path.join(__dirname, 'file1.txt'));
      wrapper = mount(buildApp());
    });

    it('a pair per matching opened editor', function() {
      assert.strictEqual(wrapper.find('EditorCommentDecorationsController').length, 2);
      assert.isNotNull(editor0.gutterWithName('github-comment-icon'));
      assert.isNotNull(editor2.gutterWithName('github-comment-icon'));
      assert.isNull(editor1.gutterWithName('github-comment-icon'));
    });

    it('updates its EditorCommentDecorationsController and Gutter children as editor panes get created', async function() {
      editor2 = await atomEnv.workspace.open(path.join(__dirname, 'file2.txt'));
      wrapper.update();

      assert.strictEqual(wrapper.find('EditorCommentDecorationsController').length, 3);
      assert.isNotNull(editor2.gutterWithName('github-comment-icon'));
    });

    it('updates its EditorCommentDecorationsController and Gutter children as editor panes get destroyed', async function() {
      assert.strictEqual(wrapper.find('EditorCommentDecorationsController').length, 2);
      await atomEnv.workspace.getActivePaneItem().destroy();
      wrapper.update();

      assert.strictEqual(wrapper.find('EditorCommentDecorationsController').length, 1);
    });
  });

  describe('returns empty render', function() {
    it('when PR is not checked out', async function() {
      await atomEnv.workspace.open(path.join(__dirname, 'file0.txt'));
      const pr = pullRequestBuilder(pullRequestsQuery)
        .headRefName('wrongBranch')
        .build();
      const wrapper = mount(buildApp({pullRequests: [pr]}));
      assert.isTrue(wrapper.isEmptyRender());
    });

    it('when a repository has been deleted', async function() {
      await atomEnv.workspace.open(path.join(__dirname, 'file0.txt'));
      const pr = pullRequestBuilder(pullRequestsQuery)
        .headRefName('featureBranch')
        .build();
      pr.headRepository = null;
      const wrapper = mount(buildApp({pullRequests: [pr]}));
      assert.isTrue(wrapper.isEmptyRender());
    });

    it('when there is no PR', function() {
      const wrapper = mount(buildApp({pullRequests: []}));
      assert.isTrue(wrapper.isEmptyRender());
    });
  });

});
