export default class UserStore {
  constructor({repository}) {
    this.repository = repository
  }

  populate() {
    const users = this.repository.getAuthors()
    // if repo present, get info
    // else, add listener to do so when repo is present
    this.repository.onDidChangeState(({oldState, newState}) => {
      if (!oldState.isLoading() && newState.isPresent()) {
        
      }
    });
  }

  addUsers(users) {

  }

  getUsers() {

  }
}

/*



*/
