import React from 'react';
import {mount} from 'enzyme';

import CommitPreviewContainer from '../../lib/containers/commit-preview-container';
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
      ...override,
    };

    return <CommitPreviewContainer {...props} />;
  }

  it('renders a loading spinner while the repository is loading', function() {
    const wrapper = mount(buildApp());
    assert.isTrue(wrapper.find('LoadingView').exists());
  });
});
