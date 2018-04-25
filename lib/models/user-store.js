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

  loadUsers() {
    this.loadUsersFromLocalRepo();
  }

  async loadUsersFromLocalRepo() {
    const users = await this.repository.getAuthors({max: MAX_COMMITS});
    const committer = await this.repository.getCommitter();
    this.setCommitter(committer);
    this.addUsers(users);
    this.didUpdate();
  }

  addUsersFromGraphQL(response) {
    // TODO: [ku 3/2018] also get users from GraphQL API if available. Will need to reshape the data accordingly
    // This will get called in relay query renderer callback
    // this.addUsers(users);
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
