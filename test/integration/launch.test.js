import fs from 'fs-extra';
import path from 'path';

import {setup, teardown} from './helpers';
import GitTabItem from '../../lib/items/git-tab-item';
import GithubTabController from '../../lib/controllers/github-tab-controller';

describe('Package initialization', function() {
  let context;

  afterEach(async function() {
    context && await teardown(context);
  });

  it('reveals the tabs on first run when the welcome package has been dismissed', async function() {
    context = await setup(this.currentTest, {
      initConfigDir: configDirPath => fs.remove(path.join(configDirPath, 'github.cson')),
      initAtomEnv: env => env.config.set('welcome.showOnStartup', false),
    });

    const rightDock = context.atomEnv.workspace.getRightDock();
    const getPaneItemURIs = () => {
      return rightDock.getPaneItems().map(i => i.getURI());
    };

    await assert.async.includeMembers(getPaneItemURIs(), [GitTabItem.buildURI(), GithubTabController.buildURI()]);
    assert.isTrue(rightDock.isVisible());
  });

  it('renders but does not reveal the tabs on first run when the welcome package has not been dismissed', async function() {
    context = await setup(this.currentTest, {
      initConfigDir: configDirPath => fs.remove(path.join(configDirPath, 'github.cson')),
      initAtomEnv: env => env.config.set('welcome.showOnStartup', true),
    });

    const rightDock = context.atomEnv.workspace.getRightDock();
    const getPaneItemURIs = () => {
      return rightDock.getPaneItems().map(i => i.getURI());
    };

    await assert.async.includeMembers(getPaneItemURIs(), [GitTabItem.buildURI(), GithubTabController.buildURI()]);
    assert.isFalse(rightDock.isVisible());
  });

  it('renders but does not reveal the tabs on new projects after the first run', async function() {
    context = await setup(this.currentTest, {
      initConfigDir: configDirPath => fs.writeFile(path.join(configDirPath, 'github.cson'), '#', {encoding: 'utf8'}),
      state: {},
    });

    const rightDock = context.atomEnv.workspace.getRightDock();
    const getPaneItemURIs = () => {
      return rightDock.getPaneItems().map(i => i.getURI());
    };

    await assert.async.includeMembers(getPaneItemURIs(), [GitTabItem.buildURI(), GithubTabController.buildURI()]);
    assert.isFalse(rightDock.isVisible());
  });

  it('respects serialized state on existing projects after the first run', async function() {
    const nonFirstRun = {
      initConfigDir: configDirPath => fs.writeFile(path.join(configDirPath, 'github.cson'), '#', {encoding: 'utf8'}),
      state: {newProject: false},
    };

    const prevContext = await setup(this.currentTest, nonFirstRun);

    const prevWorkspace = prevContext.atomEnv.workspace;
    await prevWorkspace.open(GithubTabController.buildURI(), {searchAllPanes: true});
    prevWorkspace.hide(GitTabItem.buildURI());

    const prevState = prevContext.atomEnv.serialize();

    await teardown(prevContext);

    context = await setup(this.currentTest, nonFirstRun);
    await context.atomEnv.deserialize(prevState);

    const paneItemURIs = context.atomEnv.workspace.getPaneItems().map(i => i.getURI());
    assert.include(paneItemURIs, GithubTabController.buildURI());
    assert.notInclude(paneItemURIs, GitTabItem.buildURI());
  });

  it('honors firstRun from legacy serialized state', async function() {
    // Previous versions of this package used a {firstRun} key in their serialized state to determine whether or not
    // the tabs should be open by default. I've renamed it to {newProject} to distinguish it from the firstRun prop
    // we're setting based on the presence or absence of `${ATOM_HOME}/github.cson`.

    const getPaneItemURIs = ctx => ctx.atomEnv.workspace.getPaneItems().map(i => i.getURI());

    const prevContext = await setup(this.currentTest, {
      initConfigDir: configDirPath => fs.writeFile(path.join(configDirPath, 'github.cson'), '#', {encoding: 'utf8'}),
      state: {firstRun: true},
    });

    await assert.async.includeMembers(
      getPaneItemURIs(prevContext),
      [GitTabItem.buildURI(), GithubTabController.buildURI()],
    );

    const prevWorkspace = prevContext.atomEnv.workspace;
    const item = prevWorkspace.getPaneItems().find(i => i.getURI() === GitTabItem.buildURI());
    const pane = prevWorkspace.paneForURI(GitTabItem.buildURI());
    pane.destroyItem(item);

    const prevState = prevContext.atomEnv.serialize();
    await teardown(prevContext);

    context = await setup(this.currentTest, {
      initConfigDir: configDirPath => fs.writeFile(path.join(configDirPath, 'github.cson'), '#', {encoding: 'utf8'}),
      state: {firstRun: false},
    });
    await context.atomEnv.deserialize(prevState);

    await assert.async.include(getPaneItemURIs(context), GithubTabController.buildURI());
    assert.notInclude(getPaneItemURIs(context), GitTabItem.buildURI());
  });
});
