import React from 'react';

import Octicon from '../atom/octicon';
import AtomTextEditor from '../atom/atom-text-editor';

export default function CloneDialogEmptySearch() {
  return (
    <form className="github-Dialog github-Clone modal padded">
      <h1 className="github-Clone-header">
        <Octicon icon="repo-clone" />
        Clone repository
      </h1>
      <AtomTextEditor mini={true} placeholderText="owner/name or git URL" />
      <hr />
      <p className="github-Clone-searchResults github-Clone-searchResults--empty">
        Search for a repository on GitHub or enter any valid git URL to clone
      </p>
      <hr />
      <p className="github-Clone-actions">
        <button className="btn inline-block-tight">Cancel</button>
        <button className="btn btn-primary inline-block-tight">Clone</button>
      </p>
    </form>
  );
}
