import React from 'react';
import {shallow} from 'enzyme';

import CommitPreviewContainer from '../lib/';

describe('CommitPreviewContainer', function() {
  let atomEnv;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function buildApp(override = {}) {
    const props = {
      ...override,
    };

    return <CommitPreviewContainer {...props} />;
  }

  it('renders a loading spinner while the repository is loading');

  it('renders a loading spinner while the diff is being fetched');
});
