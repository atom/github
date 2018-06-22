import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {Emitter} from 'event-kit';

import {autobind} from '../helpers';
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
    autobind(this, 'switchToIssueish', 'handleTitleChanged');

    this.emitter = new Emitter();
    this.title = `${this.props.owner}/${this.props.repo}#${this.props.issueishNumber}`;
    this.loginModel = GithubLoginModel.get();
    this.hasTerminatedPendingState = false;

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

  switchToIssueish(owner, repo, issueishNumber) {
    this.setState({owner, repo, issueishNumber});
  }

  handleTitleChanged(title) {
    if (this.title !== title) {
      this.title = title;
      this.emitter.emit('did-change-title', title);
    }
  }

  onDidChangeTitle(cb) {
    return this.emitter.on('did-change-title', cb);
  }

  terminatePendingState() {
    if (!this.hasTerminatedPendingState) {
      this.emitter.emit('did-terminate-pending-state');
      this.hasTerminatedPendingState = true;
    }
  }

  onDidTerminatePendingState(callback) {
    return this.emitter.on('did-terminate-pending-state', callback);
  }

  onDidDestroy(callback) {
    return this.emitter.on('did-destroy', callback);
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
