import React from 'react';
import PropTypes from 'prop-types';
import AtomTextEditor from '../atom/atom-text-editor';

export default class GitIdentityView extends React.Component {
  static propTypes = {
    // Model
    usernameBuffer: PropTypes.object.isRequired,
    emailBuffer: PropTypes.object.isRequired,

    // Action methods
    close: PropTypes.func.isRequired,
  };

  render() {
    return (
      <div className="github-GitIdentity">
        <h1 className="github-GitIdentity-title">
          Git Identity
        </h1>
        <p className="github-GitIdentity-explanation">
          Please set the username and email address that you wish to use to
          author git commits.
        </p>
        <div className="github-GitIdentity-text">
          <AtomTextEditor mini placeholderText="name" buffer={this.props.usernameBuffer} />
          <AtomTextEditor mini placeholderText="email address" buffer={this.props.emailBuffer} />
        </div>
        <div className="github-GitIdentity-buttons">
          <button
            className="btn btn-primary"
            onClick={this.props.close}
            disabled={this.props.usernameBuffer.isEmpty() || this.props.emailBuffer.isEmpty()}>
            Continue
          </button>
        </div>
      </div>
    );
  }
}
