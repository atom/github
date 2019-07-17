import React from 'react';
import PropTypes from 'prop-types';
import {CompositeDisposable} from 'event-kit';
import {TextBuffer} from 'atom';
import url from 'url';
import path from 'path';

import Commands, {Command} from '../atom/commands';
import AtomTextEditor from '../atom/atom-text-editor';

export default class CloneDialog extends React.Component {
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
    config: PropTypes.object.isRequired,
    commands: PropTypes.object.isRequired,
  }

  constructor(props) {
    super(props);

    const params = this.props.request.getParams();
    this.sourceURL = new TextBuffer({text: params.sourceURL});
    this.destinationPath = new TextBuffer({
      text: params.destPath || this.props.config.get('core.projectHome'),
    });
    this.destinationPathModified = false;

    this.state = {
      acceptEnabled: false,
    };

    this.subs = new CompositeDisposable(
      this.sourceURL.onDidChange(this.didChangeSourceUrl),
      this.destinationPath.onDidChange(this.didChangeDestinationPath),
    );
  }

  render() {
    return (
      <div className="github-Dialog github-Clone modal">
        <Commands registry={this.props.commands} target=".github-Dialog">
          <Command command="core:confirm" callback={this.accept} />
          <Command command="core:cancel" callback={this.props.request.cancel} />
        </Commands>
        <main className="github-DialogForm">
          <label className="github-DialogLabel">
            Clone from
            <AtomTextEditor
              className="github-Clone-sourceURL"
              mini={true}
              readOnly={this.props.inProgress}
              buffer={this.sourceURL}
            />
          </label>
          <label className="github-DialogLabel">
            To directory
            <AtomTextEditor
              className="github-Clone-destinationPath"
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
              <span className="github-DialogProgress-message">cloning...</span>
            </div>
          )}
          {this.props.error && (
            <ul className="github-DialogInfo error-messages">
              <li>{this.props.error.userMessage || this.props.error.message}</li>
            </ul>
          )}
          <button className="btn github-Dialog-cancelButton" onClick={this.props.request.cancel}>
            Cancel
          </button>
          <button
            className="btn btn-primary icon icon-repo-clone github-Dialog-acceptButton"
            onClick={this.accept}
            disabled={this.props.inProgress || !this.state.acceptEnabled}>
            Clone
          </button>
        </footer>
      </div>
    );
  }

  accept = () => {
    const sourceURL = this.sourceURL.getText();
    const destinationPath = this.destinationPath.getText();
    if (sourceURL === '' || destinationPath === '') {
      return Promise.resolve();
    }

    return this.props.request.accept(sourceURL, destinationPath);
  }

  didChangeSourceUrl = () => {
    if (!this.destinationPathModified) {
      const name = path.basename(url.parse(this.sourceURL.getText()).pathname, '.git') || '';

      if (name.length > 0) {
        const proposedPath = path.join(this.props.config.get('core.projectHome'), name);
        this.destinationPath.setText(proposedPath);
        this.destinationPathModified = false;
      }
    }

    this.setAcceptEnablement();
  }

  didChangeDestinationPath = () => {
    this.destinationPathModified = true;
    this.setAcceptEnablement();
  }

  setAcceptEnablement = () => {
    const enabled = !this.sourceURL.isEmpty() && !this.destinationPath.isEmpty();
    if (enabled !== this.state.acceptEnabled) {
      this.setState({acceptEnabled: enabled});
    }
  }
}
