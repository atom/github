import React from 'react';
import {mount} from 'enzyme';

import CommitPreviewContainer from '../../lib/containers/commit-preview-container';
import CommitPreviewItem from '../../lib/items/commit-preview-item';
import {cloneRepository, buildRepository} from '../helpers';

describe('CommitPreviewContainer', function() {
  let atomEnv, repository;

  beforeEach(async function() {
    atomEnv = global.buildAtomEnvironment();

    const workdir = await cloneRepository();
    repository = await buildRepository(workdir);
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function buildApp(override = {}) {

    const props = {
      repository,
      itemType: CommitPreviewItem,

      workspace: atomEnv.workspace,
      commands: atomEnv.commands,
      keymaps: atomEnv.keymaps,
      tooltips: atomEnv.tooltips,
      config: atomEnv.config,

      destroy: () => {},
      discardLines: () => {},
      undoLastDiscard: () => {},
      surfaceToCommitPreviewButton: () => {},

      ...override,
    };

    return <CommitPreviewContainer {...props} />;
  }

  it('renders a loading spinner while the repository is loading', function() {
    const wrapper = mount(buildApp());
    assert.isTrue(wrapper.find('LoadingView').exists());
  });

  it('renders a loading spinner while the file patch is being loaded', async function() {
    await repository.getLoadPromise();
    const patchPromise = repository.getStagedChangesPatch();
    let resolveDelayedPromise = () => {};
    const delayedPromise = new Promise(resolve => {
      resolveDelayedPromise = resolve;
    });
    sinon.stub(repository, 'getStagedChangesPatch').returns(delayedPromise);

    const wrapper = mount(buildApp());

    assert.isTrue(wrapper.find('LoadingView').exists());
    resolveDelayedPromise(patchPromise);
    await assert.async.isFalse(wrapper.update().find('LoadingView').exists());
  });

  it('renders a CommitPreviewController once the file patch is loaded', async function() {
    await repository.getLoadPromise();
    const patch = await repository.getStagedChangesPatch();

    const wrapper = mount(buildApp());
    await assert.async.isTrue(wrapper.update().find('CommitPreviewController').exists());
    assert.strictEqual(wrapper.find('CommitPreviewController').prop('multiFilePatch'), patch);
  });
});
