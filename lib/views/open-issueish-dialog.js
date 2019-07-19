import React from 'react';
import PropTypes from 'prop-types';
import {TextBuffer} from 'atom';

import Commands, {Command} from '../atom/commands';
import AtomTextEditor from '../atom/atom-text-editor';
import IssueishDetailItem from '../items/issueish-detail-item';
import AutoFocus from '../autofocus';
import {addEvent} from '../reporter-proxy';

const ISSUEISH_URL_REGEX = /^(?:https?:\/\/)?(github.com)\/([^/]+)\/([^/]+)\/(?:issues|pull)\/(\d+)/;

export default class OpenIssueishDialog extends React.Component {
  static propTypes = {
    // Model
    request: PropTypes.shape({
      getParams: PropTypes.func.isRequired,
      accept: PropTypes.func.isRequired,
      cancel: PropTypes.func.isRequired,
    }).isRequired,
    error: PropTypes.instanceOf(Error),

    // Atom environment
    commands: PropTypes.object.isRequired,
  }

  constructor(props) {
    super(props);

    this.url = new TextBuffer();

    this.state = {
      openEnabled: false,
    };

    this.sub = this.url.onDidChange(this.didChangeURL);

    this.autofocus = new AutoFocus();
  }

  componentWillUnmount() {
    this.sub.dispose();
  }

  render() {
    return (
      <div className="github-Dialog github-OpenIssueish modal">
        <Commands registry={this.props.commands} target=".github-Dialog">
          <Command command="core:cancel" callback={this.props.request.cancel} />
          <Command command="core:confirm" callback={this.accept} />
        </Commands>
        <main className="github-DialogForm">
          <label className="github-DialogLabel">
            Issue or pull request URL:
            <AtomTextEditor
              ref={this.autofocus.target}
              mini={true}
              className="github-OpenIssueish-url"
              buffer={this.url}
            />
          </label>
        </main>
        <footer className="github-DialogFooter">
          <div className="github-DialogInfo">
            {this.props.error && (
              <ul className="error-messages">
                <li>{this.props.error.userMessage || this.props.error.message}</li>
              </ul>
            )}
          </div>
          <div className="github-DialogButtons">
            <button
              className="btn github-Dialog-cancelButton"
              onClick={this.props.request.cancel}>
              Cancel
            </button>
            <button
              className="btn btn-primary icon icon-git-pull-request"
              onClick={this.accept}
              disabled={!this.state.openEnabled}>
              Open Issue or Pull Request
            </button>
          </div>
        </footer>
      </div>
    );
  }

  componentDidMount() {
    this.autofocus.trigger();
  }

  accept = () => {
    const issueishURL = this.url.getText();
    if (issueishURL.length === 0) {
      return Promise.resolve();
    }

    return this.props.request.accept(issueishURL);
  }

  parseUrl() {
    const url = this.getIssueishUrl();
    const matches = url.match(ISSUEISH_URL_REGEX);
    if (!matches) {
      return false;
    }
    const [_full, repoOwner, repoName, issueishNumber] = matches; // eslint-disable-line no-unused-vars
    return {repoOwner, repoName, issueishNumber};
  }

  didChangeURL = () => {
    const enabled = !this.url.isEmpty();
    if (this.state.openEnabled !== enabled) {
      this.setState({openEnabled: enabled});
    }
  }
}

export async function openIssueishItem(issueishURL, {workspace, workdir}) {
  const matches = ISSUEISH_URL_REGEX.exec(issueishURL);
  if (!matches) {
    throw new Error('Not a valid issue or pull request URL');
  }
  const [, host, owner, repo, number] = matches;
  const uri = IssueishDetailItem.buildURI({host, owner, repo, number, workdir});
  const item = await workspace.open(uri, {searchAllPanes: true});
  addEvent('open-issueish-in-pane', {package: 'github', from: 'dialog'});
  return item;
}
