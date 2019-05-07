import GithubPackage from './github-package';

let pack;
const entry = {
  initialize() {
    pack = new GithubPackage({
      workspace: atom.workspace,
      project: atom.project,
      commandRegistry: atom.commands,
      notificationManager: atom.notifications,
      tooltips: atom.tooltips,
      styles: atom.styles,
      keymaps: atom.keymaps,
      grammars: atom.grammars,
      config: atom.config,
      deserializers: atom.deserializers,
      openDevTools: atom.openDevTools.bind(atom),

      confirm: atom.confirm.bind(atom),
      getLoadSettings: atom.getLoadSettings.bind(atom),

      configDirPath: atom.getConfigDirPath(),
    });
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
