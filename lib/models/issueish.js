import {URL} from 'url';

export default class Issueish {
  constructor(data) {
    this.number = data.number;
    this.title = data.title;
    this.url = new URL(data.url);
    this.authorLogin = data.author.login;
    this.authorAvatarURL = new URL(data.author.avatarUrl);
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
    return this.url.toString();
  }

  getAuthorLogin() {
    return this.authorLogin;
  }

  getAuthorAvatarURL(size = 32) {
    const u = new URL(this.authorAvatarURL.toString());
    u.searchParams.set('s', size);
    return u.toString();
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
