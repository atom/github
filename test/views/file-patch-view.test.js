import path from 'path';
import fs from 'fs-extra';
import React from 'react';
import {shallow, mount} from 'enzyme';

import {cloneRepository, buildRepository} from '../helpers';
import FilePatchView from '../../lib/views/file-patch-view';

describe('FilePatchView', function() {
  let atomEnv, repository, filePatch;

  beforeEach(async function() {
    atomEnv = global.buildAtomEnvironment();

    const workdirPath = await cloneRepository();
    repository = await buildRepository(workdirPath);

    // a.txt: unstaged changes
    await fs.writeFile(path.join(workdirPath, 'a.txt'), 'changed\n');
    filePatch = await repository.getFilePatchForPath('a.txt', {staged: false});
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function buildApp(overrideProps = {}) {
    const props = {
      relPath: 'a.txt',
      stagingStatus: 'unstaged',
      isPartiallyStaged: false,
      filePatch,
      repository,
      tooltips: atomEnv.tooltips,

      undoLastDiscard: () => {},
      diveIntoMirrorPatch: () => {},
      openFile: () => {},
      toggleFile: () => {},
      toggleModeChange: () => {},
      toggleSymlinkChange: () => {},

      ...overrideProps,
    };

    return <FilePatchView {...props} />;
  }

  it('renders the file header', function() {
    const wrapper = shallow(buildApp());
    assert.isTrue(wrapper.find('FilePatchHeaderView').exists());
  });

  it('renders the file patch within an editor', function() {
    const wrapper = mount(buildApp());

    const editor = wrapper.find('AtomTextEditor');
    assert.strictEqual(editor.instance().getModel().getText(), filePatch.present().getText());
  });

  describe('executable mode changes', function() {
    it('does not render if the mode has not changed', function() {
      sinon.stub(filePatch, 'getOldMode').returns('100644');
      sinon.stub(filePatch, 'getNewMode').returns('100644');

      const wrapper = shallow(buildApp());
      assert.isFalse(wrapper.find('FilePatchMetaView[title="Mode change"]').exists());
    });

    it('renders change details within a meta container', function() {
      sinon.stub(filePatch, 'getOldMode').returns('100644');
      sinon.stub(filePatch, 'getNewMode').returns('100755');

      const wrapper = mount(buildApp({stagingStatus: 'unstaged'}));

      const meta = wrapper.find('FilePatchMetaView[title="Mode change"]');
      assert.isTrue(meta.exists());
      assert.strictEqual(meta.prop('actionIcon'), 'icon-move-down');
      assert.strictEqual(meta.prop('actionText'), 'Stage Mode Change');

      const details = meta.find('.github-FilePatchView-metaDetails');
      assert.strictEqual(details.text(), 'File changed modefrom non executable 100644to executable 100755');
    });

    it("stages or unstages the mode change when the meta container's action is triggered", function() {
      sinon.stub(filePatch, 'getOldMode').returns('100644');
      sinon.stub(filePatch, 'getNewMode').returns('100755');

      const toggleModeChange = sinon.stub();
      const wrapper = shallow(buildApp({stagingStatus: 'staged', toggleModeChange}));

      const meta = wrapper.find('FilePatchMetaView[title="Mode change"]');
      assert.isTrue(meta.exists());
      assert.strictEqual(meta.prop('actionIcon'), 'icon-move-up');
      assert.strictEqual(meta.prop('actionText'), 'Unstage Mode Change');

      meta.prop('action')();
      assert.isTrue(toggleModeChange.called);
    });
  });

  describe('symlink changes', function() {
    it('does not render if the symlink status is unchanged', function() {
      const wrapper = mount(buildApp());
      assert.lengthOf(wrapper.find('FilePatchMetaView').filterWhere(v => v.prop('title').startsWith('Symlink')), 0);
    });

    it('renders symlink change information within a meta container', function() {
      sinon.stub(filePatch, 'hasSymlink').returns(true);
      sinon.stub(filePatch, 'getOldSymlink').returns('/old.txt');
      sinon.stub(filePatch, 'getNewSymlink').returns('/new.txt');

      const wrapper = mount(buildApp({stagingStatus: 'unstaged'}));
      const meta = wrapper.find('FilePatchMetaView[title="Symlink changed"]');
      assert.isTrue(meta.exists());
      assert.strictEqual(meta.prop('actionIcon'), 'icon-move-down');
      assert.strictEqual(meta.prop('actionText'), 'Stage Symlink Change');
      assert.strictEqual(
        meta.find('.github-FilePatchView-metaDetails').text(),
        'Symlink changedfrom /old.txtto /new.txt.',
      );
    });

    it('stages or unstages the symlink change', function() {
      const toggleSymlinkChange = sinon.stub();
      sinon.stub(filePatch, 'hasSymlink').returns(true);
      sinon.stub(filePatch, 'getOldSymlink').returns('/old.txt');
      sinon.stub(filePatch, 'getNewSymlink').returns('/new.txt');

      const wrapper = mount(buildApp({stagingStatus: 'staged', toggleSymlinkChange}));
      const meta = wrapper.find('FilePatchMetaView[title="Symlink changed"]');
      assert.isTrue(meta.exists());
      assert.strictEqual(meta.prop('actionIcon'), 'icon-move-up');
      assert.strictEqual(meta.prop('actionText'), 'Unstage Symlink Change');

      meta.find('button.icon-move-up').simulate('click');
      assert.isTrue(toggleSymlinkChange.called);
    });

    it('renders details for a symlink deletion', function() {
      sinon.stub(filePatch, 'hasSymlink').returns(true);
      sinon.stub(filePatch, 'getOldSymlink').returns('/old.txt');
      sinon.stub(filePatch, 'getNewSymlink').returns(null);

      const wrapper = mount(buildApp());
      const meta = wrapper.find('FilePatchMetaView[title="Symlink deleted"]');
      assert.isTrue(meta.exists());
      assert.strictEqual(
        meta.find('.github-FilePatchView-metaDetails').text(),
        'Symlinkto /old.txtdeleted.',
      );
    });

    it('renders details for a symlink creation', function() {
      sinon.stub(filePatch, 'hasSymlink').returns(true);
      sinon.stub(filePatch, 'getOldSymlink').returns(null);
      sinon.stub(filePatch, 'getNewSymlink').returns('/new.txt');

      const wrapper = mount(buildApp());
      const meta = wrapper.find('FilePatchMetaView[title="Symlink created"]');
      assert.isTrue(meta.exists());
      assert.strictEqual(
        meta.find('.github-FilePatchView-metaDetails').text(),
        'Symlinkto /new.txtcreated.',
      );
    });
  });

  it('renders a header for each hunk');

  describe('hunk lines', function() {
    it('decorates added lines');

    it('decorates deleted lines');

    it('decorates the nonewlines line');
  });
});
