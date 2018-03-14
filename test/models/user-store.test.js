import UserStore from '../../lib/models/user-store';

import {cloneRepository, buildRepository} from '../helpers';

describe('UserStore', function() {
  describe('populate', function() {
    it('loads store with users in repo', async function() {
      const workdirPath = await cloneRepository('multiple-commits');
      const repository = await buildRepository(workdirPath);
      const store = new UserStore({repository});

      assert.deepEqual(store.getUsers(), []);

      await store.populate();
      const users = store.getUsers();
      assert.deepEqual(users, [
        {
          email: 'kuychaco@github.com',
          name: 'Katrina Uychaco',
        },
      ]);
    });
  });

  describe('addUsers', function() {
    it('adds specified user', async function() {
      const workdirPath = await cloneRepository('multiple-commits');
      const repository = await buildRepository(workdirPath);
      const store = new UserStore({repository});

      await store.populate();
      store.addUsers({
        'mona@lisa.com': 'Mona Lisa',
        'hubot@github.com': 'Hubot Robot',
      });

      assert.deepEqual(store.getUsers(), [
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
});
