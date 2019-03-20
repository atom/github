import path from 'path';
import globby from 'globby';

// Discover and load all fragment modules in the package, indexed by name.
export class SpecRegistry {
  constructor() {
    this.fragmentsByName = new Map();
    this.hasStarted = false;
    this.populatingPromise = new Promise(resolve => {
      this.resolvePopulatingPromise = resolve;
    });
  }

  // Load all *.graphql.js files into a map by name.
  async populate() {
    this.hasStarted = true;
    const root = path.resolve(__dirname, '../../..');

    const allModulePaths = await globby(['**/__generated__/*.graphql.js'], {
      cwd: root,
      gitignore: true,
      absolute: true,
    });

    for (const modulePath of allModulePaths) {
      const node = require(modulePath);
      if (node.kind === 'Fragment') {
        this.fragmentsByName.set(node.name, node);
      }
    }

    this.resolvePopulatingPromise();
  }

  // Ensure that populate() has run at most once.
  ensurePopulated() {
    if (!this.hasStarted) {
      return this.populate();
    } else {
      return this.populatingPromise;
    }
  }

  // Access a referenced fragment by name. Throw an error if the name is not known.
  withName(name) {
    const node = this.fragmentsByName.get(name);
    if (node === undefined) {
      throw new Error(`Unable to find referenced fragment with name "${name}"`);
    }
    return node;
  }
}

// Default implementation for a SpecRegistry that is (intentionally) empty.
export const nullSpecRegistry = {
  withName() {
    return null;
  },
};
