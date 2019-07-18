import React from 'react';
import PropTypes from 'prop-types';
import {TextBuffer} from 'atom';

import AtomTextEditor from '../atom/atom-text-editor';
import Commands, {Command} from '../atom/commands';
import AutoFocus from '../autofocus';

export default class InitDialog extends React.Component {
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
    commands: PropTypes.object.isRequired,
  }

  constructor(props) {
    super(props);

    this.autofocus = new AutoFocus();

    this.destinationPath = new TextBuffer({
      text: this.props.request.getParams().dirPath,
    });

    this.sub = this.destinationPath.onDidChange(this.setAcceptEnablement);

    this.state = {
      acceptEnabled: !this.destinationPath.isEmpty(),
    };
  }

  render() {
    return (
      <div className="github-Dialog github-Init modal">
        <Commands registry={this.props.commands} target=".github-Dialog">
          <Command command="core:confirm" callback={this.accept} />
          <Command command="core:cancel" callback={this.props.request.cancel} />
        </Commands>
        <main className="github-DialogForm">
          <label className="github-DialogLabel">
            Initialize git repository in directory
            <AtomTextEditor
              ref={this.autofocus.target}
              mini={true}
              readOnly={this.props.inProgress}
              preselect={true}
              buffer={this.destinationPath}
            />
          </label>
        </main>
        <footer className="github-DialogFooter">
          {this.props.inProgress && (
            <div className="github-DialogInfo">
              <span className="inline-block loading loading-spinner-small" />
              <span className="github-DialogProgress-message">initializing...</span>
            </div>
          )}
          {this.props.error && (
            <ul className="github-DialogInfo error-messages">
              <li>{this.props.error.userMessage || this.props.error.message}</li>
            </ul>
          )}
          <div className="github-DialogButtons">
            <button
              className="btn github-Dialog-cancelButton"
              onClick={this.props.request.cancel}
              disabled={this.props.inProgress}>
              Cancel
            </button>
            <button
              className="btn btn-primary icon icon-repo-create"
              onClick={this.accept}
              disabled={this.props.inProgress || !this.state.acceptEnabled}>
              Init
            </button>
          </div>
        </footer>
      </div>
    );
  }

  componentDidMount() {
    this.autofocus.trigger();
  }

  componentWillUnmount() {
    this.sub.dispose();
  }

  accept = () => {
    const destPath = this.destinationPath.getText();
    if (destPath.length === 0) {
      return Promise.resolve();
    }

    return this.props.request.accept(destPath);
  }

  setAcceptEnablement = () => {
    const enablement = !this.destinationPath.isEmpty();
    if (enablement !== this.state.acceptEnabled) {
      this.setState({acceptEnabled: enablement});
    }
  }
}
