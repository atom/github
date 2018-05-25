import dedent from 'dedent-js';

import UserStore, {source} from '../../lib/models/user-store';
import Author, {nullAuthor} from '../../lib/models/author';
import GithubLoginModel from '../../lib/models/github-login-model';
import {InMemoryStrategy} from '../../lib/shared/keytar-strategy';
import {expectRelayQuery} from '../../lib/relay-network-layer-manager';
import {cloneRepository, buildRepository, FAKE_USER} from '../helpers';

describe('UserStore', function() {
  let login;

  function nextUpdatePromise(store) {
    return new Promise(resolve => {
      const sub = store.onDidUpdate(() => {
        sub.dispose();
        resolve();
      });
    });
  }

  function expectPagedRelayQueries(options, ...pages) {
    const opts = {
      owner: 'me',
      name: 'stuff',
      ...options,
    };

    let lastCursor = null;
    return pages.map((page, index) => {
      const isLast = index === pages.length - 1;
      const nextCursor = isLast ? null : `page-${index + 1}`;

      const result = expectRelayQuery({
        name: 'GetMentionableUsers',
        variables: {owner: opts.owner, name: opts.name, first: 100, after: lastCursor},
      }, {
        repository: {
          mentionableUsers: {
            nodes: page,
            pageInfo: {
              hasNextPage: !isLast,
              endCursor: nextCursor,
            },
          },
        },
      });

      lastCursor = nextCursor;
      return result;
    });
  }

  beforeEach(function() {
    login = new GithubLoginModel(InMemoryStrategy);
    sinon.stub(login, 'getScopes').returns(Promise.resolve(GithubLoginModel.REQUIRED_SCOPES));
  });

  it('loads store with local git users and committer in a repo with no GitHub remote', async function() {
    const workdirPath = await cloneRepository('multiple-commits');
    const repository = await buildRepository(workdirPath);
    const store = new UserStore({repository});

    assert.deepEqual(store.getUsers(), []);
    assert.strictEqual(store.committer, nullAuthor);

    // Store is populated asynchronously
    await nextUpdatePromise(store);
    assert.deepEqual(store.getUsers(), [
      new Author('kuychaco@github.com', 'Katrina Uychaco'),
    ]);
    assert.deepEqual(store.committer, new Author(FAKE_USER.email, FAKE_USER.name));
  });

  it('loads store with mentionable users from the GitHub API in a repo with a GitHub remote', async function() {
    await login.setToken('https://api.github.com', '1234');

    const workdirPath = await cloneRepository('multiple-commits');
    const repository = await buildRepository(workdirPath);

    await repository.setConfig('remote.origin.url', 'git@github.com:me/stuff.git');
    await repository.setConfig('remote.origin.fetch', '+refs/heads/*:refs/remotes/origin/*');
    await repository.setConfig('remote.old.url', 'git@sourceforge.com:me/stuff.git');
    await repository.setConfig('remote.old.fetch', '+refs/heads/*:refs/remotes/old/*');

    const [{resolve}] = expectPagedRelayQueries({}, [
      {login: 'annthurium', email: 'annthurium@github.com', name: 'Tilde Ann Thurium'},
      {login: 'octocat', email: 'mona@lisa.com', name: 'Mona Lisa'},
      {login: 'smashwilson', email: 'smashwilson@github.com', name: 'Ash Wilson'},
    ]);

    const store = new UserStore({repository, login});
    await nextUpdatePromise(store);

    resolve();
    await nextUpdatePromise(store);

    assert.deepEqual(store.getUsers(), [
      new Author('smashwilson@github.com', 'Ash Wilson', 'smashwilson'),
      new Author('mona@lisa.com', 'Mona Lisa', 'octocat'),
      new Author('annthurium@github.com', 'Tilde Ann Thurium', 'annthurium'),
    ]);
  });

  it('loads users from multiple pages from the GitHub API', async function() {
    await login.setToken('https://api.github.com', '1234');

    const workdirPath = await cloneRepository('multiple-commits');
    const repository = await buildRepository(workdirPath);

    await repository.setConfig('remote.origin.url', 'git@github.com:me/stuff.git');
    await repository.setConfig('remote.origin.fetch', '+refs/heads/*:refs/remotes/origin/*');

    const [{resolve: resolve0}, {resolve: resolve1}] = expectPagedRelayQueries({},
      [
        {login: 'annthurium', email: 'annthurium@github.com', name: 'Tilde Ann Thurium'},
        {login: 'octocat', email: 'mona@lisa.com', name: 'Mona Lisa'},
        {login: 'smashwilson', email: 'smashwilson@github.com', name: 'Ash Wilson'},
      ],
      [
        {login: 'zzz', email: 'zzz@github.com', name: 'Zzzzz'},
        {login: 'aaa', email: 'aaa@github.com', name: 'Aahhhhh'},
      ],
    );

    const store = new UserStore({repository, login});

    await nextUpdatePromise(store);
    assert.deepEqual(store.getUsers(), []);

    resolve0();
    await nextUpdatePromise(store);

    assert.deepEqual(store.getUsers(), [
      new Author('smashwilson@github.com', 'Ash Wilson', 'smashwilson'),
      new Author('mona@lisa.com', 'Mona Lisa', 'octocat'),
      new Author('annthurium@github.com', 'Tilde Ann Thurium', 'annthurium'),
    ]);

    resolve1();
    await nextUpdatePromise(store);

    assert.deepEqual(store.getUsers(), [
      new Author('aaa@github.com', 'Aahhhhh', 'aaa'),
      new Author('smashwilson@github.com', 'Ash Wilson', 'smashwilson'),
      new Author('mona@lisa.com', 'Mona Lisa', 'octocat'),
      new Author('annthurium@github.com', 'Tilde Ann Thurium', 'annthurium'),
      new Author('zzz@github.com', 'Zzzzz', 'zzz'),
    ]);
  });

  it('infers no-reply emails for users without a public email address', async function() {
    await login.setToken('https://api.github.com', '1234');

    const workdirPath = await cloneRepository('multiple-commits');
    const repository = await buildRepository(workdirPath);

    await repository.setConfig('remote.origin.url', 'git@github.com:me/stuff.git');
    await repository.setConfig('remote.origin.fetch', '+refs/heads/*:refs/remotes/origin/*');

    const [{resolve}] = expectPagedRelayQueries({}, [
      {login: 'simurai', email: '', name: 'simurai'},
    ]);

    const store = new UserStore({repository, login});
    await nextUpdatePromise(store);

    resolve();
    await nextUpdatePromise(store);

    assert.deepEqual(store.getUsers(), [
      new Author('simurai@users.noreply.github.com', 'simurai', 'simurai'),
    ]);
  });

  it('excludes committer and no reply user from `getUsers`', async function() {
    const workdirPath = await cloneRepository('multiple-commits');
    const repository = await buildRepository(workdirPath);
    const store = new UserStore({repository});
    await assert.async.lengthOf(store.getUsers(), 1);

    sinon.spy(store, 'addUsers');
    // make a commit with FAKE_USER as committer
    await repository.commit('made a new commit', {allowEmpty: true});
    await assert.async.equal(store.addUsers.callCount, 1);

    // verify that FAKE_USER is in commit history
    const lastCommit = await repository.getLastCommit();
    assert.strictEqual(lastCommit.getAuthorEmail(), FAKE_USER.email);

    // verify that FAKE_USER is not in users returned from `getUsers`
    const users = store.getUsers();
    assert.isFalse(users.some(user => user.getEmail() === FAKE_USER.email));

    // verify that no-reply email address is not in users array
    assert.isFalse(users.some(user => user.isNoReply()));
  });

  describe('addUsers', function() {
    it('adds specified users and does not overwrite existing users', async function() {
      const workdirPath = await cloneRepository('multiple-commits');
      const repository = await buildRepository(workdirPath);
      const store = new UserStore({repository});
      await nextUpdatePromise(store);

      assert.lengthOf(store.getUsers(), 1);

      store.addUsers([
        new Author('mona@lisa.com', 'Mona Lisa'),
        new Author('hubot@github.com', 'Hubot Robot'),
      ], source.GITLOG);

      assert.deepEqual(store.getUsers(), [
        new Author('hubot@github.com', 'Hubot Robot'),
        new Author('kuychaco@github.com', 'Katrina Uychaco'),
        new Author('mona@lisa.com', 'Mona Lisa'),
      ]);
    });
  });

  it('refetches committer when config changes', async function() {
    const workdirPath = await cloneRepository('multiple-commits');
    const repository = await buildRepository(workdirPath);

    const store = new UserStore({repository});
    await nextUpdatePromise(store);
    assert.deepEqual(store.committer, new Author(FAKE_USER.email, FAKE_USER.name));

    const newEmail = 'foo@bar.com';
    const newName = 'Foo Bar';

    await repository.setConfig('user.email', newEmail);
    await repository.setConfig('user.name', newName);
    repository.refresh();
    await nextUpdatePromise(store);

    assert.deepEqual(store.committer, new Author(newEmail, newName));
  });

  it('refetches users when HEAD changes', async function() {
    const workdirPath = await cloneRepository('multiple-commits');
    const repository = await buildRepository(workdirPath);
    await repository.checkout('new-branch', {createNew: true});
    await repository.commit('commit 1', {allowEmpty: true});
    await repository.commit('commit 2', {allowEmpty: true});
    await repository.checkout('master');

    const store = new UserStore({repository});
    await nextUpdatePromise(store);
    assert.deepEqual(store.getUsers(), [
      new Author('kuychaco@github.com', 'Katrina Uychaco'),
    ]);

    sinon.spy(store, 'addUsers');

    // Head changes due to new commit
    await repository.commit(dedent`
      New commit

      Co-authored-by: New Author <new-author@email.com>
    `, {allowEmpty: true});

    repository.refresh();
    await nextUpdatePromise(store);

    await assert.strictEqual(store.addUsers.callCount, 1);
    assert.isTrue(store.getUsers().some(user => {
      return user.getFullName() === 'New Author' && user.getEmail() === 'new-author@email.com';
    }));

    // Change head due to branch checkout
    await repository.checkout('new-branch');
    repository.refresh();

    await assert.async.strictEqual(store.addUsers.callCount, 2);
  });

  it('refetches users when a token becomes available', async function() {
    const workdirPath = await cloneRepository('multiple-commits');
    const repository = await buildRepository(workdirPath);

    const gitAuthors = [
      new Author('kuychaco@github.com', 'Katrina Uychaco'),
    ];

    const graphqlAuthors = [
      new Author('smashwilson@github.com', 'Ash Wilson', 'smashwilson'),
      new Author('mona@lisa.com', 'Mona Lisa', 'octocat'),
      new Author('annthurium@github.com', 'Tilde Ann Thurium', 'annthurium'),
    ];

    const [{resolve}] = expectPagedRelayQueries({}, [
      {login: 'annthurium', email: 'annthurium@github.com', name: 'Tilde Ann Thurium'},
      {login: 'octocat', email: 'mona@lisa.com', name: 'Mona Lisa'},
      {login: 'smashwilson', email: 'smashwilson@github.com', name: 'Ash Wilson'},
    ]);
    resolve();

    const store = new UserStore({repository, login});
    await nextUpdatePromise(store);

    assert.deepEqual(store.getUsers(), gitAuthors);

    await repository.setConfig('remote.origin.url', 'git@github.com:me/stuff.git');
    await repository.setConfig('remote.origin.fetch', '+refs/heads/*:refs/remotes/origin/*');

    repository.refresh();

    // Token is not available, so authors are still queried from git
    assert.deepEqual(store.getUsers(), gitAuthors);

    await login.setToken('https://api.github.com', '1234');

    await nextUpdatePromise(store);
    assert.deepEqual(store.getUsers(), graphqlAuthors);
  });

  it('refetches users when the repository changes', async function() {
    const workdirPath0 = await cloneRepository('multiple-commits');
    const repository0 = await buildRepository(workdirPath0);
    await repository0.setConfig('user.email', 'committer0@github.com');
    await repository0.setConfig('user.name', 'committer0');
    await repository0.commit('on repo 0', {allowEmpty: true});
    await repository0.setConfig('user.email', 'committer@github.com');
    await repository0.setConfig('user.name', 'committer');

    const workdirPath1 = await cloneRepository('multiple-commits');
    const repository1 = await buildRepository(workdirPath1);
    await repository1.setConfig('user.email', 'committer1@github.com');
    await repository1.setConfig('user.name', 'committer1');
    await repository1.commit('on repo 1', {allowEmpty: true});
    await repository1.setConfig('user.email', 'committer@github.com');
    await repository1.setConfig('user.name', 'committer');

    const store = new UserStore({repository: repository0});
    await nextUpdatePromise(store);

    assert.deepEqual(store.getUsers(), [
      new Author('kuychaco@github.com', 'Katrina Uychaco'),
      new Author('committer0@github.com', 'committer0'),
    ]);

    store.setRepository(repository1);
    await nextUpdatePromise(store);

    assert.deepEqual(store.getUsers(), [
      new Author('kuychaco@github.com', 'Katrina Uychaco'),
      new Author('committer1@github.com', 'committer1'),
    ]);
  });

  describe('GraphQL response caching', function() {
    it('caches mentionable users acquired from GraphQL', async function() {
      await login.setToken('https://api.github.com', '1234');

      const workdirPath = await cloneRepository('multiple-commits');
      const repository = await buildRepository(workdirPath);

      await repository.setConfig('remote.origin.url', 'git@github.com:me/stuff.git');
      await repository.setConfig('remote.origin.fetch', '+refs/heads/*:refs/remotes/origin/*');

      const [{resolve, disable}] = expectPagedRelayQueries({}, [
        {login: 'annthurium', email: 'annthurium@github.com', name: 'Tilde Ann Thurium'},
        {login: 'octocat', email: 'mona@lisa.com', name: 'Mona Lisa'},
        {login: 'smashwilson', email: 'smashwilson@github.com', name: 'Ash Wilson'},
      ]);
      resolve();

      const store = new UserStore({repository, login});
      sinon.spy(store, 'loadUsers');

      // The first update is triggered by the commiter, the second from GraphQL results arriving.
      await nextUpdatePromise(store);
      await nextUpdatePromise(store);

      disable();

      repository.refresh();

      await assert.async.strictEqual(store.loadUsers.callCount, 2);
      await store.loadUsers.returnValues[1];

      assert.deepEqual(store.getUsers(), [
        new Author('smashwilson@github.com', 'Ash Wilson', 'smashwilson'),
        new Author('mona@lisa.com', 'Mona Lisa', 'octocat'),
        new Author('annthurium@github.com', 'Tilde Ann Thurium', 'annthurium'),
      ]);
    });

    it('re-uses cached users per repository', async function() {
      await login.setToken('https://api.github.com', '1234');

      const workdirPath0 = await cloneRepository('multiple-commits');
      const repository0 = await buildRepository(workdirPath0);
      await repository0.setConfig('remote.origin.url', 'git@github.com:me/zero.git');
      await repository0.setConfig('remote.origin.fetch', '+refs/heads/*:refs/remotes/origin/*');

      const workdirPath1 = await cloneRepository('multiple-commits');
      const repository1 = await buildRepository(workdirPath1);
      await repository1.setConfig('remote.origin.url', 'git@github.com:me/one.git');
      await repository1.setConfig('remote.origin.fetch', '+refs/heads/*:refs/remotes/origin/*');

      const results = id => [
        {login: 'aaa', email: `aaa-${id}@a.com`, name: 'AAA'},
        {login: 'bbb', email: `bbb-${id}@b.com`, name: 'BBB'},
        {login: 'ccc', email: `ccc-${id}@c.com`, name: 'CCC'},
      ];
      const [{resolve: resolve0, disable: disable0}] = expectPagedRelayQueries({name: 'zero'}, results('0'));
      const [{resolve: resolve1, disable: disable1}] = expectPagedRelayQueries({name: 'one'}, results('1'));
      resolve0();
      resolve1();

      const store = new UserStore({repository: repository0, login});
      await nextUpdatePromise(store);
      await nextUpdatePromise(store);

      store.setRepository(repository1);
      await nextUpdatePromise(store);

      sinon.spy(store, 'loadUsers');
      disable0();
      disable1();

      store.setRepository(repository0);
      await nextUpdatePromise(store);

      assert.deepEqual(store.getUsers(), [
        new Author('aaa-0@a.com', 'AAA', 'aaa'),
        new Author('bbb-0@b.com', 'BBB', 'bbb'),
        new Author('ccc-0@c.com', 'CCC', 'ccc'),
      ]);
    });
  });
});
