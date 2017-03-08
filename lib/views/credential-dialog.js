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
      <div className="github-Prompt native-key-bindings" onClick={this.focusFirstInput}>
        <Commands registry={this.props.commandRegistry} target="github-Prompt">
          <Command command="core:cancel" callback={this.cancel} />
          <Command command="core:confirm" callback={this.confirm} />
        </Commands>
        <div className="github-Prompt-label">{this.props.prompt}</div>
        {this.props.includeUsername ? (
          <label className="github-Prompt-label">
            Username:
            <input
              type="text"
              ref={e => (this.usernameInput = e)}
              className="github-Prompt-input input-text"
              value={this.state.username}
              onChange={this.onUsernameChange}
            />
          </label>
        ) : null}
        <label className="github-Prompt-label">
          Password:
          <input
            type="password"
            ref={e => (this.passwordInput = e)}
            className="github-Prompt-input input-text"
            value={this.state.password}
            onChange={this.onPasswordChange}
          />
        </label>
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
