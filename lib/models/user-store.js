import yubikiri from 'yubikiri';

import RelayNetworkLayerManager from '../relay-network-layer-manager';
import Author, {nullAuthor} from './author';
import ModelObserver from './model-observer';

// This is a guess about what a reasonable value is. Can adjust if performance is poor.
const MAX_COMMITS = 5000;

export default class UserStore {
  constructor({repository, onDidUpdate}) {
    this.onDidUpdate = onDidUpdate || (() => {});
    // TODO: [ku 3/2018] Consider using Dexie (indexDB wrapper) like Desktop and persist users across sessions

    this.allUsers = new Map();
    this.users = [];
    this.committer = nullAuthor;

    this.repositoryObserver = new ModelObserver({
      fetchData: r => yubikiri({
        committer: r.getCommitter(),
        authors: r.getAuthors({max: MAX_COMMITS}),
        remotes: r.getRemotes(),
      }),
      didUpdate: () => this.loadUsers(this.repositoryObserver.getActiveModelData()),
    });
    this.repositoryObserver.setActiveModel(repository);
  }

  async loadUsers(data) {
    if (!data) {
      return;
    }

    this.setCommitter(data.committer);

    const githubRemotes = data.remotes.filter(remote => remote.isGithubRepo());
    if (githubRemotes.length === 0) {
      this.addUsers(data.authors);
    } else {
      await this.loadUsersFromGraphQL(githubRemotes);
    }
  }

  loadUsersFromGraphQL(remotes) {
    return Promise.all(
      remotes.map(remote => this.loadMentionableUsers(remote)),
    );
  }

  async loadMentionableUsers(remote) {
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

      this.addUsers(connection.nodes.map(node => {
        if (node.email === '') {
          node.email = `${node.login}@users.noreply.github.com`;
        }

        return new Author(node.email, node.name, node.login);
      }));

      cursor = connection.pageInfo.endCursor;
      hasMore = connection.pageInfo.hasNextPage;
    }
  }

  addUsers(users) {
    let changed = false;
    for (const author of users) {
      if (!this.allUsers.has(author.getEmail())) {
        changed = true;
      }
      this.allUsers.set(author.getEmail(), author);
    }

    if (changed) {
      this.finalize();
    }
  }

  finalize() {
    // TODO: [ku 3/2018] consider sorting based on most recent authors or commit frequency
    const users = [];
    for (const author of this.allUsers.values()) {
      if (author.matches(this.committer)) { continue; }
      if (author.isNoReply()) { continue; }

      users.push(author);
    }
    users.sort(Author.compare);
    this.users = users;
    this.didUpdate();
  }

  setRepository(repository) {
    this.repositoryObserver.setActiveModel(repository);
  }

  setCommitter(committer) {
    const changed = !this.committer.matches(committer);
    this.committer = committer;
    if (changed) {
      this.finalize();
    }
  }

  didUpdate() {
    this.onDidUpdate(this.getUsers());
  }

  getUsers() {
    return this.users;
  }
}
