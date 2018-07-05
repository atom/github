import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {Emitter} from 'event-kit';

import {autobind} from '../helpers';
import {GithubLoginModelPropType, WorkdirContextPoolPropType} from '../prop-types';
import IssueishDetailContainer from '../containers/issueish-detail-container';

export default class IssueishPaneItem extends Component {
  static propTypes = {
    host: PropTypes.string.isRequired,
    owner: PropTypes.string.isRequired,
    repo: PropTypes.string.isRequired,
    issueishNumber: PropTypes.number.isRequired,

    workingDirectory: PropTypes.string.isRequired,
    workdirContextPool: WorkdirContextPoolPropType.isRequired,
    loginModel: GithubLoginModelPropType.isRequired,
  }

  static uriPattern = 'atom-github://issueish/{host}/{owner}/{repo}/{issueishNumber}?workdir={workingDirectory}'

  static buildURI(host, owner, repo, number, workdir) {
    return 'atom-github://issueish/' +
      encodeURIComponent(host) + '/' +
      encodeURIComponent(owner) + '/' +
      encodeURIComponent(repo) + '/' +
      encodeURIComponent(number) + '?workdir=' + encodeURIComponent(workdir);
  }

  constructor(props) {
    super(props);
    autobind(this, 'switchToIssueish', 'handleTitleChanged');

    this.emitter = new Emitter();
    this.title = `${this.props.owner}/${this.props.repo}#${this.props.issueishNumber}`;
    this.hasTerminatedPendingState = false;

    this.state = {
      host: this.props.host,
      owner: this.props.owner,
      repo: this.props.repo,
      issueishNumber: this.props.issueishNumber,
    };
  }

  render() {
    const repository = this.props.workdirContextPool.getContext(this.props.workingDirectory).getRepository();

    return (
      <IssueishDetailContainer
        host={this.state.host}
        owner={this.state.owner}
        repo={this.state.repo}
        issueishNumber={this.state.issueishNumber}

        repository={repository}
        loginModel={this.props.loginModel}

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
      uri: this.getURI(),
      deserializer: 'IssueishPaneItem',
    };
  }

  getTitle() {
    return this.title;
  }
}
