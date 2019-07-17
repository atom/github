import React from 'react';
import PropTypes from 'prop-types';

import Commands, {Command} from '../atom/commands';

export default class CredentialDialog extends React.Component {
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

  state = {
    username: '',
    password: '',
    remember: false,
    showPassword: false,
  }

  render() {
    const request = this.props.request;
    const params = request.getParams();

    return (
      <div className="github-Dialog github-Credential modal native-key-bindings">
        <Commands registry={this.props.commands} target=".github-Dialog">
          <Command command="core:cancel" callback={request.cancel} />
          <Command command="core:confirm" callback={this.accept} />
        </Commands>
        <header className="github-DialogPrompt">{params.prompt}</header>
        <main className="github-DialogInputs">
          {params.includeUsername && (
            <label className="github-DialogLabel">
              Username:
              <input
                type="text"
                className="input-text github-Credential-username"
                value={this.state.username}
                onChange={this.didChangeUsername}
              />
            </label>
          )}
          <label className="github-DialogLabel">
            Password:
            <input
              type={this.state.showPassword ? 'text' : 'password'}
              className="input-text github-Credential-password"
              value={this.state.password}
              onChange={this.didChangePassword}
            />
            <button className="github-Credential-visibility" onClick={this.toggleShowPassword}>
              {this.state.showPassword ? 'Hide' : 'Show'}
            </button>
          </label>
          {params.includeRemember && (
            <label className="github-DialogLabel github-Credential-rememberLabel">
              <input
                className="github-Credential-remember input-checkbox"
                type="checkbox"
                checked={this.state.remember}
                onChange={this.didChangeRemember}
              />
              Remember
            </label>
          )}
        </main>
        <footer className="github-DialogFooter">
          {this.props.error && (
            <ul className="github-DialogInfo error-messages">
              <li>{this.props.error.userMessage || this.props.error.message}</li>
            </ul>
          )}
          <button className="btn github-Dialog-cancelButton" onClick={request.cancel}>Cancel</button>
          <button className="btn btn-primary" onClick={this.accept}>Sign in</button>
        </footer>
      </div>
    );
  }

  accept = () => {
    const request = this.props.request;
    const params = request.getParams();

    const payload = {password: this.state.password};

    if (params.includeUsername) {
      payload.username = this.state.username;
    }

    if (params.includeRemember) {
      payload.remember = this.state.remember;
    }

    return request.accept(payload);
  }

  didChangeUsername = e => this.setState({username: e.target.value});

  didChangePassword = e => this.setState({password: e.target.value});

  didChangeRemember = e => this.setState({remember: e.target.checked});

  toggleShowPassword = () => this.setState({showPassword: !this.state.showPassword});
}
