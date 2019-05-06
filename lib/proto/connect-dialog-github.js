import React from 'react';
import {TextBuffer} from 'atom';

import Octicon from '../atom/octicon';
import AtomTextEditor from '../atom/atom-text-editor';

export default function ConnectDialogGitHub() {
  const searchBuffer = new TextBuffer({text: 'atom/github'});
  const sourceRemoteBuffer = new TextBuffer({text: 'origin'});

  return (
    <form className="github-Dialog github-Connect modal padded">
      <h1 className="github-Connect-header">
        <Octicon icon="link" />
        Connect repository
      </h1>
      <AtomTextEditor mini={true} buffer={searchBuffer} />
      <hr />
      <div className="github-Connect-dotcom">
        <div className="github-Connect-protocol block">
          <span className="github-Connect-protocolHeading">Protocol:</span>
          <label className="github-Connect-protocolOption input-label">
            <input className="input-radio" type="radio" name="protocol" defaultChecked={true} />
            HTTPS
          </label>
          <label className="github-Connect-protocolOption input-label">
            <input className="input-radio" type="radio" name="protocol" />
            SSH
          </label>
        </div>
        <div className="github-Connect-fork block">
          <label className="input-label">
            <input type="checkbox" id="github-Connect-forkBox" />
            <Octicon icon="repo-forked" />
            Fork this repository
          </label>
        </div>
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
