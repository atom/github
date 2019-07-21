import React, {useState, useRef, useEffect} from 'react';
import PropTypes from 'prop-types';
import {TextBuffer} from 'atom';
import {CompositeDisposable} from 'event-kit';

import {Commands, Command} from '../atom/commands';
import AtomTextEditor from '../atom/atom-text-editor';

export default function InitDialog(props) {
  const [initDisabled, setInitDisabled] = useState(false);

  const projectPath = useRef(new TextBuffer({text: props.initPath}));
  const subs = useRef(new CompositeDisposable());

  useEffect(() => {
    subs.add(
      projectPath.current.onDidChange(() => setInitDisabled(projectPath.current.isEmpty())),
    );

    return () => subs.dispose();
  }, []);

  function init() {
    if (!projectPath.current.isEmpty()) {
      props.didAccept(projectPath.current.getText());
    }
  }

  return (
    <div className="github-Dialog github-Init modal">
      <Commands target=".github-Init">
        <Command command="core:cancel" callback={props.didCancel} />
        <Command command="core:confirm" callback={init} />
      </Commands>
      <main className="github-DialogInputs">
        <label className="github-DialogLabel github-ProjectPath">
          Initialize git repository in directory
          <AtomTextEditor mini={true} tabIndex="2" buffer={projectPath.current} />
        </label>
      </main>
      <div className="github-DialogButtons">
        <button className="btn github-CancelButton" onClick={props.didCancel} tabIndex="3">
          Cancel
        </button>
        <button
          className="btn btn-primary icon icon-repo-create"
          onClick={init}
          disabled={initDisabled}
          tabIndex="4">
          Init
        </button>
      </div>
    </div>
  );
}

InitDialog.propTypes = {
  initPath: PropTypes.string,
  didAccept: PropTypes.func,
  didCancel: PropTypes.func,
};
