import React from 'react';
import {shallow} from 'enzyme';
import path from 'path';

import {BareCreateDialogView} from '../../lib/views/create-dialog-view';
import RepositoryHomeSelectionView from '../../lib/views/repository-home-selection-view';
import {dialogRequests} from '../../lib/controllers/dialogs-controller';
import {userBuilder} from '../builder/graphql/user';

import userQuery from '../../lib/views/__generated__/createDialogView_user.graphql';

describe('CreateDialogView', function() {
  let atomEnv;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();

    atomEnv.config.set('core.projectHome', path.join('/home/me/src'));
    atomEnv.config.set('github.sourceRemoteName', 'origin');
    atomEnv.config.set('github.remoteFetchProtocol', 'https');
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function buildApp(override = {}) {
    const request = dialogRequests.create();

    return (
      <BareCreateDialogView
        request={request}
        user={userBuilder(userQuery).build()}
        isLoading={false}
        inProgress={false}
        currentWindow={atomEnv.getCurrentWindow()}
        workspace={atomEnv.workspace}
        commands={atomEnv.commands}
        config={atomEnv.config}
        {...override}
      />
    );
  }

  it('renders in a loading state when no relay data is available', function() {
    const wrapper = shallow(buildApp({user: null}));

    assert.isNull(wrapper.find(RepositoryHomeSelectionView).prop('user'));
    assert.strictEqual(wrapper.find(RepositoryHomeSelectionView).prop('selectedOwnerID'), '');
  });

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

  it('synchronizes the source remote name from Atom configuration', function() {
    const wrapper = shallow(buildApp());
    const buffer = wrapper.find('RemoteConfigurationView').prop('sourceRemoteBuffer');
    assert.strictEqual(buffer.getText(), 'origin');

    atomEnv.config.set('github.sourceRemoteName', 'upstream');
    assert.strictEqual(buffer.getText(), 'upstream');

    buffer.setText('home');
    assert.strictEqual(atomEnv.config.get('github.sourceRemoteName'), 'home');
  });

  it('synchronizes the source protocol from Atom configuration', async function() {
    const wrapper = shallow(buildApp());
    assert.strictEqual(wrapper.find('RemoteConfigurationView').prop('currentProtocol'), 'https');

    atomEnv.config.set('github.remoteFetchProtocol', 'ssh');
    assert.strictEqual(wrapper.find('RemoteConfigurationView').prop('currentProtocol'), 'ssh');

    await wrapper.find('RemoteConfigurationView').prop('didChangeProtocol')('https');
    assert.strictEqual(atomEnv.config.get('github.remoteFetchProtocol'), 'https');
  });

  it('begins with the owner ID as the viewer ID', function() {
    const user = userBuilder(userQuery)
      .id('user0')
      .build();

    const wrapper = shallow(buildApp({user}));

    assert.strictEqual(wrapper.find(RepositoryHomeSelectionView).prop('selectedOwnerID'), 'user0');
  });

  describe('initial repository name', function() {
    it('is empty if the initial local path is unspecified', function() {
      const request = dialogRequests.create();
      const wrapper = shallow(buildApp({request}));
      assert.isTrue(wrapper.find(RepositoryHomeSelectionView).prop('nameBuffer').isEmpty());
    });

    it('is the base name of the initial local path', function() {
      const request = dialogRequests.publish({localDir: path.join('/local/directory')});
      const wrapper = shallow(buildApp({request}));
      assert.strictEqual(wrapper.find(RepositoryHomeSelectionView).prop('nameBuffer').getText(), 'directory');
    });
  });

  describe('initial local path', function() {
    it('is the project home directory if unspecified', function() {
      const request = dialogRequests.create();
      const wrapper = shallow(buildApp({request}));
      assert.strictEqual(wrapper.find('DirectorySelect').prop('buffer').getText(), path.join('/home/me/src'));
    });

    it('is the provided path from the dialog request', function() {
      const request = dialogRequests.publish({localDir: path.join('/local/directory')});
      const wrapper = shallow(buildApp({request}));
      assert.strictEqual(wrapper.find('DirectorySelect').prop('buffer').getText(), path.join('/local/directory'));
    });
  });

  describe('repository name and local path name feedback', function() {
    it('matches the repository name to the local path basename when the local path is modified and the repository name is not', function() {
      const wrapper = shallow(buildApp());
      assert.isTrue(wrapper.find(RepositoryHomeSelectionView).prop('nameBuffer').isEmpty());

      wrapper.find('DirectorySelect').prop('buffer').setText(path.join('/local/directory'));
      assert.strictEqual(wrapper.find(RepositoryHomeSelectionView).prop('nameBuffer').getText(), 'directory');
    });

    it('leaves the repository name unchanged if it has been modified', function() {
      const wrapper = shallow(buildApp());
      wrapper.find(RepositoryHomeSelectionView).prop('nameBuffer').setText('repo-name');

      wrapper.find('DirectorySelect').prop('buffer').setText(path.join('/local/directory'));
      assert.strictEqual(wrapper.find(RepositoryHomeSelectionView).prop('nameBuffer').getText(), 'repo-name');
    });

    it('matches the local path basename to the repository name when the repository name is modified and the local path is not', function() {
      const wrapper = shallow(buildApp());
      assert.strictEqual(wrapper.find('DirectorySelect').prop('buffer').getText(), path.join('/home/me/src'));

      wrapper.find(RepositoryHomeSelectionView).prop('nameBuffer').setText('the-repo');
      assert.strictEqual(wrapper.find('DirectorySelect').prop('buffer').getText(), path.join('/home/me/src/the-repo'));

      wrapper.find(RepositoryHomeSelectionView).prop('nameBuffer').setText('different-name');
      assert.strictEqual(wrapper.find('DirectorySelect').prop('buffer').getText(), path.join('/home/me/src/different-name'));
    });

    it('leaves the local path unchanged if it has been modified', function() {
      const wrapper = shallow(buildApp());
      wrapper.find('DirectorySelect').prop('buffer').setText(path.join('/some/local/directory'));

      wrapper.find(RepositoryHomeSelectionView).prop('nameBuffer').setText('the-repo');
      assert.strictEqual(wrapper.find('DirectorySelect').prop('buffer').getText(), path.join('/some/local/directory'));
    });
  });

  describe('accept enablement', function() {
    it('enabled the accept button when all data is present and non-empty', function() {
      const wrapper = shallow(buildApp());

      wrapper.find(RepositoryHomeSelectionView).prop('nameBuffer').setText('the-repo');
      wrapper.find('DirectorySelect').prop('buffer').setText(path.join('/local/path'));

      assert.isTrue(wrapper.find('DialogView').prop('acceptEnabled'));
    });

    it('disables the accept button if the repo name is empty', function() {
      const wrapper = shallow(buildApp());

      wrapper.find(RepositoryHomeSelectionView).prop('nameBuffer').setText('zzz');
      wrapper.find(RepositoryHomeSelectionView).prop('nameBuffer').setText('');
      wrapper.find('DirectorySelect').prop('buffer').setText(path.join('/local/path'));

      assert.isFalse(wrapper.find('DialogView').prop('acceptEnabled'));
    });

    it('disables the accept button if the local path is empty', function() {
      const wrapper = shallow(buildApp());

      wrapper.find(RepositoryHomeSelectionView).prop('nameBuffer').setText('the-repo');
      wrapper.find('DirectorySelect').prop('buffer').setText('');

      assert.isFalse(wrapper.find('DialogView').prop('acceptEnabled'));
    });

    it('disables the accept button if the source remote name is empty', function() {
      const wrapper = shallow(buildApp());

      wrapper.find('RemoteConfigurationView').prop('sourceRemoteBuffer').setText('');

      assert.isFalse(wrapper.find('DialogView').prop('acceptEnabled'));
    });
  });

  describe('acceptance', function() {
    it('does nothing if insufficient data is available', async function() {
      const accept = sinon.spy();
      const request = dialogRequests.create();
      request.onAccept(accept);
      const wrapper = shallow(buildApp({request}));

      wrapper.find(RepositoryHomeSelectionView).prop('nameBuffer').setText('');
      await wrapper.find('DialogView').prop('accept')();

      assert.isFalse(accept.called);
    });

    it('resolves onAccept with the populated data', async function() {
      const accept = sinon.spy();
      const request = dialogRequests.create();
      request.onAccept(accept);
      const wrapper = shallow(buildApp({request}));

      wrapper.find(RepositoryHomeSelectionView).prop('didChangeOwnerID')('org-id');
      wrapper.find(RepositoryHomeSelectionView).prop('nameBuffer').setText('repo-name');
      wrapper.find('input[value="PRIVATE"]').prop('onChange')({target: {value: 'PRIVATE'}});
      wrapper.find('DirectorySelect').prop('buffer').setText(path.join('/local/path'));
      wrapper.find('RemoteConfigurationView').prop('didChangeProtocol')('ssh');
      wrapper.find('RemoteConfigurationView').prop('sourceRemoteBuffer').setText('upstream');

      await wrapper.find('DialogView').prop('accept')();

      assert.isTrue(accept.calledWith({
        ownerID: 'org-id',
        name: 'repo-name',
        visibility: 'PRIVATE',
        localPath: path.join('/local/path'),
        protocol: 'ssh',
        sourceRemoteName: 'upstream',
      }));
    });
  });
});
