import React from 'react';
import {mount} from 'enzyme';

import PaneItem from '../../lib/atom/pane-item';
import GitHubTabItem from '../../lib/items/github-tab-item';
import {cloneRepository, buildRepository} from '../helpers';
import {gitHubTabItemProps} from '../fixtures/props/github-tab-props';

describe('GitHubTabItem', function() {
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
    const props = gitHubTabItemProps(atomEnv, repository, overrideProps);

    return (
      <PaneItem workspace={props.workspace} uriPattern={GitHubTabItem.uriPattern}>
        {({itemHolder}) => (
          <GitHubTabItem
            ref={itemHolder.setter}
            {...props}
          />
        )}
      </PaneItem>
    );
  }

  it('renders within the dock with the component as its owner', async function() {
    mount(buildApp());

    await atomEnv.workspace.open(GitHubTabItem.buildURI());

    const paneItem = atomEnv.workspace.getRightDock().getPaneItems()
      .find(item => item.getURI() === 'atom-github://dock-item/github');
    assert.strictEqual(paneItem.getTitle(), 'GitHub');
    assert.strictEqual(paneItem.getIconName(), 'octoface');
  });

  it('access the working directory path', async function() {
    mount(buildApp());
    const item = await atomEnv.workspace.open(GitHubTabItem.buildURI());

    assert.strictEqual(item.getWorkingDirectory(), repository.getWorkingDirectoryPath());
  });

  it('serializes itself', async function() {
    mount(buildApp());
    const item = await atomEnv.workspace.open(GitHubTabItem.buildURI());

    assert.deepEqual(item.serialize(), {
      deserializer: 'GithubDockItem',
      uri: 'atom-github://dock-item/github',
    });
  });

  it('detects when it has focus', async function() {
    let activeElement = document.body;
    const wrapper = mount(buildApp({
      documentActiveElement: () => activeElement,
    }));
    const item = await atomEnv.workspace.open(GitHubTabItem.buildURI());
    await assert.async.isTrue(wrapper.update().find('.github-GitHub').exists());

    assert.isFalse(item.hasFocus());

    activeElement = wrapper.find('.github-GitHub').getDOMNode();
    assert.isTrue(item.hasFocus());
  });
});
