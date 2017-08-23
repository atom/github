import GithubPackage from './github-package';

let pack;
const entry = {
  initialize() {
    pack = new GithubPackage(
      atom.workspace, atom.project, atom.commands, atom.notifications, atom.tooltips,
      atom.styles, atom.grammars, atom.confirm.bind(atom), atom.config, atom.deserializers, atom.getConfigDirPath(),
      atom.getLoadSettings.bind(atom),
    );
  },
};

module.exports = new Proxy(entry, {
  get(target, name) {
    if (pack && Reflect.has(pack, name)) {
      let item = pack[name];
      if (typeof item === 'function') {
        item = item.bind(pack);
      }
      return item;
    } else {
      return target[name];
    }
  },
});
