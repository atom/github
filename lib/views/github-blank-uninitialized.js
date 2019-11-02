import React from 'react';

import Octicon from '../atom/octicon';

export default function GitHubBlankUninitialized() {
  return (
    <div className="github-Local-Uninit github-Blank">
      <main className="github-Blank-body">
        <div className="github-Blank-LargeIcon icon icon-mark-github" />
        <p className="github-Blank-context">This repository is not yet version controlled by git.</p>
        <p className="github-Blank-option">
          <button className="github-Blank-actionBtn btn icon icon-globe">
          Initialize and publish on GitHub...
          </button>
        </p>
        <p className="github-Blank-explanation">
        Create a new GitHub repository, then track the existing content within this directory as a git repository
        configured to push there.
        </p>
      </main>
      <footer className="github-Blank-footer github-Blank-explanation">
        To initialize this directory as a git repository without publishing it to GitHub, visit the
        <a className="github-Blank-tabLink" href="https://example.com/"><Octicon icon="git-commit" />Git tab.</a>
      </footer>
    </div>
  );
}
