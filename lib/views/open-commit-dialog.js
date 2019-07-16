import React, {useState, useRef, useEffect} from 'react';
import PropTypes from 'prop-types';
import {TextBuffer} from 'atom';
import {CompositeDisposable} from 'event-kit';

import {Commands, Command} from '../atom/commands';
import {AtomTextEditor} from '../atom/atom-text-editor';

export default function OpenCommitDialog(props) {
  const [errorMessage, setErrorMessage] = useState(null);

  const commitRef = useRef(new TextBuffer());
  const subs = useRef(new CompositeDisposable());

  useEffect(() => {
    subs.add(commitRef.current.onDidChange(() => setErrorMessage(null)));

    return () => subs.dispose();
  }, []);

  async function accept() {
    const ref = commitRef.current.getText();
    const valid = await props.isValidEntry(ref);
    if (valid === true) {
      props.didAccept({ref});
    } else {
      setErrorMessage(`There is no commit associated with "${ref}" in this repository`);
    }
  }

  return (
    <div className="github-Dialog github-OpenCommit modal">
      <Commands target=".github-OpenCommit">
        <Command command="core:cancel" callback={props.didCancel} />
        <Command command="core:confirm" callback={accept} />
      </Commands>
      <main className="github-DialogInputs">
        <label className="github-DialogLabel github-CommitRef">
          Commit sha or Git ref:
          <AtomTextEditor mini={true} tabIndex="1" buffer={commitRef} />
        </label>
        {errorMessage && <span className="error">{errorMessage}</span>}
      </main>
      <div className="github-DialogButtons">
        <button className="btn github-CancelButton" onClick={props.didCancel} tabIndex="3">
          Cancel
        </button>
        <button
          className="btn btn-primary icon icon-commit"
          onClick={accept}
          disabled={!!errorMessage || commitRef.current.isEmpty()}
          tabIndex="2">
          Open Commit
        </button>
      </div>
    </div>
  );
}

OpenCommitDialog.propTypes = {
  didAccept: PropTypes.func.isRequired,
  didCancel: PropTypes.func.isRequired,
  isValidEntry: PropTypes.func.isRequired,
};
