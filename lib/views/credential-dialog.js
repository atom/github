import React from 'react';
import PropTypes from 'prop-types';

import DialogView from './dialog-view';
import AutoFocus from '../autofocus';

export default class CredentialDialog extends React.Component {
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
      <DialogView
        prompt={params.prompt}
        acceptEnabled={this.canSignIn()}
        acceptTabIndex={5}
        acceptText="Sign in"
        cancelTabIndex={6}
        accept={this.accept}
        cancel={request.cancel}
        autofocus={this.autofocus}
        inProgress={this.props.inProgress}
        error={this.props.error}
        workspace={this.props.workspace}
        commands={this.props.commands}>

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

      </DialogView>
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
