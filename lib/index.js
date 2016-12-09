/** @babel */

import GithubPackage from './github-package';

const instance = new GithubPackage(
  atom.workspace, atom.project, atom.commands, atom.notifications,
);
export default instance;
