import React from 'react';
import PropTypes from 'prop-types';
import {autobind} from 'core-decorators';

import Commands, {Command} from './commands';

// TODO: explore making this a reusable component for new co-author input

export default class CoAuthorDialog extends React.Component {
  static propTypes = {
    commandRegistry: PropTypes.object.isRequired,
    onSubmit: PropTypes.func,
    onCancel: PropTypes.func,
  }

  static defaultProps = {
    onSubmit: () => {},
    onCancel: () => {},
  }

  constructor(props, context) {
    super(props, context);

    this.state = {
      name: '',
      email: '',
    };
  }

  componentDidMount() {
    setTimeout(this.focusFirstInput);
  }

  render() {
    return (
      <div className="github-CoAuthorDialog native-key-bindings">
        <Commands registry={this.props.commandRegistry} target=".github-CoAuthorDialog">
          <Command command="core:cancel" callback={this.cancel} />
          <Command command="core:confirm" callback={this.confirm} />
        </Commands>
        <label className="github-CoAuthorDialog-row">
          <span className="github-CoAuthorDialog-label">Name:</span>
          <input
            type="text"
            placeholder="Co-author name"
            ref={e => (this.nameInput = e)}
            className="input-text github-CoAuthorDialog-name"
            value={this.state.name}
            onChange={this.onNameChange}
            tabIndex="1"
          />
        </label>
        <label className="github-CoAuthorDialog-row">
          <span className="github-CoAuthorDialog-label">Email:</span>
          <input
            type="text"
            placeholder="foo@bar.com"
            ref={e => (this.emailInput = e)}
            className="input-text github-CoAuthorDialog-email"
            value={this.state.email}
            onChange={this.onEmailChange}
            tabIndex="2"
          />
        </label>
        <footer className="github-CoAuthorDialog-row has-buttons">
          <button className="btn github-CancelButton" tabIndex="3" onClick={this.cancel}>Cancel</button>
          <button className="btn btn-primary" tabIndex="4" onClick={this.confirm}>Add Co-Author</button>
        </footer>
      </div>
    );
  }

  @autobind
  confirm() {
    this.props.onSubmit({name: this.state.name, email: this.state.email});
  }

  @autobind
  cancel() {
    this.props.onCancel();
  }

  @autobind
  onNameChange(e) {
    this.setState({name: e.target.value});
  }

  @autobind
  onEmailChange(e) {
    this.setState({email: e.target.value});
  }

  @autobind
  focusFirstInput() {
    this.nameInput.focus();
  }
}
