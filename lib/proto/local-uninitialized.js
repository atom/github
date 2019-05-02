import React from 'react';

export default function LocalUninitialized() {
  return (
    <div className="github-Local-Uninit github-Blank">
      <div className="github-Blank-LargeIcon icon icon-mark-github" />
      <p className="github-Blank-context">This repository is not yet version controlled by git.</p>
      <p className="github-Blank-option">
        <button
          className="github-Blank-actionBtn btn icon icon-globe">
          Initialize and publish on GitHub...
        </button>
      </p>
      <p className="github-Blank-explanation">
        Create a new GitHub repository, then track the existing content within this directory as a git repository
        configured to push there.
      </p>
    </div>
  );
}
