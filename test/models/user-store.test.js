import dedent from 'dedent-js'

import UserStore from '../../lib/models/user-store';

import {cloneRepository, buildRepository} from '../helpers';

describe('UserStore', function() {
  it('loads store with users in repo upon construction', async function() {
    const workdirPath = await cloneRepository('multiple-commits');
    const repository = await buildRepository(workdirPath);
    const store = new UserStore({repository});

    assert.deepEqual(store.getUsers(), []);

    // Store is populated asynchronously
    await assert.async.deepEqual(store.getUsers(), [
      {
        email: 'kuychaco@github.com',
        name: 'Katrina Uychaco',
      },
    ]);
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

    sinon.spy(store, 'addUsers')

    // Head changes due to new commit
    await repository.commit(dedent`
      New commit

      Co-authored-by: New Author <new-author@email.com>
    `, {allowEmpty: true});

    await assert.async.equal(store.addUsers.callCount, 1)
    assert.isOk(store.getUsers().find(user => {
      return user.name === 'New Author' && user.email === 'new-author@email.com';
    }));

    // Change head due to branch checkout
    await repository.checkout('new-branch')
    await assert.async.equal(store.addUsers.callCount, 2)
  });
});
