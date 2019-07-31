import React, {Fragment} from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';

import Commands, {Command} from '../atom/commands';
import Panel from '../atom/panel';

export default class DialogView extends React.Component {
  static propTypes = {
    // Customization
    prompt: PropTypes.string,
    progressMessage: PropTypes.string,
    acceptEnabled: PropTypes.bool,
    acceptClassName: PropTypes.string,
    acceptText: PropTypes.string,

    // Callbacks
    accept: PropTypes.func.isRequired,
    cancel: PropTypes.func.isRequired,

    // State
    tabGroup: PropTypes.shape({
      nextIndex: PropTypes.func.isRequired,
      focusBeginning: PropTypes.func.isRequired,
    }),
    inProgress: PropTypes.bool.isRequired,
    error: PropTypes.instanceOf(Error),

    // Atom environment
    workspace: PropTypes.object.isRequired,
    commands: PropTypes.object.isRequired,

    // Form content
    children: PropTypes.node.isRequired,
  }

  static defaultProps = {
    acceptTabIndex: 0,
    acceptEnabled: true,
    acceptText: 'Accept',
    cancelTabIndex: 0,
  }

  render() {
    return (
      <Panel workspace={this.props.workspace} location="modal">
        <div className="github-Dialog" onTransitionEnd={() => this.props.tabGroup.focusBeginning()}>
          <Commands registry={this.props.commands} target=".github-Dialog">
            <Command command="core:confirm" callback={this.props.accept} />
            <Command command="core:cancel" callback={this.props.cancel} />
          </Commands>
          {this.props.prompt && (
            <header className="github-DialogPrompt">{this.props.prompt}</header>
          )}
          <main className="github-DialogForm">
            {this.props.children}
          </main>
          <footer className="github-DialogFooter">
            <div className="github-DialogInfo">
              {this.props.progressMessage && this.props.inProgress && (
                <Fragment>
                  <span className="inline-block loading loading-spinner-small" />
                  <span className="github-DialogProgress-message">{this.props.progressMessage}</span>
                </Fragment>
              )}
              {this.props.error && (
                <ul className="error-messages">
                  <li>{this.props.error.userMessage || this.props.error.message}</li>
                </ul>
              )}
            </div>
            <div className="github-DialogButtons">
              <button
                tabIndex={this.props.tabGroup.nextIndex()}
                className="btn github-Dialog-cancelButton"
                onClick={this.props.cancel}>
                Cancel
              </button>
              <button
                tabIndex={this.props.tabGroup.nextIndex()}
                className={cx('btn btn-primary github-Dialog-acceptButton', this.props.acceptClassName)}
                onClick={this.props.accept}
                disabled={this.props.inProgress || !this.props.acceptEnabled}>
                {this.props.acceptText}
              </button>
            </div>
          </footer>
        </div>
      </Panel>
    );
  }
}
