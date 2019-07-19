import React from 'react';
import PropTypes from 'prop-types';

import Commands, {Command} from '../atom/commands';
import AutoFocus from '../autofocus';

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

  constructor(props) {
    super(props);

    this.autofocus = new AutoFocus();

    this.state = {
      username: '',
      password: '',
      remember: false,
      showPassword: false,
    };
  }

  render() {
    const request = this.props.request;
    const params = request.getParams();

    return (
      <div className="github-Dialog github-Credential modal" onTransitionEnd={this.recaptureFocus}>
        <Commands registry={this.props.commands} target=".github-Dialog">
          <Command command="core:cancel" callback={request.cancel} />
          <Command command="core:confirm" callback={this.accept} />
        </Commands>
        <header className="github-DialogPrompt">{params.prompt}</header>
        <main className="github-DialogForm">
          {params.includeUsername && (
            <label className="github-DialogLabel github-DialogLabel--horizontal">
              Username:
              <input
                ref={this.autofocus.firstTarget(0)}
                tabIndex="1"
                type="text"
                className="input-text native-key-bindings github-Credential-username"
                value={this.state.username}
                onChange={this.didChangeUsername}
              />
            </label>
          )}
          <label className="github-DialogLabel github-DialogLabel--horizontal">
            Password:
            <input
              ref={this.autofocus.firstTarget(1)}
              tabIndex="2"
              type={this.state.showPassword ? 'text' : 'password'}
              className="input-text native-key-bindings github-Credential-password"
              value={this.state.password}
              onChange={this.didChangePassword}
            />
            <button
              className="github-Dialog--insetButton github-Credential-visibility"
              tabIndex="3"
              onClick={this.toggleShowPassword}>
              {this.state.showPassword ? 'Hide' : 'Show'}
            </button>
          </label>
          {params.includeRemember && (
            <label className="github-DialogLabel github-DialogLabel--horizontal github-Credential-rememberLabel">
              <input
                tabIndex="4"
                className="input-checkbox github-Credential-remember"
                type="checkbox"
                checked={this.state.remember}
                onChange={this.didChangeRemember}
              />
              Remember
            </label>
          )}
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
            <button tabIndex="5" className="btn github-Dialog-cancelButton" onClick={request.cancel}>Cancel</button>
            <button tabIndex="6" className="btn btn-primary" onClick={this.accept} disabled={!this.canSignIn()}>
              Sign in
            </button>
          </div>
        </footer>
      </div>
    );
  }

  componentDidMount() {
    this.autofocus.trigger();
  }

  recaptureFocus = () => this.autofocus.trigger();

  accept = () => {
    if (!this.canSignIn()) {
      return Promise.resolve();
    }

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

  canSignIn() {
    return !this.props.request.getParams().includeUsername || this.state.username.length > 0;
  }
}
