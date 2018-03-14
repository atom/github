import UserStore from '../../lib/models/user-store';

describe('UserStore', function() {
  describe('populate', function() {
    it('loads store with users in repo', async function() {
      const repo = await buildRepository('three-files');
      const store = new UserStore({repository: repo});
      await store.populate();
    })
  })

  describe('addUsers', function() {
    it('adds specified user', function() {

    })
  })
  it('', async function() {
    const rawUsers = {
      'kuychaco@github.com': 'Katrina Uychaco',
      'smashwilson@github.com': 'Ash Wilson'
    }


    const store = new UserStore()
    store.addUsers(rawUsers)
    const users = store.getUsers()
    assert.deepEqual(users, {
      'kuychaco@github.com': {
        name: 'Katrina Uychaco',
        emails: ['kuychaco@github.com'], // for mailmap support
        github: {
          handle: '@kuychaco',
          avatarUrl: 'githubusercontent...'
        }
      }
    })
  })
})

/*

const repo = await buildRepository('three-files');
const store = new UserStore({repository: repo});
await store.populate();

// User:

class User {
  constructor ({email, fullname, githubLogin}) {
    //
  }

  isGitHubUser() {
    return !!this.githubLogin;
  }

  displayName() {
    if (this.githubLogin) {
      return `@${this.githubLogin}`
    } else {
      return `${this.name} <${this.email}>`
    }
  }

  coAuthorTrailer() {
    return `Co-authored-by: ${this.email}`
  }
}

// UserStore:

class UserStore {
  constructor ({repository}) {
    this.repository = repository
  }

  populate () {
    this.repository.onDidChangeState(({oldState, newState}) => {
      if (!oldState.isLoading() && newState.isPresent()) {
        this.kickOffLocalShit();
      }
    }
    })
  }

  addUsersFromGraphQL(response) {
    // gets called in query renderer callback
    this.addMentionable();
  }

  async kickOffGraphQLShit() {
    // Find GitHub repo(s) from remotes
    // Hit GraphQL API
    this.addMentionable(username);
  }

  async kickOffLocalShit() {
    // Run git commands to get authors/committers
    this.addMentionable(username);
  }

  mentionableUsers() {
    // returns [User]
  }
}
}

*/
