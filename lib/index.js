/** @babel */

import GithubPackage from './github-package'

const instance = new GithubPackage(atom.workspace, atom.project, atom.commands)
export default instance
