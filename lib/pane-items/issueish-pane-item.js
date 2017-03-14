import {Emitter} from 'atom';

import url from 'url';

import React from 'react';
import ReactDom from 'react-dom';
import {autobind} from 'core-decorators';

import IssueishPaneItemController from '../controllers/issueish-pane-item-controller';
import GithubLoginModel from '../models/github-login-model';

function getPropsFromUri(uri) {
  // atom-github://pull-request/https://github-host.tld/owner/repo/prNumber
  const {protocol, hostname, pathname} = url.parse(uri);
  if (protocol === 'atom-github:' && hostname === 'pull-request') {
    const [scheme, host, owner, repo, prNum] = pathname.split('/').filter(s => s);
    if (!scheme || !host || !owner || !repo || !prNum) { return null; }
    const prNumber = parseInt(prNum, 10);
    if (isNaN(prNumber)) { return null; }
    return {owner, repo, prNumber, host: `${scheme}//${host}`};
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

  static create({owner, repo, prNumber, host}, uri) {
    return new IssueishPaneItem({owner, repo, prNumber, host}, uri);
  }

  constructor({owner, repo, prNumber, host}, uri) {
    this.emitter = new Emitter();

    this.owner = owner;
    this.repo = repo;
    this.prNumber = prNumber;
    this.host = host;
    this.uri = uri;
    this.title = `${this.owner}/${this.repo}#${this.prNumber}`;

    this.createComponent();
  }

  createComponent() {
    this.element = document.createElement('div');
    const loginModel = GithubLoginModel.get();
    const props = {
      owner: this.owner,
      repo: this.repo,
      prNumber: this.prNumber,
      host: this.host,
      onTitleChange: this.handleTitleChanged,
      loginModel,
    };
    this.component = ReactDom.render(<IssueishPaneItemController {...props} />, this.element);
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
    // TODO: is this right?
    this.emitter.dispose();
  }
}
