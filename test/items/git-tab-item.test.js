import React from 'react';
import {mount} from 'enzyme';
import until from 'test-until';

import DockItem from '../../lib/atom/dock-item';
import GitTabItem from '../../lib/atom-items/git-tab-item';
import ResolutionProgress from '../../lib/models/conflicts/resolution-progress';
import RefHolder from '../../lib/models/ref-holder';
import {cloneRepository, buildRepository} from '../helpers';

describe('GitTabItem', function() {
  let atomEnv, repository;

  beforeEach(async function() {
    atomEnv = global.buildAtomEnvironment();

    const workdirPath = await cloneRepository();
    repository = await buildRepository(workdirPath);
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function buildApp(overrideProps = {}) {
    const props = {
      repository,
      workspace: atomEnv.workspace,
      commandRegistry: atomEnv.commands,
      grammars: atomEnv.grammars,
      resolutionProgress: new ResolutionProgress(),
      notificationManager: atomEnv.notifications,
      config: atomEnv.config,
      project: atomEnv.project,
      tooltips: atomEnv.tooltips,
      confirm: () => {},
      ensureGitTab: () => {},
      refreshResolutionProgress: () => {},
      undoLastDiscard: () => {},
      discardWorkDirChangesForPaths: () => {},
      openFiles: () => {},
      initializeRepo: () => {},
      ...overrideProps,
    };

    const itemHolder = new RefHolder();

    return (
      <DockItem workspace={props.workspace} itemHolder={itemHolder}>
        <GitTabItem ref={itemHolder.setter} {...props} />
      </DockItem>
    );
  }

  it('forwards all props to the GitTabContainer', function() {
    const extraProp = Symbol('extra');
    const wrapper = mount(buildApp({extraProp}));

    assert.strictEqual(wrapper.find('GitTabContainer').prop('extraProp'), extraProp);
  });

  it('renders within the dock with the component as its owner', async function() {
    mount(buildApp());

    let paneItem;
    await until('the item is opened', () => {
      paneItem = atomEnv.workspace.getRightDock().getPaneItems()
        .find(item => item.getURI() === 'atom-github://dock-item/git');
      return paneItem !== undefined;
    });

    assert.strictEqual(paneItem.getTitle(), 'Git');
  });
});
