import React from 'react';
import PropTypes from 'prop-types';
import {TextBuffer} from 'atom';

import AtomTextEditor from '../atom/atom-text-editor';

export default class InitDialog extends React.Component {
  static propTypes = {
    request: PropTypes.shape({
      getParams: PropTypes.func.isRequired,
      accept: PropTypes.func.isRequired,
      cancel: PropTypes.func.isRequired,
    }).isRequired,
    inProgress: PropTypes.bool,
    error: PropTypes.instanceOf(Error),
  }

  constructor(props) {
    super(props);

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
        <main className="github-DialogForm">
          <label className="github-DialogLabel">
            Initialize git repository in directory
            <AtomTextEditor
              mini={true}
              readOnly={this.props.inProgress}
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

  componentWillUnmount() {
    this.sub.dispose();
  }

  accept = () => this.props.request.accept(this.destinationPath.getText());

  setAcceptEnablement = () => {
    const enablement = !this.destinationPath.isEmpty();
    if (enablement !== this.state.acceptEnabled) {
      this.setState({acceptEnabled: enablement});
    }
  }
}
