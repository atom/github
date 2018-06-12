export default class Issueish {
  constructor(data) {
    this.number = data.number;
    this.title = data.title;
    this.url = data.url;
    this.authorLogin = data.author.login;
    this.authorAvatarURL = data.author.avatarUrl;
    this.createdAt = data.createdAt;
    this.headRefName = data.headRefName;
    this.headRepositoryName = data.headRepository.nameWithOwner;
  }

  getNumber() {
    return this.number;
  }

  getTitle() {
    return this.title;
  }

  getGitHubURL() {
    return this.url;
  }

  getAuthorLogin() {
    return this.authorLogin;
  }

  getAuthorAvatarURL() {
    return this.authorAvatarURL;
  }

  getCreatedAt() {
    return this.createdAt;
  }

  getHeadRefName() {
    return this.headRefName;
  }

  getHeadRepositoryName() {
    return this.headRepositoryName;
  }
}
