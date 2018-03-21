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
    it('adds specified user', async function() {
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
});
