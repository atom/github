import fs from 'fs-extra';
import path from 'path';

import {setup, teardown} from './helpers';

describe('Package initialization', function() {
  let context, atomEnv;

  afterEach(async function() {
    context && await teardown(context);
  });

  // beforeEach helpers
  // Pass these to the initAtomEnv or initConfigDir arguments of setup() to assert a common pre-launch state.

  function welcomePackageActive(env) {
    env.config.set('welcome.showOnStartup', true);
  }

  function welcomePackageDismissed(env) {
    env.config.set('welcome.showOnStartup', false);
  }

  async function onFirstRun(configDirPath) {
    await fs.remove(path.join(configDirPath, 'github.cson'));
  }

  async function onLaterRuns(configDirPath) {
    await fs.writeFile(path.join(configDirPath, 'github.cson'), '#');
  }

  // test body helpers

  function placesGitAndGitHubTabsIntoRightDock() {
    const paneItemURIs = atomEnv.workspace.getRightDock().getPaneItems().map(paneItem => {
      return (typeof paneItem.getURI === 'function') ? paneItem.getURI() : null;
    });

    assert.includeMembers(
      paneItemURIs, ['atom-github://dock-item/git', 'atom-github://dock-item/github'],
      'Git and GitHub pane items present in the right dock',
    );
  }

  function hidesRightDock() {
    assert.isFalse(atomEnv.workspace.getRightDock().isVisible());
  }

  function revealsRightDock() {
    assert.isTrue(atomEnv.workspace.getRightDock().isVisible());
  }

  async function keepsPreviouslyClosedGitAndGitHubTabsClosed() {
    const prevContext = await setup(this.currentTest);
    for (const uri of ['atom-github://dock-item/git', 'atom-github://dock-item/github']) {
      prevContext.atomEnv.workspace.hide(uri);
    }
    const prevState = prevContext.atomEnv.serialize();
    await teardown(prevContext);

    context = await setup(this.currentTest, {
      initAtomEnv: env => env.deserialize(prevState),
    });

    const paneItems = context.atomEnv.workspace.getRightDock().getPaneItems();
    assert.lengthOf(paneItems, 0);

    const paneItemURIs = context.atomEnv.workspace.getPaneItems().map(paneItem => {
      return (typeof paneItem.getURI === 'function') ? paneItem.getURI() : null;
    });

    for (const uri of ['atom-github://dock-item/git', 'atom-github://dock-item/github']) {
      assert.notInclude(paneItemURIs, uri, `Tab ${uri} should not be present`);
    }
  }

  async function keepsPreviouslyOpenGitAndGitHubTabsOpened() {
    const prevContext = await setup(this.currentTest);
    await prevContext.atomEnv.workspace.open('atom-github://dock-item/git', {searchAllPanes: true});
    await prevContext.atomEnv.workspace.open('atom-github://dock-item/github', {searchAllPanes: true});
    const prevState = prevContext.atomEnv.serialize();
    await teardown(prevContext);

    context = await setup(this.currentTest);
    atomEnv = context.atomEnv;
    await atomEnv.deserialize(prevState);

    placesGitAndGitHubTabsIntoRightDock();
  }

  describe('on the very first run with the GitHub package present', function() {
    describe('with no serialized project state', function() {
      describe('with the welcome package active', function() {
        beforeEach(async function() {
          context = await setup(this.currentTest, {
            initAtomEnv: welcomePackageActive,
            initConfigDir: onFirstRun,
          });
          atomEnv = context.atomEnv;
        });

        it('places the git and github tabs into the right dock', placesGitAndGitHubTabsIntoRightDock);

        it('hides the right dock', hidesRightDock);
      });

      describe('with the welcome package dismissed', function() {
        beforeEach(async function() {
          context = await setup(this.currentTest, {
            initAtomEnv: welcomePackageDismissed,
            initConfigDir: onFirstRun,
          });
          atomEnv = context.atomEnv;
        });

        it('places the git and github tabs into the right dock', placesGitAndGitHubTabsIntoRightDock);

        it('reveals the right dock', revealsRightDock);
      });
    });

    describe('with serialized project state', function() {
      //
    });
  });

  describe('on a run when the GitHub package was present before', function() {
    describe('with no serialized project state', function() {
      beforeEach(async function() {
        context = await setup(this.currentTest, {
          initConfigDir: onLaterRuns,
        });
        atomEnv = context.atomEnv;
      });

      it('places the git and github tabs into the right dock', placesGitAndGitHubTabsIntoRightDock);

      it('hides the right dock', hidesRightDock);
    });

    describe('with serialized project state', function() {
      it('keeps previously closed git and github tabs closed', keepsPreviouslyClosedGitAndGitHubTabsClosed);

      it('keeps previously open git and github tabs opened', keepsPreviouslyOpenGitAndGitHubTabsOpened);
    });
  });
});
