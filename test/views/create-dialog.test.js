import React from 'react';
import {shallow} from 'enzyme';

import CreateDialog from '../../lib/views/create-dialog';

describe('CreateDialog', function() {
  let atomEnv;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function buildApp(override = {}) {
    return <CreateDialog {...override} />;
  }

  describe('create mode', function() {
    it('shows a header for repository creation');

    it('displays form controls to configure repository owner and name');

    it('chooses public or private visibility');

    it('shows a directory selection control');

    it('shows advanced controls for clone protocol and source remote name');

    it('uses "create" text on the accept button');
  });

  describe('publish mode', function() {
    it('shows a header for repository publishing');

    it('prepopulates and disables the directory selection control');

    it('uses "publish" text on the accept button');
  });
});
