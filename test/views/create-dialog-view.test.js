import React from 'react';
import {shallow} from 'enzyme';

import CreateDialogView from '../../lib/views/create-dialog-view';
import RepositoryHomeSelectionView from '../../lib/views/repository-home-selection-view';
import {dialogRequests} from '../../lib/controllers/dialogs-controller';

describe.only('CreateDialogView', function() {
  let atomEnv;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function buildApp(override = {}) {
    const request = dialogRequests.create();

    return (
      <CreateDialogView
        request={request}
        {...override}
      />
    );
  }

  it('customizes dialog text in create mode', function() {
    const createRequest = dialogRequests.create();
    const wrapper = shallow(buildApp({request: createRequest}));

    assert.include(wrapper.find('.github-Create-header').text(), 'Create GitHub repository');
    assert.isFalse(wrapper.find('DirectorySelect').prop('disabled'));
    assert.strictEqual(wrapper.find('DialogView').prop('acceptText'), 'Create');
  });

  it('customizes dialog text and disables local directory controls in publish mode', function() {
    const publishRequest = dialogRequests.publish({localDir: '/local/directory'});
    const wrapper = shallow(buildApp({request: publishRequest}));

    assert.include(wrapper.find('.github-Create-header').text(), 'Publish GitHub repository');
    assert.isTrue(wrapper.find('DirectorySelect').prop('disabled'));
    assert.strictEqual(wrapper.find('DirectorySelect').prop('buffer').getText(), '/local/directory');
    assert.strictEqual(wrapper.find('DialogView').prop('acceptText'), 'Publish');
  });

  describe('accept enablement', function() {
    it('enabled the accept button when all data is present and non-empty');

    it('disables the accept button if the repo name is empty');

    it('disables the accept button if the local path is empty');

    it('disables the accept button if the source remote name is empty');
  });
});
