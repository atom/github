import fs from 'fs-extra';
import path from 'path';

import {setup, teardown} from './helpers';

describe('Package initialization', function() {
  let context;

  afterEach(async function() {
    context && await teardown(context);
  });

  it.only('reveals the tabs on first run when the welcome package has been dismissed', async function() {
    context = await setup(this.currentTest, {
      initConfigDir: configDirPath => fs.remove(path.join(configDirPath, 'github.cson')),
      initAtomEnv: env => env.config.set('welcome.showOnStartup', false),
    });

    const rightDock = context.atomEnv.workspace.getRightDock();
    const paneItemURIs = rightDock.getPaneItems().map(i => i.getURI());
    assert.includeMembers(paneItemURIs, ['atom-github://dock-item/git', 'atom-github://dock-item/github']);
    assert.isTrue(rightDock.isVisible());
  });

  it('renders but does not reveal the tabs on first run when the welcome package has not been dismissed', async function() {
    context = await setup(this.currentTest, {
      initConfigDir: configDirPath => fs.remove(path.join(configDirPath, 'github.cson')),
      initAtomEnv: env => env.config.set('welcome.showOnStartup', true),
    });

    const rightDock = context.atomEnv.workspace.getRightDock();
    const paneItemURIs = rightDock.getPaneItems().map(i => i.getURI());
    assert.includeMembers(paneItemURIs, ['atom-github://dock-item/git', 'atom-github://dock-item/github']);
    assert.isFalse(rightDock.isVisible());
  });

  it('renders but does not reveal the tabs on new projects after the first run', async function() {
    context = await setup(this.currentTest, {
      initConfigDir: configDirPath => fs.writeFile(path.join(configDirPath, 'github.cson'), '#', {encoding: 'utf8'}),
      state: {},
    });

    const rightDock = context.atomEnv.workspace.getRightDock();
    const paneItemURIs = rightDock.getPaneItems().map(i => i.getURI());
    assert.includeMembers(paneItemURIs, ['atom-github://dock-item/git', 'atom-github://dock-item/github']);
    assert.isFalse(rightDock.isVisible());
  });

  it('respects serialized state on existing projects after the first run', async function() {
    const nonFirstRun = {
      initConfigDir: configDirPath => fs.writeFile(path.join(configDirPath, 'github.cson'), '#', {encoding: 'utf8'}),
      state: {newProject: false},
    };

    const prevContext = await setup(this.currentTest, nonFirstRun);

    const prevWorkspace = prevContext.atomEnv.workspace;
    await prevWorkspace.open('atom-github://dock-item/github', {searchAllPanes: true});

    const prevState = prevContext.atomEnv.serialize();

    await teardown(prevContext);

    context = await setup(this.currentTest, nonFirstRun);
    await context.atomEnv.deserialize(prevState);

    const paneItemURIs = context.atomEnv.workspace.getPaneItems().map(i => i.getURI());
    assert.include(paneItemURIs, 'atom-github://dock-item/github');
    assert.notInclude(paneItemURIs, 'atom-github://dock-item/git');
  });

  it('honors firstRun from legacy serialized state', async function() {
    // Previous versions of this package used a {firstRun} key in their serialized state to determine whether or not
    // the tabs should be open by default. I've renamed it to {newProject} to distinguish it from the firstRun prop
    // we're setting based on the presence or absence of `${ATOM_HOME}/github.cson`.

    const nonFirstRun = {
      initConfigDir: configDirPath => fs.writeFile(path.join(configDirPath, 'github.cson'), '#', {encoding: 'utf8'}),
      state: {firstRun: false},
    };

    const prevContext = await setup(this.currentTest, nonFirstRun);

    const prevWorkspace = prevContext.atomEnv.workspace;
    await prevWorkspace.open('atom-github://dock-item/github', {searchAllPanes: true});

    const prevState = prevContext.atomEnv.serialize();

    await teardown(prevContext);

    context = await setup(this.currentTest, nonFirstRun);
    await context.atomEnv.deserialize(prevState);

    const paneItemURIs = context.atomEnv.workspace.getPaneItems().map(i => i.getURI());
    assert.include(paneItemURIs, 'atom-github://dock-item/github');
    assert.notInclude(paneItemURIs, 'atom-github://dock-item/git');
  });
});
