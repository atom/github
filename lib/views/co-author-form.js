import React from 'react';
import PropTypes from 'prop-types';
import {autobind} from 'core-decorators';

import Commands, {Command} from './commands';

export default class CoAuthorForm extends React.Component {
  static propTypes = {
    commandRegistry: PropTypes.object.isRequired,
    onSubmit: PropTypes.func,
    onCancel: PropTypes.func,
    name: PropTypes.string,
  }

  static defaultProps = {
    onSubmit: () => {},
    onCancel: () => {},
  }

  constructor(props, context) {
    super(props, context);

    this.state = {
      name: this.props.name,
      email: '',
      submitDisabled: true,
    };
  }

  componentDidMount() {
    setTimeout(this.focusFirstInput);
  }

  render() {
    return (
      <div className="github-CoAuthorForm native-key-bindings">
        <Commands registry={this.props.commandRegistry} target=".github-CoAuthorForm">
          <Command command="core:cancel" callback={this.cancel} />
          <Command command="core:confirm" callback={this.confirm} />
        </Commands>
        <label className="github-CoAuthorForm-row">
          <span className="github-CoAuthorForm-label">Name:</span>
          <input
            type="text"
            placeholder="Co-author name"
            ref={e => (this.nameInput = e)}
            className="input-text github-CoAuthorForm-name"
            value={this.state.name}
            onChange={this.onNameChange}
            tabIndex="1"
          />
        </label>
        <label className="github-CoAuthorForm-row">
          <span className="github-CoAuthorForm-label">Email:</span>
          <input
            type="email"
            placeholder="foo@bar.com"
            ref={e => (this.emailInput = e)}
            className="input-text github-CoAuthorForm-email"
            value={this.state.email}
            onChange={this.onEmailChange}
            tabIndex="2"
          />
        </label>
        <footer className="github-CoAuthorForm-row has-buttons">
          <button className="btn github-CancelButton" tabIndex="3" onClick={this.cancel}>Cancel</button>
          <button className="btn btn-primary" disabled={this.state.submitDisabled} tabIndex="4" onClick={this.confirm}>
            Add Co-Author
          </button>
        </footer>
      </div>
    );
  }

  @autobind
  confirm() {
    if (this.isInputValid()) {
      this.props.onSubmit({name: this.state.name, email: this.state.email});
    }
  }

  @autobind
  cancel() {
    this.props.onCancel();
  }

  @autobind
  onNameChange(e) {
    this.setState({name: e.target.value}, this.validate);
  }

  @autobind
  onEmailChange(e) {
    this.setState({email: e.target.value}, this.validate);
  }

  @autobind
  validate() {
    if (this.isInputValid()) {
      this.setState({submitDisabled: false});
    }
  }

  isInputValid() {
    // email validation with regex has a LOT of corner cases, dawg.
    // https://stackoverflow.com/questions/48055431/can-it-cause-harm-to-validate-email-addresses-with-a-regex
    // to avoid bugs for users with nonstandard email addresses,
    // just check to make sure email address contains `@` and move on with our lives.
    return this.state.name && this.state.email.includes('@');
  }

  @autobind
  focusFirstInput() {
    this.nameInput.focus();
  }
}
