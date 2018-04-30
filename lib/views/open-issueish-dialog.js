import React from 'react';
import PropTypes from 'prop-types';
import {autobind} from 'core-decorators';
import {CompositeDisposable} from 'event-kit';

import Commands, {Command} from '../atom/commands';

const ISSUEISH_URL_REGEX = /^(?:https?:\/\/)?github.com\/([^/]+)\/([^/]+)\/(?:issues|pull)\/(\d+)/;

export default class OpenIssueishDialog extends React.Component {
  static propTypes = {
    commandRegistry: PropTypes.object.isRequired,
    didAccept: PropTypes.func,
    didCancel: PropTypes.func,
  }

  static defaultProps = {
    didAccept: () => {},
    didCancel: () => {},
  }

  constructor(props, context) {
    super(props, context);

    this.state = {
      cloneDisabled: false,
    };

    this.subs = new CompositeDisposable();
  }

  componentDidMount() {
    if (this.issueishUrlElement) {
      setTimeout(() => this.issueishUrlElement.focus());
    }
  }

  render() {
    return this.renderDialog();
  }

  renderDialog() {
    return (
      <div className="github-Dialog github-OpenIssueish modal">
        <Commands registry={this.props.commandRegistry} target=".github-OpenIssueish">
          <Command command="core:cancel" callback={this.cancel} />
          <Command command="core:confirm" callback={this.accept} />
        </Commands>
        <main className="github-DialogInputs">
          <label className="github-DialogLabel github-IssueishUrl">
            Issue or pull request URL:
            <atom-text-editor mini={true} ref={this.editorRefs('issueishUrl')} tabIndex="1" />
          </label>
          {this.state.error && <span className="error">{this.state.error}</span>}
        </main>
        <div className="github-DialogButtons">
          <button className="btn github-CancelButton" onClick={this.cancel} tabIndex="3">
            Cancel
          </button>
          <button
            className="btn btn-primary icon icon-git-pull-request"
            onClick={this.accept}
            disabled={this.getIssueishUrl().length === 0}
            tabIndex="2">
            Open Issue or Pull Request
          </button>
        </div>
      </div>
    );
  }

  @autobind
  accept() {
    if (this.getIssueishUrl().length === 0) {
      return;
    }

    const parsed = this.parseUrl();
    if (!parsed) {
      this.setState({
        error: 'That is not a valid issue or pull request URL.',
      });
      return;
    }
    const {repoOwner, repoName, issueishNumber} = parsed;

    this.props.didAccept({repoOwner, repoName, issueishNumber});
  }

  @autobind
  cancel() {
    this.props.didCancel();
  }

  @autobind
  editorRefs(baseName) {
    const elementName = `${baseName}Element`;
    const modelName = `${baseName}Editor`;
    const subName = `${baseName}Subs`;
    const changeMethodName = `didChange${baseName[0].toUpperCase()}${baseName.substring(1)}`;

    return element => {
      if (!element) {
        return;
      }

      this[elementName] = element;
      const editor = element.getModel();
      if (this[modelName] !== editor) {
        this[modelName] = editor;

        if (this[subName]) {
          this[subName].dispose();
          this.subs.remove(this[subName]);
        }

        this[subName] = editor.onDidChange(this[changeMethodName]);
        this.subs.add(this[subName]);
      }
    };
  }

  @autobind
  didChangeIssueishUrl() {
    this.setState({error: null});
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

  getIssueishUrl() {
    return this.issueishUrlEditor ? this.issueishUrlEditor.getText() : '';
  }
}
