import dedent from 'dedent-js';

import UserStore, {NO_REPLY_GITHUB_EMAIL} from '../../lib/models/user-store';

import {cloneRepository, buildRepository, FAKE_USER} from '../helpers';

describe('UserStore', function() {
  it('loads store with users and committer in repo upon construction', async function() {
    const workdirPath = await cloneRepository('multiple-commits');
    const repository = await buildRepository(workdirPath);
    const store = new UserStore({repository});

    assert.deepEqual(store.getUsers(), []);
    assert.deepEqual(store.committer, {});

    // Store is populated asynchronously
    await assert.async.deepEqual(store.getUsers(), [
      {
        email: 'kuychaco@github.com',
        name: 'Katrina Uychaco',
      },
    ]);
    await assert.async.deepEqual(store.committer, FAKE_USER);
  });

  it('excludes committer and no reply user from `getUsers`', async function() {
    const workdirPath = await cloneRepository('multiple-commits');
    const repository = await buildRepository(workdirPath);
    const store = new UserStore({repository});
    await store.loadUsersFromLocalRepo();

    sinon.spy(store, 'addUsers');
    // make a commit with FAKE_USER as committer
    await repository.commit('made a new commit', {allowEmpty: true});
    await assert.async.equal(store.addUsers.callCount, 1);

    // verify that FAKE_USER is in commit history
    const lastCommit = await repository.getLastCommit();
    assert.strictEqual(lastCommit.getAuthorEmail(), FAKE_USER.email);

    // verify that FAKE_USER is not in users returned from `getUsers`
    const users = store.getUsers();
    const committerFromStore = users.find(user => user.email === FAKE_USER.email);
    assert.isUndefined(committerFromStore);

    // verify that no-reply email address is not in users array
    const noReplyUser = users.find(user => user.email === NO_REPLY_GITHUB_EMAIL);
    assert.isUndefined(noReplyUser);
  });

  describe('addUsers', function() {
    it('adds specified users and does not overwrite existing users', async function() {
      const workdirPath = await cloneRepository('multiple-commits');
      const repository = await buildRepository(workdirPath);
      const store = new UserStore({repository});

      await assert.async.lengthOf(store.getUsers(), 1);

      store.addUsers({
        'mona@lisa.com': 'Mona Lisa',
        'hubot@github.com': 'Hubot Robot',
      });

      await assert.async.deepEqual(store.getUsers(), [
        {
          name: 'Hubot Robot',
          email: 'hubot@github.com',
        },
        {
          name: 'Katrina Uychaco',
          email: 'kuychaco@github.com',
        },
        {
          name: 'Mona Lisa',
          email: 'mona@lisa.com',
        },
      ]);
    });
  });

  it('refetches committer when config changes', async function() {
    const workdirPath = await cloneRepository('multiple-commits');
    const repository = await buildRepository(workdirPath);

    const store = new UserStore({repository});
    await assert.async.deepEqual(store.committer, FAKE_USER);

    const newEmail = 'foo@bar.com';
    await repository.setConfig('user.email', newEmail);

    repository.refresh();
    await assert.async.deepEqual(store.committer, {name: FAKE_USER.name, email: newEmail});

    const newName = 'Foo Bar';
    await repository.setConfig('user.name', newName);
    repository.refresh();
    await assert.async.deepEqual(store.committer, {name: newName, email: newEmail});
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
      {
        email: 'kuychaco@github.com',
        name: 'Katrina Uychaco',
      },
    ]);

    sinon.spy(store, 'addUsers');

    // Head changes due to new commit
    await repository.commit(dedent`
      New commit

      Co-authored-by: New Author <new-author@email.com>
    `, {allowEmpty: true});

    await assert.async.equal(store.addUsers.callCount, 1);
    assert.isOk(store.getUsers().find(user => {
      return user.name === 'New Author' && user.email === 'new-author@email.com';
    }));

    // Change head due to branch checkout
    await repository.checkout('new-branch');
    await assert.async.equal(store.addUsers.callCount, 2);
  });
});
