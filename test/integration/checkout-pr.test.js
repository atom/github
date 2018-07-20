import hock from 'hock';
import http from 'http';

import {setup, teardown} from './helpers';
import {expectRelayQuery} from '../../lib/relay-network-layer-manager';
import GitShellOutStrategy from '../../lib/git-shell-out-strategy';
import {createRepositoryResult} from '../fixtures/factories/repository-result';
import IDGenerator from '../fixtures/factories/id-generator';
import {createPullRequestsResult, createPullRequestDetailResult} from '../fixtures/factories/pull-request-result';

describe('check out a pull request', function() {
  let context, wrapper, atomEnv, workspaceElement, git, idGen, repositoryID;

  beforeEach(async function() {
    context = await setup(this.currentTest, {
      initialRoots: ['three-files'],
    });
    wrapper = context.wrapper;
    atomEnv = context.atomEnv;
    workspaceElement = context.workspaceElement;
    idGen = new IDGenerator();
    repositoryID = idGen.generate('repository');

    await context.loginModel.setToken('https://api.github.com', 'good-token');

    const root = atomEnv.project.getPaths()[0];
    git = new GitShellOutStrategy(root);
    await git.exec(['remote', 'add', 'dotcom', 'https://github.com/owner/repo.git']);

    const mockGitServer = hock.createHock();

    const uploadPackAdvertisement = '001e# service=git-upload-pack\n' +
      '0000' +
      '005b66d11860af6d28eb38349ef83de475597cb0e8b4 HEAD\0multi_ack symref=HEAD:refs/heads/pr-head\n' +
      '004066d11860af6d28eb38349ef83de475597cb0e8b4 refs/heads/pr-head\n' +
      '0000';

    mockGitServer
      .get('/owner/repo.git/info/refs?service=git-upload-pack')
      .reply(200, uploadPackAdvertisement, {'Content-Type': 'application/x-git-upload-pack-advertisement'})
      .get('/owner/repo.git/info/refs?service=git-upload-pack')
      .reply(400);

    const server = http.createServer(mockGitServer.handler);
    return new Promise(resolve => {
      server.listen(0, '127.0.0.1', async () => {
        const {address, port} = server.address();
        await git.setConfig(`url.http://${address}:${port}/.insteadOf`, 'https://github.com/');

        resolve();
      });
    });
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
      repository: createRepositoryResult({id: repositoryID}),
    });
  }

  function expectCurrentPullRequestQuery() {
    return expectRelayQuery({
      name: 'currentPullRequestContainerQuery',
      variables: {
        headOwner: 'owner',
        headName: 'repo',
        headRef: 'refs/heads/pr-head',
        first: 5,
      },
    }, {
      repository: {
        id: repositoryID,
        ref: {
          id: idGen.generate('ref'),
          associatedPullRequests: {
            totalCount: 0,
            nodes: [],
          },
        },
      },
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
        id: repositoryID,
        name: 'repo',
        owner: {
          __typename: 'User',
          id: 'user0',
          login: 'owner',
        },
        issueish: createPullRequestDetailResult({
          number: 1,
          title: 'Pull Request 1',
          headRefName: 'pr-head',
          headRepositoryName: 'repo',
          headRepositoryLogin: 'owner',
        }),
      },
    };

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

    const {resolve: resolve4, promise: promise4} = expectCurrentPullRequestQuery();
    resolve4();
    await promise4;

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

    // Click on the "Checkout" button
    await wrapper.find('.github-IssueishDetailView-checkoutButton').prop('onClick')();

    // Ensure that the correct ref has been fetched and checked out
    const branches = await git.getBranches();
    const head = branches.find(b => b.head);
    assert.strictEqual(head.name, 'pr-1/owner/pr-head');

    await assert.async.isTrue(wrapper.update().find('.github-IssueishDetailView-checkoutButton--current').exists());
  });
});
