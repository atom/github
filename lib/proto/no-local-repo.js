import React from 'react';

export default function NoLocalRepo() {
  return (
    <div className="github-NoLocal github-Blank">
      <div className="github-Blank-LargeIcon icon icon-mark-github" />
      <h1 className="github-Blank-banner">Welcome</h1>
      <p className="github-Blank-context">How would you like to get started today?</p>
      <p className="github-Blank-option">
        <button
          className="github-Blank-actionBtn btn icon icon-repo-create">
          Create a new GitHub repository...
        </button>
      </p>
      <p className="github-Blank-option">
        <button
          className="github-Blank-actionBtn btn icon icon-repo-clone">
          Clone an existing GitHub repository...
        </button>
      </p>
    </div>
  );
}
