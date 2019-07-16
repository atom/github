import React from 'react';
import {TextBuffer} from 'atom';

import Octicon from '../atom/octicon';
import AtomTextEditor from '../atom/atom-text-editor';

export default function CloneDialogGitHub() {
  const searchBuffer = new TextBuffer({text: 'atom/github'});
  const sourceRemoteBuffer = new TextBuffer({text: 'origin'});
  const destPathBuffer = new TextBuffer({text: '/home/smashwilson/src/github'});

  return (
    <form className="github-Dialog github-Clone modal padded">
      <h1 className="github-Clone-header">
        <Octicon icon="repo-clone" />
        Clone repository
      </h1>
      <div className="github-Clone-repoRow">
        <AtomTextEditor mini={true} buffer={searchBuffer} />
        <Octicon icon="mark-github" className="github-Clone-rightBumper" />
      </div>
      <hr />
      <div className="github-Clone-dotcom">
        <div className="github-Clone-destination block">
          <label htmlFor="github-Clone-destinationPath">Destination path:</label>
          <div className="github-Clone-destinationRow">
            <AtomTextEditor
              className="github-Clone-destinationPath"
              id="github-Clone-destinationPath"
              mini={true}
              buffer={destPathBuffer}
            />
            <button className="btn icon icon-file-directory github-Clone-rightBumper" />
          </div>
        </div>
        <details className="github-Clone-advanced block">
          <summary>Advanced</summary>
          <main>
            <div className="github-Clone-protocol block">
              <span className="github-Clone-protocolHeading">Protocol:</span>
              <label className="github-Clone-protocolOption input-label">
                <input className="input-radio" type="radio" name="protocol" defaultChecked={true} />
                HTTPS
              </label>
              <label className="github-Clone-protocolOption input-label">
                <input className="input-radio" type="radio" name="protocol" />
                SSH
              </label>
            </div>
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
