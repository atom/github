import React from 'react';
import PropTypes from 'prop-types';
import {TextBuffer} from 'atom';

import AtomTextEditor from '../atom/atom-text-editor';
import IssueishDetailItem from '../items/issueish-detail-item';
import AutoFocus from '../autofocus';
import DialogView from './dialog-view';
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
    inProgress: PropTypes.bool,
    error: PropTypes.instanceOf(Error),

    // Atom environment
    workspace: PropTypes.object.isRequired,
    commands: PropTypes.object.isRequired,
  }

  constructor(props) {
    super(props);

    this.url = new TextBuffer();

    this.state = {
      acceptEnabled: false,
    };

    this.sub = this.url.onDidChange(this.didChangeURL);

    this.autofocus = new AutoFocus();
  }

  render() {
    return (
      <DialogView
        acceptEnabled={this.state.acceptEnabled}
        acceptClassName="icon icon-git-pull-request"
        acceptText="Open Issue or Pull Request"
        accept={this.accept}
        cancel={this.props.request.cancel}
        autofocus={this.autofocus}
        inProgress={this.props.inProgress}
        error={this.props.error}
        workspace={this.props.workspace}
        commands={this.props.commands}>

        <label className="github-DialogLabel">
          Issue or pull request URL:
          <AtomTextEditor
            ref={this.autofocus.target}
            mini={true}
            className="github-OpenIssueish-url"
            buffer={this.url}
          />
        </label>

      </DialogView>
    );
  }

  componentDidMount() {
    this.autofocus.trigger();
  }

  componentWillUnmount() {
    this.sub.dispose();
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
    if (this.state.acceptEnabled !== enabled) {
      this.setState({acceptEnabled: enabled});
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
