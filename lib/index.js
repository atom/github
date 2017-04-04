import GithubPackage from './github-package';

module.exports = new GithubPackage(
  atom.workspace, atom.project, atom.commands, atom.notifications, atom.tooltips,
  atom.styles, atom.config, atom.confirm.bind(atom),
);
