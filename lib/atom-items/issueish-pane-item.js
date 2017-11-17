import {Emitter} from 'event-kit';

import url from 'url';

import React from 'react';
import ReactDom from 'react-dom';
import {autobind} from 'core-decorators';

import IssueishPaneItemController from '../controllers/issueish-pane-item-controller';
import GithubLoginModel from '../models/github-login-model';

function getPropsFromUri(uri) {
  // atom-github://issueish/https://github-host.tld/owner/repo/issueishNumber
  const {protocol, hostname, pathname} = url.parse(uri);
  if (protocol === 'atom-github:' && hostname === 'issueish') {
    const [scheme, host, owner, repo, issueishNum] = pathname.split('/').filter(s => s);
    if (!scheme || !host || !owner || !repo || !issueishNum) { return null; }
    const issueishNumber = parseInt(issueishNum, 10);
    if (isNaN(issueishNumber)) { return null; }
    return {owner, repo, issueishNumber, host: `${scheme}//${host}`};
  }
  return null;
}

export default class IssueishPaneItem {
  static opener(uri) {
    const props = getPropsFromUri(uri);
    if (props) {
      return IssueishPaneItem.create(props, uri);
    } else {
      return null;
    }
  }

  static create({owner, repo, issueishNumber, host}, uri) {
    return new IssueishPaneItem({owner, repo, issueishNumber, host}, uri);
  }

  constructor({owner, repo, issueishNumber, host}, uri) {
    this.emitter = new Emitter();

    this.owner = owner;
    this.repo = repo;
    this.issueishNumber = issueishNumber;
    this.host = host;
    this.uri = uri;
    this.title = `${this.owner}/${this.repo}#${this.issueishNumber}`;

    this.createComponent();
  }

  createComponent() {
    this.element = document.createElement('div');
    const loginModel = GithubLoginModel.get();
    this.props = {
      owner: this.owner,
      repo: this.repo,
      issueishNumber: this.issueishNumber,
      host: this.host,
      loginModel,
    };
    this.render();
  }

  render() {
    this.component = ReactDom.render(
      <IssueishPaneItemController
        {...this.props}
        onTitleChange={this.handleTitleChanged}
        switchToIssueish={this.switchToIssueish}
      />,
      this.element,
    );
  }

  @autobind
  switchToIssueish(owner, repo, issueishNumber) {
    this.owner = owner;
    this.repo = repo;
    this.issueishNumber = issueishNumber;
    this.props = {...this.props, owner, repo, issueishNumber};
    this.render();
  }

  @autobind
  handleTitleChanged(title) {
    if (this.title !== title) {
      this.title = title;
      this.emitter.emit('did-change-title', title);
    }
  }

  onDidChangeTitle(cb) {
    return this.emitter.on('did-change-title', cb);
  }

  getElement() {
    return this.element;
  }

  serialize() {
    return {
      uri: this.uri,
      deserializer: 'IssueishPaneItem',
    };
  }

  getURI() {
    return this.uri;
  }

  getTitle() {
    return this.title;
  }

  destroy() {
    this.emitter.dispose();
    ReactDom.unmountComponentAtNode(this.getElement());
  }
}
