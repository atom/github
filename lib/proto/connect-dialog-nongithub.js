import React from 'react';
import {TextBuffer} from 'atom';

import Octicon from '../atom/octicon';
import AtomTextEditor from '../atom/atom-text-editor';

export default function ConnectDialogNonGitHub() {
  const searchBuffer = new TextBuffer({text: 'https://go.googlesource.com/go'});
  const sourceRemoteBuffer = new TextBuffer({text: 'origin'});

  return (
    <form className="github-Dialog github-Connect modal padded">
      <h1 className="github-Connect-header">
        <Octicon icon="link" />
        Connect repository
      </h1>
      <AtomTextEditor mini={true} buffer={searchBuffer} />
      <hr />
      <div className="github-Connect-url">
        <div className="github-Connect-sourceRemote block">
          <label htmlFor="github-Connect-sourceRemoteName">Source remote name:</label>
          <AtomTextEditor
            className="github-Connect-sourceRemoteName"
            id="github-Connect-sourceRemoteName"
            mini={true}
            autoWidth={false}
            buffer={sourceRemoteBuffer}
          />
        </div>
      </div>
      <hr />
      <p className="github-Connect-actions">
        <button className="btn inline-block-tight">Cancel</button>
        <button className="btn btn-primary inline-block-tight">Connect</button>
      </p>
    </form>
  );
}
