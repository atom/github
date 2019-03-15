import React from 'react';
import {shallow} from 'enzyme';

import ReviewsController from '../../lib/controllers/reviews-controller';
import PullRequestCheckoutController from '../../lib/controllers/pr-checkout-controller';
import ReviewsView from '../../lib/views/reviews-view';
import IssueishDetailItem from '../../lib/items/issueish-detail-item';
import BranchSet from '../../lib/models/branch-set';
import RemoteSet from '../../lib/models/remote-set';
import EnableableOperation from '../../lib/models/enableable-operation';
import WorkdirContextPool from '../../lib/models/workdir-context-pool';
import {getEndpoint} from '../../lib/models/endpoint';
import {cloneRepository, buildRepository, registerGitHubOpener} from '../helpers';
import {multiFilePatchBuilder} from '../builder/patch';

describe('ReviewsController', function() {
  let atomEnv, localRepository, noop;

  beforeEach(async function() {
    atomEnv = global.buildAtomEnvironment();
    registerGitHubOpener(atomEnv);

    localRepository = await buildRepository(await cloneRepository());

    noop = new EnableableOperation(() => {});
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function buildApp(override = {}) {
    const props = {
      repository: {
        pullRequest: {},
      },

      workdirContextPool: new WorkdirContextPool(),
      localRepository,
      isAbsent: false,
      isLoading: false,
      isPresent: true,
      isMerging: true,
      isRebasing: true,
      branches: new BranchSet(),
      remotes: new RemoteSet(),
      multiFilePatch: multiFilePatchBuilder().build(),

      endpoint: getEndpoint('github.com'),

      owner: 'atom',
      repo: 'github',
      number: 1995,
      workdir: localRepository.getWorkingDirectoryPath(),

      workspace: atomEnv.workspace,
      config: atomEnv.config,
      commands: atomEnv.commands,
      tooltips: atomEnv.tooltips,

      ...override,
    };

    return <ReviewsController {...props} />;
  }

  it('renders a ReviewsView inside a PullRequestCheckoutController', function() {
    const extra = Symbol('extra');
    const wrapper = shallow(buildApp({extra}));
    const opWrapper = wrapper.find(PullRequestCheckoutController).renderProp('children')(noop);

    assert.strictEqual(opWrapper.find(ReviewsView).prop('extra'), extra);
  });

  describe('switchToIssueish', function() {
    it('opens an IssueishDetailItem for a different issueish', async function() {
      const wrapper = shallow(buildApp({
        endpoint: getEndpoint('github.enterprise.horse'),
      }));
      const opWrapper = wrapper.find(PullRequestCheckoutController).renderProp('children')(noop);
      await opWrapper.find(ReviewsView).prop('switchToIssueish')('owner', 'repo', 10);

      assert.include(
        atomEnv.workspace.getPaneItems().map(item => item.getURI()),
        IssueishDetailItem.buildURI('github.enterprise.horse', 'owner', 'repo', 10, null),
      );
    });

    it('locates a resident Repository in the context pool if exactly one is available', async function() {
      const workdirContextPool = new WorkdirContextPool();

      const otherDir = await cloneRepository();
      const otherRepo = workdirContextPool.add(otherDir).getRepository();
      await otherRepo.getLoadPromise();
      await otherRepo.addRemote('up', 'git@github.com:owner/repo.git');

      const wrapper = shallow(buildApp({
        endpoint: getEndpoint('github.com'),
        workdirContextPool,
      }));
      const opWrapper = wrapper.find(PullRequestCheckoutController).renderProp('children')(noop);
      await opWrapper.find(ReviewsView).prop('switchToIssueish')('owner', 'repo', 10);

      assert.include(
        atomEnv.workspace.getPaneItems().map(item => item.getURI()),
        IssueishDetailItem.buildURI('github.com', 'owner', 'repo', 10, otherDir),
      );
    });

    it('prefers the current Repository if it matches', async function() {
      const workdirContextPool = new WorkdirContextPool();

      const currentDir = await cloneRepository();
      const currentRepo = workdirContextPool.add(currentDir).getRepository();
      await currentRepo.getLoadPromise();
      await currentRepo.addRemote('up', 'git@github.com:owner/repo.git');

      const otherDir = await cloneRepository();
      const otherRepo = workdirContextPool.add(otherDir).getRepository();
      await otherRepo.getLoadPromise();
      await otherRepo.addRemote('up', 'git@github.com:owner/repo.git');

      const wrapper = shallow(buildApp({
        endpoint: getEndpoint('github.com'),
        workdirContextPool,
        localRepository: currentRepo,
      }));

      const opWrapper = wrapper.find(PullRequestCheckoutController).renderProp('children')(noop);
      await opWrapper.find(ReviewsView).prop('switchToIssueish')('owner', 'repo', 10);

      assert.include(
        atomEnv.workspace.getPaneItems().map(item => item.getURI()),
        IssueishDetailItem.buildURI('github.com', 'owner', 'repo', 10, currentDir),
      );
    });
  });

  describe('context lines', function() {
    it('defaults to 4 lines of context', function() {
      const wrapper = shallow(buildApp());
      const opWrapper = wrapper.find(PullRequestCheckoutController).renderProp('children')(noop);

      assert.strictEqual(opWrapper.find(ReviewsView).prop('contextLines'), 4);
    });

    it('increases context lines with moreContext', function() {
      const wrapper = shallow(buildApp());
      const opWrapper0 = wrapper.find(PullRequestCheckoutController).renderProp('children')(noop);

      opWrapper0.find(ReviewsView).prop('moreContext')();

      const opWrapper1 = wrapper.find(PullRequestCheckoutController).renderProp('children')(noop);
      assert.strictEqual(opWrapper1.find(ReviewsView).prop('contextLines'), 5);
    });

    it('decreases context lines with lessContext', function() {
      const wrapper = shallow(buildApp());
      const opWrapper0 = wrapper.find(PullRequestCheckoutController).renderProp('children')(noop);

      opWrapper0.find(ReviewsView).prop('lessContext')();

      const opWrapper1 = wrapper.find(PullRequestCheckoutController).renderProp('children')(noop);
      assert.strictEqual(opWrapper1.find(ReviewsView).prop('contextLines'), 3);
    });

    it('ensures that at least one context line is present', function() {
      const wrapper = shallow(buildApp());
      const opWrapper0 = wrapper.find(PullRequestCheckoutController).renderProp('children')(noop);

      for (let i = 0; i < 3; i++) {
        opWrapper0.find(ReviewsView).prop('lessContext')();
      }

      const opWrapper1 = wrapper.find(PullRequestCheckoutController).renderProp('children')(noop);
      assert.strictEqual(opWrapper1.find(ReviewsView).prop('contextLines'), 1);

      opWrapper1.find(ReviewsView).prop('lessContext')();

      const opWrapper2 = wrapper.find(PullRequestCheckoutController).renderProp('children')(noop);
      assert.strictEqual(opWrapper2.find(ReviewsView).prop('contextLines'), 1);
    });
  });
});
