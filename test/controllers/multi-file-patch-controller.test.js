import React from 'react';
import {shallow} from 'enzyme';

import MultiFilePatchController from '../../lib/controllers/multi-file-patch-controller';

describe('MultiFilePatchController', function() {
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

    return <MultiFilePatchController {...props} />;
  }

  it('renders the CommitPreviewView and passes extra props through');
});
