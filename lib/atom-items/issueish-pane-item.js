import {Emitter} from 'event-kit';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {autobind} from 'core-decorators';

import IssueishPaneItemController from '../controllers/issueish-pane-item-controller';
import GithubLoginModel from '../models/github-login-model';

export default class IssueishPaneItem extends Component {
  static propTypes = {
    uri: PropTypes.string.isRequired,
    host: PropTypes.string.isRequired,
    owner: PropTypes.string.isRequired,
    repo: PropTypes.string.isRequired,
    issueishNumber: PropTypes.number.isRequired,
  }

  static uriPattern = 'atom-github://issueish/{host}/{owner}/{repo}/{number}'

  static buildURI(host, owner, repo, number) {
    return 'atom-github://issueish/' +
      encodeURIComponent(host) + '/' +
      encodeURIComponent(owner) + '/' +
      encodeURIComponent(repo) + '/' +
      encodeURIComponent(number);
  }

  constructor(props) {
    super(props);

    this.emitter = new Emitter();
    this.title = `${this.props.owner}/${this.props.repo}#${this.props.issueishNumber}`;
    this.loginModel = GithubLoginModel.get();

    this.state = {};
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    return {
      host: nextProps.host,
      owner: nextProps.owner,
      repo: nextProps.repo,
      issueishNumber: nextProps.issueishNumber,
    };
  }

  render() {
    return (
      <IssueishPaneItemController
        host={this.state.host}
        owner={this.state.owner}
        repo={this.state.repo}
        issueishNumber={this.state.issueishNumber}
        loginModel={this.loginModel}
        onTitleChange={this.handleTitleChanged}
        switchToIssueish={this.switchToIssueish}
      />
    );
  }

  @autobind
  switchToIssueish(owner, repo, issueishNumber) {
    this.setState({owner, repo, issueishNumber});
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

  serialize() {
    return {
      uri: this.props.uri,
      deserializer: 'IssueishPaneItem',
    };
  }

  getURI() {
    return this.props.uri;
  }

  getTitle() {
    return this.title;
  }
}
