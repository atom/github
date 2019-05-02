import React from 'react';
import {TextBuffer} from 'atom';

import Octicon from '../atom/octicon';
import AtomTextEditor from '../atom/atom-text-editor';

export default function CloneDialogSearchResults() {
  const b = new TextBuffer({text: 'git'});

  return (
    <form className="github-Dialog github-Clone modal padded">
      <h1 className="github-Clone-header">
        <Octicon icon="repo-clone" />
        Clone repository
      </h1>
      <AtomTextEditor mini={true} buffer={b} />
      <hr />
      <div className="github-Clone-searchResults select-list">
        <ol className="list-group">
          <li><div className="icon icon-repo">atom/github</div></li>
          <li className="selected"><div className="icon icon-repo">atom/git-utils</div></li>
          <li>
            <div className="github-Clone-searchResult--private icon icon-mirror-private">
            atom/super-secret-git-repo
            </div>
          </li>
          <li><div className="icon icon-mirror-public">git/git</div></li>
          <li><div className="icon icon-repo">git/git-reference</div></li>
          <li><div className="icon icon-repo">libgit2/libgit2</div></li>
        </ol>
      </div>
      <hr />
      <p className="github-Clone-actions">
        <button className="btn inline-block-tight">Cancel</button>
        <button className="btn btn-primary inline-block-tight">Clone</button>
      </p>
    </form>
  );
}
