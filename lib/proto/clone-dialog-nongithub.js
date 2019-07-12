import React from 'react';
import {TextBuffer} from 'atom';

import Octicon from '../atom/octicon';
import AtomTextEditor from '../atom/atom-text-editor';

export default function CloneDialogNonGitHub() {
  const searchBuffer = new TextBuffer({text: 'https://go.googlesource.com/go'});
  const sourceRemoteBuffer = new TextBuffer({text: 'origin'});
  const destPathBuffer = new TextBuffer({text: '/home/smashwilson/src/go'});

  return (
    <form className="github-Dialog github-Clone modal padded">
      <h1 className="github-Clone-header">
        <Octicon icon="repo-clone" />
        Clone repository
      </h1>
      <AtomTextEditor mini={true} buffer={searchBuffer} />
      <hr />
      <div className="github-Clone-url">
        <div className="github-Clone-destination block">
          <label htmlFor="github-Clone-destinationPath">Destination path:</label>
          <AtomTextEditor
            className="github-Clone-destinationPath"
            id="github-Clone-destinationPath"
            mini={true}
            buffer={destPathBuffer}
          />
        </div>
        <details className="github-Clone-advanced block">
          <summary>Advanced</summary>
          <main>
            <div className="github-Clone-sourceRemote block">
              <label htmlFor="github-Clone-sourceRemoteName">Source remote name:</label>
              <AtomTextEditor
                className="github-Clone-sourceRemoteName"
                id="github-Clone-sourceRemoteName"
                mini={true}
                autoWidth={false}
                buffer={sourceRemoteBuffer}
              />
            </div>
          </main>
        </details>
      </div>
      <hr />
      <p className="github-Clone-actions">
        <button className="btn inline-block-tight">Cancel</button>
        <button className="btn btn-primary inline-block-tight">Clone</button>
      </p>
    </form>
  );
}
