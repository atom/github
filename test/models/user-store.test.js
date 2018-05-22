import dedent from 'dedent-js';

import UserStore from '../../lib/models/user-store';
import Author, {nullAuthor} from '../../lib/models/author';
import RelayNetworkLayerManager, {expectRelayQuery} from '../../lib/relay-network-layer-manager';
import {cloneRepository, buildRepository, FAKE_USER} from '../helpers';

describe('UserStore', function() {
  it('loads store with local git users and committer in a repo with no GitHub remote', async function() {
    const workdirPath = await cloneRepository('multiple-commits');
    const repository = await buildRepository(workdirPath);
    const store = new UserStore({repository});

    assert.deepEqual(store.getUsers(), []);
    assert.strictEqual(store.committer, nullAuthor);

    // Store is populated asynchronously
    await assert.async.deepEqual(store.getUsers(), [
      new Author('kuychaco@github.com', 'Katrina Uychaco'),
    ]);
    await assert.async.deepEqual(store.committer, new Author(FAKE_USER.email, FAKE_USER.name));
  });

  it('loads store with mentionable users from the GitHub API in a repo with a GitHub remote', async function() {
    RelayNetworkLayerManager.getEnvironmentForHost('https://api.github.com', '1234');

    const workdirPath = await cloneRepository('multiple-commits');
    const repository = await buildRepository(workdirPath);

    await repository.setConfig('remote.origin.url', 'git@github.com:me/stuff.git');
    await repository.setConfig('remote.origin.fetch', '+refs/heads/*:refs/remotes/origin/*');
    await repository.setConfig('remote.old.url', 'git@sourceforge.com:me/stuff.git');
    await repository.setConfig('remote.old.fetch', '+refs/heads/*:refs/remotes/old/*');

    const {resolve} = expectRelayQuery({
      name: 'GetMentionableUsers',
      variables: {owner: 'me', name: 'stuff', first: 100, after: null},
    }, {
      repository: {
        mentionableUsers: {
          nodes: [
            {login: 'annthurium', email: 'annthurium@github.com', name: 'Tilde Ann Thurium'},
            {login: 'octocat', email: 'mona@lisa.com', name: 'Mona Lisa'},
            {login: 'smashwilson', email: 'smashwilson@github.com', name: 'Ash Wilson'},
          ],
          pageInfo: {
            hasNextPage: false,
            endCursor: null,
          },
        },
      },
    });

    const store = new UserStore({repository});
    assert.deepEqual(store.getUsers(), []);

    resolve();

    await assert.async.deepEqual(store.getUsers(), [
      new Author('smashwilson@github.com', 'Ash Wilson', 'smashwilson'),
      new Author('mona@lisa.com', 'Mona Lisa', 'octocat'),
      new Author('annthurium@github.com', 'Tilde Ann Thurium', 'annthurium'),
    ]);
  });

  it('loads users from multiple pages from the GitHub API', async function() {
    RelayNetworkLayerManager.getEnvironmentForHost('https://api.github.com', '1234');

    const workdirPath = await cloneRepository('multiple-commits');
    const repository = await buildRepository(workdirPath);

    await repository.setConfig('remote.origin.url', 'git@github.com:me/stuff.git');
    await repository.setConfig('remote.origin.fetch', '+refs/heads/*:refs/remotes/origin/*');

    const {resolve: resolve0} = expectRelayQuery({
      name: 'GetMentionableUsers',
      variables: {owner: 'me', name: 'stuff', first: 100, after: null},
    }, {
      repository: {
        mentionableUsers: {
          nodes: [
            {login: 'annthurium', email: 'annthurium@github.com', name: 'Tilde Ann Thurium'},
            {login: 'octocat', email: 'mona@lisa.com', name: 'Mona Lisa'},
            {login: 'smashwilson', email: 'smashwilson@github.com', name: 'Ash Wilson'},
          ],
          pageInfo: {
            hasNextPage: true,
            endCursor: 'foo',
          },
        },
      },
    });

    const {resolve: resolve1} = expectRelayQuery({
      name: 'GetMentionableUsers',
      variables: {owner: 'me', name: 'stuff', first: 100, after: 'foo'},
    }, {
      repository: {
        mentionableUsers: {
          nodes: [
            {login: 'zzz', email: 'zzz@github.com', name: 'Zzzzz'},
            {login: 'aaa', email: 'aaa@github.com', name: 'Aahhhhh'},
          ],
          pageInfo: {
            hasNextPage: false,
            endCursor: 'bar',
          },
        },
      },
    });

    const store = new UserStore({repository});
    assert.deepEqual(store.getUsers(), []);

    resolve0();
    await assert.async.deepEqual(store.getUsers(), [
      new Author('smashwilson@github.com', 'Ash Wilson', 'smashwilson'),
      new Author('mona@lisa.com', 'Mona Lisa', 'octocat'),
      new Author('annthurium@github.com', 'Tilde Ann Thurium', 'annthurium'),
    ]);

    resolve1();
    await assert.async.deepEqual(store.getUsers(), [
      new Author('aaa@github.com', 'Aahhhhh', 'aaa'),
      new Author('smashwilson@github.com', 'Ash Wilson', 'smashwilson'),
      new Author('mona@lisa.com', 'Mona Lisa', 'octocat'),
      new Author('annthurium@github.com', 'Tilde Ann Thurium', 'annthurium'),
      new Author('zzz@github.com', 'Zzzzz', 'zzz'),
    ]);
  });

  it('infers no-reply emails for users without a public email address', async function() {
    RelayNetworkLayerManager.getEnvironmentForHost('https://api.github.com', '1234');

    const workdirPath = await cloneRepository('multiple-commits');
    const repository = await buildRepository(workdirPath);

    await repository.setConfig('remote.origin.url', 'git@github.com:me/stuff.git');
    await repository.setConfig('remote.origin.fetch', '+refs/heads/*:refs/remotes/origin/*');

    const {resolve} = expectRelayQuery({
      name: 'GetMentionableUsers',
      variables: {owner: 'me', name: 'stuff', first: 100, after: null},
    }, {
      repository: {
        mentionableUsers: {
          nodes: [
            {login: 'simurai', email: '', name: 'simurai'},
          ],
          pageInfo: {
            hasNextPage: false,
            endCursor: null,
          },
        },
      },
    });

    const store = new UserStore({repository});

    resolve();
    await assert.async.deepEqual(store.getUsers(), [
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

      await assert.async.lengthOf(store.getUsers(), 1);

      store.addUsers([
        new Author('mona@lisa.com', 'Mona Lisa'),
        new Author('hubot@github.com', 'Hubot Robot'),
      ]);

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
    await assert.async.deepEqual(store.committer, new Author(FAKE_USER.email, FAKE_USER.name));

    const newEmail = 'foo@bar.com';
    await repository.setConfig('user.email', newEmail);

    repository.refresh();
    await assert.async.deepEqual(store.committer, new Author(FAKE_USER.email, FAKE_USER.name));

    const newName = 'Foo Bar';
    await repository.setConfig('user.name', newName);
    repository.refresh();
    await assert.async.deepEqual(store.committer, new Author(newEmail, newName));
  });

  it('refetches users when HEAD changes', async function() {
    const workdirPath = await cloneRepository('multiple-commits');
    const repository = await buildRepository(workdirPath);
    await repository.checkout('new-branch', {createNew: true});
    await repository.commit('commit 1', {allowEmpty: true});
    await repository.commit('commit 2', {allowEmpty: true});
    await repository.checkout('master');

    const store = new UserStore({repository});
    await assert.async.deepEqual(store.getUsers(), [
      new Author('kuychaco@github.com', 'Katrina Uychaco'),
    ]);

    sinon.spy(store, 'addUsers');

    // Head changes due to new commit
    await repository.commit(dedent`
      New commit

      Co-authored-by: New Author <new-author@email.com>
    `, {allowEmpty: true});

    await assert.async.equal(store.addUsers.callCount, 1);
    assert.isTrue(store.getUsers().some(user => {
      return user.getFullName() === 'New Author' && user.getEmail() === 'new-author@email.com';
    }));

    // Change head due to branch checkout
    await repository.checkout('new-branch');
    await assert.async.equal(store.addUsers.callCount, 2);
  });
});
