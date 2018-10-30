import React from 'react';
import {shallow} from 'enzyme';

import CommitPreviewController from '../lib/controllers/commit-preview-controller';

describe('CommitPreviewController', function() {
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

    return <CommitPreviewController {...props} />;
  }

  it('renders the CommitPreviewView and passes extra props through');
});
