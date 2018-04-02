import React from 'react';
import PropTypes from 'prop-types';
import {autobind} from 'core-decorators';

import Commands, {Command} from './commands';

// TODO: explore making this a reusable component for new co-author input

export default class CredentialDialog extends React.Component {
  static propTypes = {
    commandRegistry: PropTypes.object.isRequired,
    prompt: PropTypes.string.isRequired,
    includeUsername: PropTypes.bool,
    includeRemember: PropTypes.bool,
    onSubmit: PropTypes.func,
    onCancel: PropTypes.func,
  }

  static defaultProps = {
    includeUsername: false,
    includeRemember: false,
    onSubmit: () => {},
    onCancel: () => {},
  }

  constructor(props, context) {
    super(props, context);

    this.state = {
      username: '',
      password: '',
      remember: false,
    };
  }

  componentDidMount() {
    setTimeout(this.focusFirstInput);
  }

  render() {
    return (
      <div className="github-Dialog github-Credentials modal native-key-bindings">
        <Commands registry={this.props.commandRegistry} target=".github-Credentials">
          <Command command="core:cancel" callback={this.cancel} />
          <Command command="core:confirm" callback={this.confirm} />
        </Commands>
        <header className="github-DialogPrompt">{this.props.prompt}</header>
        <main className="github-DialogInputs">
          {this.props.includeUsername ? (
            <label className="github-DialogLabel">
              Username:
              <input
                type="text"
                ref={e => (this.usernameInput = e)}
                className="input-text github-CredentialDialog-Username"
                value={this.state.username}
                onChange={this.onUsernameChange}
                tabIndex="1"
              />
            </label>
          ) : null}
          <label className="github-DialogLabel">
            Password:
            <input
              type="password"
              ref={e => (this.passwordInput = e)}
              className="input-text github-CredentialDialog-Password"
              value={this.state.password}
              onChange={this.onPasswordChange}
              tabIndex="2"
            />
          </label>
        </main>
        <footer className="github-DialogButtons">
          {this.props.includeRemember ? (
            <label className="github-DialogButtons-leftItem input-label">
              <input
                className="github-CredentialDialog-remember input-checkbox"
                type="checkbox"
                checked={this.state.remember}
                onChange={this.onRememberChange}
              />
              Remember
            </label>
          ) : null}
          <button className="btn github-CancelButton" tabIndex="3" onClick={this.cancel}>Cancel</button>
          <button className="btn btn-primary" tabIndex="4" onClick={this.confirm}>Sign in</button>
        </footer>
      </div>
    );
  }

  @autobind
  confirm() {
    const payload = {password: this.state.password};

    if (this.props.includeUsername) {
      payload.username = this.state.username;
    }

    if (this.props.includeRemember) {
      payload.remember = this.state.remember;
    }

    this.props.onSubmit(payload);
  }

  @autobind
  cancel() {
    this.props.onCancel();
  }

  @autobind
  onUsernameChange(e) {
    this.setState({username: e.target.value});
  }

  @autobind
  onPasswordChange(e) {
    this.setState({password: e.target.value});
  }

  @autobind
  onRememberChange(e) {
    this.setState({remember: e.target.checked});
  }

  @autobind
  focusFirstInput() {
    (this.usernameInput || this.passwordInput).focus();
  }
}
