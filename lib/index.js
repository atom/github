/* eslint-disable no-var */

var semver = require('semver');

var v = semver.parse(atom.appVersion);
var atomVersion = [v.major, v.minor, v.patch].join('.');
var requiredVersion = '>=1.13.0';

if (atom.inDevMode() || atom.inSpecMode() || semver.satisfies(atomVersion, requiredVersion)) {
  module.exports = startPackage();
} else {
  module.exports = versionMismatch();
}

function versionMismatch() {
  return {
    activate: () => {
      atom.notifications.addWarning('Incompatible Atom Version', {
        description: 'The GitHub packages requires Atom ' + requiredVersion +
          '. You are running ' + atomVersion + '. Please check for updates and try again.',
        dismissable: true,
      });
    },
  };
}

function startPackage() {
  var GithubPackage = require('./github-package').default;

  return new GithubPackage(
    atom.workspace, atom.project, atom.commands, atom.notifications, atom.config,
  );
}
