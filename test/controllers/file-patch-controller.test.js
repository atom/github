import path from 'path';
import fs from 'fs-extra';
import React from 'react';
import {shallow} from 'enzyme';

import FilePatchController from '../../lib/controllers/file-patch-controller';
import {cloneRepository, buildRepository} from '../helpers';

describe('FilePatchController', function() {
  let atomEnv, repository, filePatch;

  beforeEach(async function() {
    atomEnv = global.buildAtomEnvironment();

    const workdirPath = await cloneRepository();
    repository = await buildRepository(workdirPath);

    // a.txt: unstaged changes
    await fs.writeFile(path.join(workdirPath, 'a.txt'), '00\n01\n02\n03\n04\n05\n06');

    filePatch = await repository.getFilePatchForPath('a.txt', {staged: false});
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function buildApp(overrideProps = {}) {
    const props = {
      repository,
      stagingStatus: 'unstaged',
      relPath: 'a.txt',
      isPartiallyStaged: false,
      filePatch,
      workspace: atomEnv.workspace,
      commands: atomEnv.commands,
      tooltips: atomEnv.tooltips,
      destroy: () => {},
      discardLines: () => {},
      undoLastDiscard: () => {},
      ...overrideProps,
    };

    return <FilePatchController {...props} />;
  }

  it('passes extra props to the FilePatchView', function() {
    const extra = Symbol('extra');
    const wrapper = shallow(buildApp({extra}));

    assert.strictEqual(wrapper.find('FilePatchView').prop('extra'), extra);
  });

  it('calls undoLastDiscard through with set arguments', function() {
    const undoLastDiscard = sinon.spy();
    const wrapper = shallow(buildApp({relPath: 'b.txt', undoLastDiscard}));
    wrapper.find('FilePatchView').prop('undoLastDiscard')();

    assert.isTrue(undoLastDiscard.calledWith('b.txt', repository));
  });

  describe('diveIntoMirrorPatch()', function() {
    it('destroys the current pane and opens the staged changes', async function() {
      const destroy = sinon.spy();
      sinon.stub(atomEnv.workspace, 'open').resolves();
      const wrapper = shallow(buildApp({relPath: 'c.txt', stagingStatus: 'unstaged', destroy}));

      await wrapper.find('FilePatchView').prop('diveIntoMirrorPatch')();

      assert.isTrue(destroy.called);
      assert.isTrue(atomEnv.workspace.open.calledWith(
        'atom-github://file-patch/c.txt' +
        `?workdir=${encodeURIComponent(repository.getWorkingDirectoryPath())}&stagingStatus=staged`,
      ));
    });

    it('destroys the current pane and opens the unstaged changes', async function() {
      const destroy = sinon.spy();
      sinon.stub(atomEnv.workspace, 'open').resolves();
      const wrapper = shallow(buildApp({relPath: 'd.txt', stagingStatus: 'staged', destroy}));

      await wrapper.find('FilePatchView').prop('diveIntoMirrorPatch')();

      assert.isTrue(destroy.called);
      assert.isTrue(atomEnv.workspace.open.calledWith(
        'atom-github://file-patch/d.txt' +
        `?workdir=${encodeURIComponent(repository.getWorkingDirectoryPath())}&stagingStatus=unstaged`,
      ));
    });
  });

  describe('openFile()', function() {
    it('opens an editor on the current file', async function() {
      const wrapper = shallow(buildApp({relPath: 'a.txt', stagingStatus: 'unstaged'}));
      const editor = await wrapper.find('FilePatchView').prop('openFile')([]);

      assert.strictEqual(editor.getPath(), path.join(repository.getWorkingDirectoryPath(), 'a.txt'));
    });

    it('sets the cursor to a single position', async function() {
      const wrapper = shallow(buildApp({relPath: 'a.txt', stagingStatus: 'unstaged'}));
      const editor = await wrapper.find('FilePatchView').prop('openFile')([[1, 1]]);

      assert.deepEqual(editor.getCursorBufferPositions().map(p => p.serialize()), [[1, 1]]);
    });

    it('adds cursors at a set of positions', async function() {
      const wrapper = shallow(buildApp({relPath: 'a.txt', stagingStatus: 'unstaged'}));
      const editor = await wrapper.find('FilePatchView').prop('openFile')([[1, 1], [3, 1], [5, 0]]);

      assert.deepEqual(editor.getCursorBufferPositions().map(p => p.serialize()), [[1, 1], [3, 1], [5, 0]]);
    });
  });

  describe('toggleFile()', function() {
    it('stages the current file if unstaged', async function() {
      sinon.spy(repository, 'stageFiles');
      const wrapper = shallow(buildApp({relPath: 'a.txt', stagingStatus: 'unstaged'}));

      await wrapper.find('FilePatchView').prop('toggleFile')();

      assert.isTrue(repository.stageFiles.calledWith(['a.txt']));
    });

    it('unstages the current file if staged', async function() {
      sinon.spy(repository, 'unstageFiles');
      const wrapper = shallow(buildApp({relPath: 'a.txt', stagingStatus: 'staged'}));

      await wrapper.find('FilePatchView').prop('toggleFile')();

      assert.isTrue(repository.unstageFiles.calledWith(['a.txt']));
    });

    it('is a no-op if a staging operation is already in progress', async function() {
      sinon.stub(repository, 'stageFiles').resolves('staged');
      sinon.stub(repository, 'unstageFiles').resolves('unstaged');

      const wrapper = shallow(buildApp({relPath: 'a.txt', stagingStatus: 'unstaged'}));
      assert.strictEqual(await wrapper.find('FilePatchView').prop('toggleFile')(), 'staged');

      wrapper.setProps({stagingStatus: 'staged'});
      assert.isNull(await wrapper.find('FilePatchView').prop('toggleFile')());

      const promise = wrapper.instance().patchChangePromise;
      wrapper.setProps({filePatch: filePatch.clone()});
      await promise;

      assert.strictEqual(await wrapper.find('FilePatchView').prop('toggleFile')(), 'unstaged');
    });
  });

  describe('selected row tracking', function() {
    it('captures the selected row set', function() {
      const wrapper = shallow(buildApp());
      assert.sameMembers(Array.from(wrapper.find('FilePatchView').prop('selectedRows')), []);

      wrapper.find('FilePatchView').prop('selectedRowsChanged')(new Set([1, 2]));
      assert.sameMembers(Array.from(wrapper.find('FilePatchView').prop('selectedRows')), [1, 2]);
    });

    it('does not re-render if the row set is unchanged', function() {
      const wrapper = shallow(buildApp());
      assert.sameMembers(Array.from(wrapper.find('FilePatchView').prop('selectedRows')), []);
      wrapper.find('FilePatchView').prop('selectedRowsChanged')(new Set([1, 2]));

      assert.sameMembers(Array.from(wrapper.find('FilePatchView').prop('selectedRows')), [1, 2]);
      sinon.spy(wrapper.instance(), 'render');
      wrapper.find('FilePatchView').prop('selectedRowsChanged')(new Set([2, 1]));
      assert.sameMembers(Array.from(wrapper.find('FilePatchView').prop('selectedRows')), [1, 2]);
      assert.isFalse(wrapper.instance().render.called);
    });
  });

  describe('toggleRows()', function() {
    it('is a no-op with no selected rows', async function() {
      const wrapper = shallow(buildApp());
      assert.sameMembers(Array.from(wrapper.find('FilePatchView').prop('selectedRows')), []);

      sinon.spy(repository, 'applyPatchToIndex');

      await wrapper.find('FilePatchView').prop('toggleRows')();
      assert.isFalse(repository.applyPatchToIndex.called);
    });

    it('applies a stage patch to the index', async function() {
      const wrapper = shallow(buildApp());
      wrapper.find('FilePatchView').prop('selectedRowsChanged')(new Set([1]));

      sinon.spy(filePatch, 'getStagePatchForLines');
      sinon.spy(repository, 'applyPatchToIndex');

      await wrapper.find('FilePatchView').prop('toggleRows')();

      assert.isTrue(filePatch.getStagePatchForLines.called);
      assert.isTrue(repository.applyPatchToIndex.calledWith(filePatch.getStagePatchForLines.returnValues[0]));
    });

    it('applies an unstage patch to the index', async function() {
      await repository.stageFiles(['a.txt']);
      const otherPatch = await repository.getFilePatchForPath('a.txt', {staged: true});
      const wrapper = shallow(buildApp({filePatch: otherPatch, stagingStatus: 'staged'}));
      wrapper.find('FilePatchView').prop('selectedRowsChanged')(new Set([2]));

      sinon.spy(otherPatch, 'getUnstagePatchForLines');
      sinon.spy(repository, 'applyPatchToIndex');

      await wrapper.find('FilePatchView').prop('toggleRows')();

      assert.isTrue(otherPatch.getUnstagePatchForLines.called);
      assert.isTrue(repository.applyPatchToIndex.calledWith(otherPatch.getUnstagePatchForLines.returnValues[0]));
    });
  });

  describe('toggleModeChange()', function() {
    it("it stages an unstaged file's new mode", async function() {
      const p = path.join(repository.getWorkingDirectoryPath(), 'a.txt');
      await fs.chmod(p, 0o755);
      repository.refresh();
      const newFilePatch = await repository.getFilePatchForPath('a.txt', {staged: false});

      const wrapper = shallow(buildApp({filePatch: newFilePatch, stagingStatus: 'unstaged'}));

      sinon.spy(repository, 'stageFileModeChange');
      await wrapper.find('FilePatchView').prop('toggleModeChange')();

      assert.isTrue(repository.stageFileModeChange.calledWith('a.txt', '100755'));
    });

    it("it stages a staged file's old mode", async function() {
      const p = path.join(repository.getWorkingDirectoryPath(), 'a.txt');
      await fs.chmod(p, 0o755);
      await repository.stageFiles(['a.txt']);
      repository.refresh();
      const newFilePatch = await repository.getFilePatchForPath('a.txt', {staged: true});

      const wrapper = shallow(buildApp({filePatch: newFilePatch, stagingStatus: 'staged'}));

      sinon.spy(repository, 'stageFileModeChange');
      await wrapper.find('FilePatchView').prop('toggleModeChange')();

      assert.isTrue(repository.stageFileModeChange.calledWith('a.txt', '100644'));
    });
  });

  if (process.platform !== 'win32') {
    describe('toggleSymlinkChange', function() {
      it('handles an addition and typechange with a special repository method', async function() {
        const p = path.join(repository.getWorkingDirectoryPath(), 'waslink.txt');
        const dest = path.join(repository.getWorkingDirectoryPath(), 'destination');
        await fs.writeFile(dest, 'asdf\n', 'utf8');
        await fs.symlink(dest, p);

        await repository.stageFiles(['waslink.txt', 'destination']);
        await repository.commit('zero');

        await fs.unlink(p);
        await fs.writeFile(p, 'fdsa\n', 'utf8');

        repository.refresh();
        const symlinkPatch = await repository.getFilePatchForPath('waslink.txt', {staged: false});
        const wrapper = shallow(buildApp({filePatch: symlinkPatch, relPath: 'waslink.txt', stagingStatus: 'unstaged'}));

        sinon.spy(repository, 'stageFileSymlinkChange');

        await wrapper.find('FilePatchView').prop('toggleSymlinkChange')();

        assert.isTrue(repository.stageFileSymlinkChange.calledWith('waslink.txt'));
      });

      it('stages non-addition typechanges normally', async function() {
        const p = path.join(repository.getWorkingDirectoryPath(), 'waslink.txt');
        const dest = path.join(repository.getWorkingDirectoryPath(), 'destination');
        await fs.writeFile(dest, 'asdf\n', 'utf8');
        await fs.symlink(dest, p);

        await repository.stageFiles(['waslink.txt', 'destination']);
        await repository.commit('zero');

        await fs.unlink(p);

        repository.refresh();
        const symlinkPatch = await repository.getFilePatchForPath('waslink.txt', {staged: false});
        const wrapper = shallow(buildApp({filePatch: symlinkPatch, relPath: 'waslink.txt', stagingStatus: 'unstaged'}));

        sinon.spy(repository, 'stageFiles');

        await wrapper.find('FilePatchView').prop('toggleSymlinkChange')();

        assert.isTrue(repository.stageFiles.calledWith(['waslink.txt']));
      });

      it('handles a deletion and typechange with a special repository method', async function() {
        const p = path.join(repository.getWorkingDirectoryPath(), 'waslink.txt');
        const dest = path.join(repository.getWorkingDirectoryPath(), 'destination');
        await fs.writeFile(dest, 'asdf\n', 'utf8');
        await fs.writeFile(p, 'fdsa\n', 'utf8');

        await repository.stageFiles(['waslink.txt', 'destination']);
        await repository.commit('zero');

        await fs.unlink(p);
        await fs.symlink(dest, p);
        await repository.stageFiles(['waslink.txt']);

        repository.refresh();
        const symlinkPatch = await repository.getFilePatchForPath('waslink.txt', {staged: true});
        const wrapper = shallow(buildApp({filePatch: symlinkPatch, relPath: 'waslink.txt', stagingStatus: 'staged'}));

        sinon.spy(repository, 'stageFileSymlinkChange');

        await wrapper.find('FilePatchView').prop('toggleSymlinkChange')();

        assert.isTrue(repository.stageFileSymlinkChange.calledWith('waslink.txt'));
      });

      it('unstages non-deletion typechanges normally', async function() {
        const p = path.join(repository.getWorkingDirectoryPath(), 'waslink.txt');
        const dest = path.join(repository.getWorkingDirectoryPath(), 'destination');
        await fs.writeFile(dest, 'asdf\n', 'utf8');
        await fs.symlink(dest, p);

        await repository.stageFiles(['waslink.txt', 'destination']);
        await repository.commit('zero');

        await fs.unlink(p);

        repository.refresh();
        const symlinkPatch = await repository.getFilePatchForPath('waslink.txt', {staged: true});
        const wrapper = shallow(buildApp({filePatch: symlinkPatch, relPath: 'waslink.txt', stagingStatus: 'staged'}));

        sinon.spy(repository, 'unstageFiles');

        await wrapper.find('FilePatchView').prop('toggleSymlinkChange')();

        assert.isTrue(repository.unstageFiles.calledWith(['waslink.txt']));
      });
    });
  }

  it('calls discardLines with selected rows', function() {
    const discardLines = sinon.spy();
    const wrapper = shallow(buildApp({discardLines}));
    wrapper.find('FilePatchView').prop('selectedRowsChanged')(new Set([1, 2]));

    wrapper.find('FilePatchView').prop('discardRows')();

    assert.isTrue(discardLines.calledWith(filePatch, new Set([1, 2]), repository));
  });
});
