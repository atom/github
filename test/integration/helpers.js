import {mount} from 'enzyme';

import {getTempDir} from '../../lib/helpers';
import {cloneRepository} from '../helpers';
import GithubPackage from '../../lib/github-package';
import metadata from '../../package.json';

/**
 * Perform shared setup for integration tests.
 *
 * Usage:
 * ```js
 * beforeEach(async function() {
 *   context = await setup(this.currentTest);
 *   wrapper = context.wrapper;
 * })
 *
 * afterEach(async function() {
 *   await teardown(context)
 * })
 * ```
 *
 * Options:
 * * initialRoots - Describe the root folders that should be open in the Atom environment's project before the package
 *     is initialized. Array elements are passed to `cloneRepository` directly.
 * * initAtomEnv - Callback invoked with the Atom environment before the package is created.
 * * initConfigDir - Callback invoked with the config dir path for this Atom environment.
 * * isolateConfigDir - Use a temporary directory for the package configDir used by this test. Implied if initConfigDir
 *     is defined.
 * * state - Simulate package state serialized by a previous Atom run.
 */
export async function setup(currentTest, options = {}) {
  const opts = {
    initialRoots: [],
    isolateConfigDir: options.initAtomEnv !== undefined,
    initConfigDir: () => Promise.resolve(),
    initAtomEnv: () => Promise.resolve(),
    state: {},
    ...options,
  };

  const atomEnv = global.buildAtomEnvironment();

  await opts.initAtomEnv(atomEnv);

  const projectDirs = await Promise.all(
    opts.initialRoots.map(fixture => {
      return cloneRepository(fixture);
    }),
  );

  atomEnv.project.setPaths(projectDirs, {mustExist: true, exact: true});

  let configDirPath = null;
  if (opts.isolateConfigDir) {
    configDirPath = await getTempDir();
  } else {
    configDirPath = atomEnv.getConfigDirPath();
  }
  await opts.initConfigDir(configDirPath);

  let domRoot = null;
  let wrapper = null;

  const githubPackage = new GithubPackage({
    workspace: atomEnv.workspace,
    project: atomEnv.project,
    commandRegistry: atomEnv.commands,
    notificationManager: atomEnv.notifications,
    tooltips: atomEnv.tooltips,
    styles: atomEnv.styles,
    grammars: atomEnv.grammars,
    config: atomEnv.config,
    deserializers: atomEnv.deserializers,
    confirm: atomEnv.confirm.bind(atomEnv),
    getLoadSettings: atomEnv.getLoadSettings.bind(atomEnv),
    configDirPath,
    renderFn: (component, node, callback) => {
      if (!domRoot && node) {
        domRoot = node;
      }
      if (!wrapper) {
        wrapper = mount(component, {
          attachTo: node,
        });
      } else {
        wrapper.setProps(component.props);
      }
      if (callback) {
        process.nextTick(callback);
      }
    },
  });

  for (const deserializerName in metadata.deserializers) {
    const methodName = metadata.deserializers[deserializerName];
    atomEnv.deserializers.add({
      name: deserializerName,
      deserialize: githubPackage[methodName],
    });
  }

  await githubPackage.activate(opts.state);

  return {
    atomEnv,
    githubPackage,
    wrapper,
    domRoot,
  };
}

export async function teardown(context) {
  await context.githubPackage.deactivate();

  context.atomEnv.destroy();
}
