import React, {useState, useRef, useEffect} from 'react';
import PropTypes from 'prop-types';

import {Commands, Command} from '../atom/commands';

export default function CredentialDialog(props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const refUsername = useRef();
  const refPassword = useRef();

  useEffect(() => {
    (refUsername.current || refPassword.current).focus();
  }, []);

  function confirm() {
    const payload = {password};

    if (props.includeUsername) {
      payload.username = username;
    }

    if (props.includeRemember) {
      payload.remember = remember;
    }

    props.onSubmit(payload);
  }

  function cancel() {
    props.onCancel();
  }

  return (
    <div className="github-Dialog github-Credentials modal native-key-bindings">
      <Commands target=".github-Credentials">
        <Command command="core:cancel" callback={cancel} />
        <Command command="core:confirm" callback={confirm} />
      </Commands>
      <header className="github-DialogPrompt">{props.prompt}</header>
      <main className="github-DialogInputs">
        {props.includeUsername ? (
          <label className="github-DialogLabel">
            Username:
            <input
              ref={refUsername}
              type="text"
              className="input-text github-CredentialDialog-Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              tabIndex="1"
            />
          </label>
        ) : null}
        <label className="github-DialogLabel">
          Password:
          <input
            ref={refPassword}
            type={showPassword ? 'text' : 'password'}
            className="input-text github-CredentialDialog-Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            tabIndex="2"
          />
          <button className="github-DialogLabelButton" onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </label>
      </main>
      <footer className="github-DialogButtons">
        {props.includeRemember ? (
          <label className="github-DialogButtons-leftItem input-label">
            <input
              className="github-CredentialDialog-remember input-checkbox"
              type="checkbox"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
            />
            Remember
          </label>
        ) : null}
        <button className="btn github-CancelButton" tabIndex="3" onClick={cancel}>Cancel</button>
        <button className="btn btn-primary" tabIndex="4" onClick={confirm}>Sign in</button>
      </footer>
    </div>
  );
}

CredentialDialog.propTypes = {
  prompt: PropTypes.string.isRequired,
  includeUsername: PropTypes.bool,
  includeRemember: PropTypes.bool,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

CredentialDialog.defaultProps = {
  includeUsername: false,
  includeRemember: false,
};
