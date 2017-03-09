import React from 'react';
import {autobind} from 'core-decorators';

import Commands, {Command} from './commands';

export default class CredentialDialog extends React.Component {
  static propTypes = {
    commandRegistry: React.PropTypes.object.isRequired,
    prompt: React.PropTypes.string.isRequired,
    includeUsername: React.PropTypes.bool,
    onSubmit: React.PropTypes.func,
    onCancel: React.PropTypes.func,
  }

  static defaultProps = {
    includeUsername: false,
    onSubmit: () => {},
    onCancel: () => {},
  }

  constructor(props, context) {
    super(props, context);

    this.state = {
      username: '',
      password: '',
    };
  }

  componentDidMount() {
    setTimeout(this.focusFirstInput);
  }

  render() {
    return (
      <div className="github-Credentials modal native-key-bindings">
        <Commands registry={this.props.commandRegistry} target=".github-Credentials">
          <Command command="core:cancel" callback={this.cancel} />
          <Command command="core:confirm" callback={this.confirm} />
        </Commands>
        <header className="github-CredentialsPrompt">{this.props.prompt}</header>
        <main className="github-CredentialsInputs">
          {this.props.includeUsername ? (
            <label>
              Username:
              <input
                type="text"
                ref={e => (this.usernameInput = e)}
                className="input-text"
                value={this.state.username}
                onChange={this.onUsernameChange}
                tabIndex="1"
              />
            </label>
          ) : null}
          <label>
            Password:
            <input
              type="password"
              ref={e => (this.passwordInput = e)}
              className="input-text"
              value={this.state.password}
              onChange={this.onPasswordChange}
              tabIndex="2"
            />
          </label>
        </main>
        <footer className="github-Buttons">
          <button className="btn github-CancelButton" tabIndex="3" onClick={this.cancel}>Cancel</button>
          <button className="btn btn-primary" tabIndex="4" onClick={this.confirm}>Sign in</button>
        </footer>
      </div>
    );
  }

  @autobind
  confirm() {
    this.props.onSubmit(this.state);
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
  focusFirstInput() {
    (this.usernameInput || this.passwordInput).focus();
  }
}
