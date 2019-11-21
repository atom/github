import React from 'react';
import PropTypes from 'prop-types';
import {AuthorPropType} from '../prop-types';

import Author from '../models/author';
import Commands, {Command} from '../atom/commands';

export default class GitIntroductionView extends React.Component {
  static propTypes = {
    commands: PropTypes.object.isRequired,
    identity: AuthorPropType.isRequired,
    onSave: PropTypes.func.isRequired,
    onCancel: PropTypes.func,
  };

  constructor(props) {
    super(props);

    this.state = {
      name: '',
      email: '',
      saveDisabled: true,
    };
  }

  render() {
    return (
      <div className='git-Introduction native-key-bindings'>
        <Commands registry={this.props.commands} target=".github-Introduction">
          <Command command="core:cancel" callback={this.cancel} />
          <Command command="core:confirm" callback={this.confirm} />
        </Commands>
        {this.renderIndentity()}
        <div className='git-Introduction-options'>
          <p className='git-Introduction-context'>Add your name and email that will be used to identify your commits.</p>
          <input
            type="text"
            placeholder={this.props.identity.getFullName()}
            ref={e => (this.nameInput = e)}
            className="input-text git-Introduction-input"
            value={this.state.name}
            onChange={this.onNameChange}
            tabIndex="1"
          />
          <input
            type="email"
            placeholder={this.props.identity.getEmail()}
            ref={e => (this.emailInput = e)}
            className="input-text git-Introduction-input"
            value={this.state.email}
            onChange={this.onEmailChange}
            tabIndex="2"
          />
          <div className='git-Introduction-row'>
            <button className="btn btn-primary" disabled={this.state.saveDisabled} tabIndex="3" onClick={this.confirm}>
              Save
            </button>
            <button className="btn" tabIndex="4" onClick={this.cancel}>Cancel</button>
          </div>
        </div>
        <p className='git-Introduction-explanation'>
          This will only modify/overwrite your local (repository)&nbsp;
          <span className='git-Introduction-keyword'>user.name</span> and&nbsp;
          <span className='git-Introduction-keyword'>user.email</span>.
        </p>
      </div>
    );
  }

  renderIndentity() {
    return (
      <div className='git-Introduction-header'>
        <h1 className='git-Introduction-heading'>Your Current Identity</h1>
        <img className='git-Introduction-avatar' src={this.props.identity.getAvatarUrl() || 'atom://github/img/avatar.svg'} />
        <h3 className='git-Introduction-name'>{this.props.identity.getFullName()}</h3>
        <h3 className='git-Introduction-email'>{this.props.identity.getEmail()}</h3>
      </div>
    );
  }

  confirm = () => {
    if (this.isInputValid()) {
      this.props.onSave(
        new Author(
          this.state.email || this.props.identity.getEmail(),
          this.state.name || this.props.identity.getFullName()
        )
      );
    }
  }

  cancel = () => {
    this.props.onCancel();
  }

  onNameChange = e => {
    this.setState({name: e.target.value}, this.validate);
  }

  onEmailChange = e => {
    this.setState({email: e.target.value}, this.validate);
  }

  validate = () => {
    this.setState({saveDisabled: !this.isInputValid()});
  }

  isInputValid = () => {
    // email validation with regex has a LOT of corner cases, dawg.
    // https://stackoverflow.com/questions/48055431/can-it-cause-harm-to-validate-email-addresses-with-a-regex
    // to avoid bugs for users with nonstandard email addresses,
    // just check to make sure email address contains `@` and move on with our lives.
    return !!(
      (this.state.name || this.state.email.includes('@'))
      && (this.state.name || this.props.identity.getFullName())
      && (this.state.email.includes('@') || this.props.identity.getEmail())
    );
  }
}
