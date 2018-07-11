import {setup, teardown} from './helpers';
import {expectRelayQuery} from '../../lib/relay-network-layer-manager';
import GitShellOutStrategy from '../../lib/git-shell-out-strategy';
import {createRepositoryResult} from '../fixtures/factories/repository-result';
import {createPullRequestsResult, createPullRequestDetailResult} from '../fixtures/factories/pull-request-result';

describe('viewing an issue or pull request', function() {
  let context, wrapper, atomEnv, workspaceElement;

  beforeEach(async function() {
    context = await setup(this.currentTest, {
      initialRoots: ['three-files'],
    });
    wrapper = context.wrapper;
    atomEnv = context.atomEnv;
    workspaceElement = context.workspaceElement;

    await context.loginModel.setToken('https://api.github.com', 'good-token');

    const root = atomEnv.project.getPaths()[0];
    const git = new GitShellOutStrategy(root);
    await git.exec(['remote', 'add', 'dotcom', 'git@github.com:owner/repo.git']);
  });

  afterEach(async function() {
    await teardown(context);
  });

  function expectRepositoryQuery() {
    return expectRelayQuery({
      name: 'remoteContainerQuery',
      variables: {
        owner: 'owner',
        name: 'repo',
      },
    }, {
      repository: createRepositoryResult(),
    });
  }

  function expectIssueishSearchQuery() {
    return expectRelayQuery({
      name: 'issueishSearchContainerQuery',
      variables: {
        query: 'repo:owner/repo type:pr state:open',
        first: 20,
      },
    }, {
      search: {
        issueCount: 10,
        nodes: createPullRequestsResult(
          {number: 0},
          {number: 1},
          {number: 2},
        ),
      },
    });
  }

  function expectIssueishDetailQuery() {
    const result = {
      repository: {
        id: 'repository0',
        name: 'repo',
        owner: {
          __typename: 'User',
          id: 'user0',
          login: 'owner',
        },
        issueish: createPullRequestDetailResult({
          number: 1,
          title: 'Pull Request 1',
        }),
      },
    };

    // console.log(result);

    return expectRelayQuery({
      name: 'issueishDetailContainerQuery',
      variables: {
        repoOwner: 'owner',
        repoName: 'repo',
        issueishNumber: 1,
        timelineCount: 100,
        timelineCursor: null,
      },
    }, result);
  }

  function expectMentionableUsersQuery() {
    return expectRelayQuery({
      name: 'GetMentionableUsers',
      variables: {
        owner: 'owner',
        name: 'repo',
        first: 100,
        after: null,
      },
    }, {
      repository: {
        mentionableUsers: {
          nodes: [{login: 'smashwilson', email: 'smashwilson@github.com', name: 'Me'}],
          pageInfo: {hasNextPage: false, endCursor: 'zzz'},
        },
      },
    });
  }

  it('opens a pane item for a pull request by clicking on an entry in the GitHub tab', async function() {
    const {resolve: resolve0, promise: promise0} = expectRepositoryQuery();
    resolve0();
    await promise0;

    const {resolve: resolve1, promise: promise1} = expectIssueishSearchQuery();
    resolve1();
    await promise1;

    const {resolve: resolve2, promise: promise2} = expectIssueishDetailQuery();
    resolve2();
    await promise2;

    const {resolve: resolve3, promise: promise3} = expectMentionableUsersQuery();
    resolve3();
    await promise3;

    // Open the GitHub tab and wait for results to be rendered
    await atomEnv.commands.dispatch(workspaceElement, 'github:toggle-github-tab');
    await assert.async.isTrue(wrapper.update().find('.github-IssueishList-item').exists());

    // Click on PR #1
    const prOne = wrapper.find('.github-Accordion-listItem').filterWhere(li => {
      return li.find('.github-IssueishList-item--number').text() === '#1';
    });
    prOne.simulate('click');

    // Wait for the pane item to open and fetch
    await assert.async.include(
      atomEnv.workspace.getActivePaneItem().getTitle(),
      'PR: owner/repo#1 — Pull Request 1',
    );

    assert.strictEqual(wrapper.update().find('.github-IssueishDetailView-title').text(), 'Pull Request 1');
  });
});
