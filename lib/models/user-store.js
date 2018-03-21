// This is a guess about what a reasonable value is. Can adjust if performance is poor.
const MAX_COMMITS = 5000;

export default class UserStore {
  constructor({repository, onDidUpdate}) {
    this.repository = repository;
    this.onDidUpdate = onDidUpdate || (() => {});
    // TODO: [ku 3/2018] Consider using Dexie (indexDB wrapper) like Desktop and persist users across sessions
    this.users = {};
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
    this.addUsers(users);
  }

  addUsersFromGraphQL(response) {
    // TODO: [ku 3/2018] also get users from GraphQL API if available. Will need to reshape the data accordingly
    // This will get called in relay query renderer callback
    // this.addUsers(users);
  }

  addUsers(users) {
    this.users = {...this.users, ...users};
    this.didUpdate();
  }

  didUpdate() {
    this.onDidUpdate(this.getUsers());
  }

  getUsers() {
    // TODO: [ku 3/2018] consider sorting based on most recent authors or commit frequency
    // This is obviously not the most performant. Test out on repo with many users to see if we need to optimize
    return Object.keys(this.users)
      .map(email => ({email, name: this.users[email]}))
      .sort((a, b) => {
        if(a.name < b.name) return -1;
        if(a.name > b.name) return 1;
        return 0;
      });
  }
}
