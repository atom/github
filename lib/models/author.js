export const NO_REPLY_GITHUB_EMAIL = 'noreply@github.com';

export default class Author {
  constructor(email, fullName, login = null) {
    this.email = email;
    this.fullName = fullName;
    this.login = login;
  }

  getEmail() {
    return this.email;
  }

  getFullName() {
    return this.fullName;
  }

  getLogin() {
    return this.login;
  }

  isNoReply() {
    return this.email === NO_REPLY_GITHUB_EMAIL;
  }

  hasLogin() {
    return this.login !== null;
  }
}
