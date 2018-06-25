import {mount} from 'enzyme';

import GithubPackage from '../../lib/github-package';

/**
 * Perform shared setup for integration tests.
 *
 * Usage:
 * ```js
 * beforeEach(function() {
 *   context = setup(this.currentTest);
 *   wrapper = context.wrapper;
 * })
 *
 * afterEach(function() {
 *   teardown(context)
 * })
 * ```
 *
 */
export function setup(currentTest) {
  const atomEnv = global.buildAtomEnvironment();

  let domRoot = null;
  let wrapper = null;

  const githubPackage = new GithubPackage({
    workspace: atomEnv.workspace,
    project: atomEnv.projects,
    commandRegistry: atomEnv.commands,
    notificationManager: atomEnv.notifications,
    tooltips: atomEnv.tooltips,
    styles: atomEnv.styles,
    grammars: atomEnv.grammars,
    config: atomEnv.config,
    deserializers: atomEnv.deserializers,
    confirm: atomEnv.confirm.bind(atomEnv),
    getLoadSettings: atom.getLoadSettings.bind(atomEnv),
    configDirPath: atom.getConfigDirPath(),
    renderFn: (component, node, callback) => {
      if (!domRoot && node) {
        domRoot = node;
      }
      wrapper = mount(component, {
        attachTo: node,
      });
      process.nextTick(callback);
    },
  });

  return {
    atomEnv,
    githubPackage,
    wrapper,
    domRoot,
  };
}

export async function teardown(context) {
  context.atomEnv.destroy();

  await context.githubPackage.deactivate();
}
