// TODO: create proper User class

export default class UserStore {
  constructor({repository}) {
    this.repository = repository;
    this.users = {};
    this.usersLoadedPromise = new Promise(res => {
      this.resolveUsersLoadedPromise = res;
    });
  }

  populate() {
    // TODO: check conditional branches
    // if repo present, get info
    if (this.repository.isPresent()) {
      this.loadUsers();
      // else, add listener to do so when repo is present
    } else {
      this.repository.onDidChangeState(({from, to}) => {
        if (!from.isPresent() && to.isPresent()) {
          this.loadUsers();
        }
      });
    }

    return this.usersLoadedPromise;
  }

  loadUsers() {
    // TODO: also get users from GraphQL API if available. Will need to reshape the data for this to store additional info
    // look into using Dexie
    this.loadUsersFromLocalRepo();
  }

  async loadUsersFromLocalRepo() {
    const users = await this.repository.getAuthors();
    this.addUsers(users);
    this.resolveUsersLoadedPromise();
  }

  addUsersFromGraphQL(response) {
    // this gets called in query renderer callback
    // this.addUsers(users);
  }

  addUsers(users) {
    this.users = {...this.users, ...users};
  }

  getUsers() {
    // don't actually do this. will change when we settle on best way to actually store data
    return Object.keys(this.users).sort().map(email => ({email, name: this.users[email]}));
  }
}

// class User {
//   constructor({email, name, githubLogin}) {
//
//   }
//
//   isGitHubUser() {
//     return !!this.githubLogin;
//   }
//
//   displayName() {
//     if (this.githubLogin) {
//       return `@${this.githubLogin}`;
//     } else {
//       return `${this.name}`;
//     }
//   }
//
//   coAuthorTrailer() {
//     return `Co-authored-by: ${this.email}`;
//   }
// }
