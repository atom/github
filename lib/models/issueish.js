import {URL} from 'url';
import moment from 'moment';

import {category} from '../containers/pr-statuses-container';

export default class Issueish {
  constructor(data) {
    this.number = data.number;
    this.title = data.title;
    this.url = new URL(data.url);
    this.authorLogin = data.author.login;
    this.authorAvatarURL = new URL(data.author.avatarUrl);
    this.createdAt = moment(data.createdAt, moment.ISO_8601);
    this.headRefName = data.headRefName;
    this.headRepositoryID = data.repository.id;
    this.statusContexts = data.commits.nodes.reduce((acc, node) => {
      const status = node.commit.status;
      if (status !== null) {
        acc.push(...status.contexts);
      }
      return acc;
    }, []);
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

  getHeadRepositoryID() {
    return this.headRepositoryID;
  }

  getStatusCounts() {
    return this.statusContexts.reduce((acc, context) => {
      acc[category(context.state).toLowerCase()]++;
      return acc;
    }, {pending: 0, failure: 0, success: 0});
  }
}
