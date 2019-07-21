import React, {useState, useRef, useEffect} from 'react';
import PropTypes from 'prop-types';
import {TextBuffer} from 'atom';
import {CompositeDisposable} from 'event-kit';
import url from 'url';
import path from 'path';

import {Commands, Command} from '../atom/commands';
import AtomTextEditor from '../atom/atom-text-editor';
import {useAtomEnv} from '../context/atom';

export default function CloneDialog(props) {
  const [cloneDisabled, setCloneDisabled] = useState(false);

  const atomEnv = useAtomEnv();

  const subs = useRef(new CompositeDisposable());
  const projectPath = useRef(new TextBuffer());
  const remoteURL = useRef(new TextBuffer());
  const projectPathModified = useRef(false);

  useEffect(() => {
    subs.current.add(
      projectPath.onDidChange(didModifyProjectPath),
      remoteURL.onDidChange(didModifyRemoteURL),
    );

    return () => subs.dispose();
  }, []);

  function didModifyProjectPath() {
    projectPathModified.current = true;
    updateEnablement();
  }

  function didModifyRemoteURL() {
    if (!projectPathModified.current) {
      const name = path.basename(url.parse(this.getRemoteUrl()).pathname, '.git') || '';
      if (name.length > 0) {
        const proposedPath = path.join(atomEnv.config.get('core.projectHome'), name);
        projectPath.current.setText(proposedPath);
        projectPathModified.current = false;
      }
    }

    updateEnablement();
  }

  function updateEnablement() {
    const shouldDisable = projectPath.current.isEmpty() && remoteURL.current.isEmpty();
    if (shouldDisable !== cloneDisabled) {
      setCloneDisabled(shouldDisable);
    }
  }

  function clone() {
    if (remoteURL.current.isEmpty() || projectPath.current.isEmpty()) {
      return;
    }

    props.didAccept(remoteURL.current.getText(), projectPath.current.getText());
  }

  function cancel() {
    return props.didCancel();
  }

  function renderSpinner() {
    return (
      <div className="github-Dialog github-Clone modal">
        <main className="github-DialogSpinner">
          <span className="loading loading-spinner-small inline-block" />
          <span className="github-DialogMessage inline-block">
            Cloning <strong>{remoteURL.current.getText()}</strong>
          </span>
        </main>
      </div>
    );
  }

  function renderForm() {
    return (
      <div className="github-Dialog github-Clone modal">
        <Commands target=".github-Clone">
          <Command command="core:cancel" callback={cancel} />
          <Command command="core:confirm" callback={clone} />
        </Commands>
        <main className="github-DialogInputs">
          <label className="github-DialogLabel github-CloneUrl">
            Clone from
            <AtomTextEditor mini={true} tabIndex="1" buffer={remoteURL.current} />
          </label>
          <label className="github-DialogLabel github-ProjectPath">
            To directory
            <AtomTextEditor mini={true} tabIndex="2" buffer={projectPath.current} />
          </label>
        </main>
        <div className="github-DialogButtons">
          <button className="btn github-CancelButton" onClick={cancel} tabIndex="3">
            Cancel
          </button>
          <button
            className="btn btn-primary icon icon-repo-clone"
            onClick={clone}
            disabled={cloneDisabled}
            tabIndex="4">
            Clone
          </button>
        </div>
      </div>
    );
  }

  return props.inProgress ? renderSpinner() : renderForm();
}

CloneDialog.propTypes = {
  inProgress: PropTypes.bool.isRequired,
  didAccept: PropTypes.func.isRequired,
  didCancel: PropTypes.func.isRequired,
};
