import React from 'react';
import PropTypes from 'prop-types';
import AtomTextEditor from '../atom/atom-text-editor';

export default class GitIdentityView extends React.Component {
  static propTypes = {
    // Model
    usernameBuffer: PropTypes.object.isRequired,
    emailBuffer: PropTypes.object.isRequired,
    canWriteLocal: PropTypes.bool.isRequired,

    // Action methods
    setLocal: PropTypes.func.isRequired,
    setGlobal: PropTypes.func.isRequired,
    close: PropTypes.func.isRequired,
  };

  render() {
    return (
      <div className="github-GitIdentity">
        <h1 className="github-GitIdentity-title">
          Git Identity
        </h1>
        <p className="github-GitIdentity-explanation">
          Please set the username and email address that you wish to use to author git commits. This will write to the
          <code>user.name</code> and <code>user.email</code> values in your git configuration at the chosen scope.
        </p>
        <div className="github-GitIdentity-text">
          <AtomTextEditor mini placeholderText="name" buffer={this.props.usernameBuffer} />
          <AtomTextEditor mini placeholderText="email address" buffer={this.props.emailBuffer} />
        </div>
        <div className="github-GitIdentity-buttons">
          <button className="btn" onClick={this.props.close}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            title="Configure git for this repository"
            onClick={this.props.setLocal}
            disabled={!this.props.canWriteLocal}>
            Use for this repository
          </button>
          <button
            className="btn btn-primary"
            title="Configure git globally for your operating system user account"
            onClick={this.props.setGlobal}>
            Use for all repositories
          </button>
        </div>
      </div>
    );
  }
}
