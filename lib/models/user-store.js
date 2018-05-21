import RelayNetworkLayerManager from '../relay-network-layer-manager';

// This is a guess about what a reasonable value is. Can adjust if performance is poor.
const MAX_COMMITS = 5000;

export const NO_REPLY_GITHUB_EMAIL = 'noreply@github.com';

export default class UserStore {
  constructor({repository, onDidUpdate}) {
    this.repository = repository;
    this.repository.onDidUpdate(() => {
      this.loadUsers();
    });
    this.onDidUpdate = onDidUpdate || (() => {});
    // TODO: [ku 3/2018] Consider using Dexie (indexDB wrapper) like Desktop and persist users across sessions
    this.users = {};
    this.committer = {};
    this.populate();
  }

  populate() {
    if (this.repository.isPresent()) {
      this.loadUsers();
    } else {
      this.repository.onDidChangeState(({from, to}) => {
        if (!from.isPresent() && to.isPresent()) {
          this.loadUsers();
        }
      });
    }
  }

  async loadUsers() {
    const committer = await this.repository.getCommitter();
    this.setCommitter(committer);

    const githubRemotes = (await this.repository.getRemotes()).filter(remote => remote.isGithubRepo());
    githubRemotes.length === 0
      ? await this.loadUsersFromLocalRepo()
      : await this.loadUsersFromGraphQL(githubRemotes);
  }

  async loadUsersFromLocalRepo() {
    const users = await this.repository.getAuthors({max: MAX_COMMITS});
    this.addUsers(users);
    this.didUpdate();
  }

  loadUsersFromGraphQL(remotes) {
    for (const remote of remotes) {
      getMentionableUsers(remote, users => {
        this.addUsers(users);
        this.didUpdate();
      });
    }
  }

  addUsers(users) {
    this.users = {...this.users, ...users};
  }

  setCommitter(committer) {
    this.committer = committer;
  }

  didUpdate() {
    this.onDidUpdate(this.getUsers());
  }

  getUsers() {
    // TODO: [ku 3/2018] consider sorting based on most recent authors or commit frequency
    // Also, this is obviously not the most performant. Optimize once we incorporate github username info,
    // as this will likely impact the shape of the data we store
    const users = this.users;

    // you wouldn't download a car.  you wouldn't add yourself as a co author.
    delete users[this.committer.email];
    delete users[NO_REPLY_GITHUB_EMAIL];

    return Object.keys(users)
      .map(email => ({email, name: this.users[email]}))
      .sort((a, b) => {
        if (a.name < b.name) { return -1; }
        if (a.name > b.name) { return 1; }
        return 0;
      });
  }
}

async function getMentionableUsers(remote, callback) {
  const fetchQuery = RelayNetworkLayerManager.getExistingFetchQuery('https://api.github.com/graphql');
  if (!fetchQuery) {
    // No authentication token
    return;
  }

  let hasMore = true;
  let cursor = null;

  while (hasMore) {
    const response = await fetchQuery({
      name: 'GetMentionableUsers',
      text: `
        query GetMentionableUsers {
          repository(owner: $owner, name: $name) {
            mentionableUsers(first: $first, after: $after) {
              nodes {
                login
                email
                name
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        }
      `,
    }, {
      owner: remote.getOwner(),
      name: remote.getRepo(),
      first: 100,
      after: cursor,
    });

    const connection = response.data.repository.mentionableUsers;

    callback(connection.nodes.reduce((acc, node) => {
      if (node.email === '') {
        node.email = `${node.login}@users.noreply.github.com`;
      }

      acc[node.email] = node.name;
      return acc;
    }, {}));

    cursor = connection.pageInfo.endCursor;
    hasMore = connection.pageInfo.hasNextPage;
  }
}
