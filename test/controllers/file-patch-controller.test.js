import React from 'react';
import {shallow, mount} from 'enzyme';
import until from 'test-until';

import fs from 'fs';
import path from 'path';

import {cloneRepository, buildRepository} from '../helpers';
import FilePatch from '../../lib/models/file-patch';
import FilePatchController from '../../lib/controllers/file-patch-controller';
import Hunk from '../../lib/models/hunk';
import HunkLine from '../../lib/models/hunk-line';
import ResolutionProgress from '../../lib/models/conflicts/resolution-progress';
import Switchboard from '../../lib/switchboard';

function createFilePatch(oldFilePath, newFilePath, status, hunks) {
  const oldFile = new FilePatch.File({path: oldFilePath});
  const newFile = new FilePatch.File({path: newFilePath});
  const patch = new FilePatch.Patch({status, hunks});

  return new FilePatch(oldFile, newFile, patch);
}

let atomEnv, commandRegistry, tooltips, deserializers;
let switchboard, getFilePatchForPath;
let discardLines, didSurfaceFile, didDiveIntoFilePath, quietlySelectItem, undoLastDiscard, openFiles, getRepositoryForWorkdir;
let getSelectedStagingViewItems, resolutionProgress;

function createComponent(repository, filePath) {
  atomEnv = global.buildAtomEnvironment();
  commandRegistry = atomEnv.commands;
  deserializers = atomEnv.deserializers;
  tooltips = atomEnv.tooltips;

  switchboard = new Switchboard();

  discardLines = sinon.spy();
  didSurfaceFile = sinon.spy();
  didDiveIntoFilePath = sinon.spy();
  quietlySelectItem = sinon.spy();
  undoLastDiscard = sinon.spy();
  openFiles = sinon.spy();
  getSelectedStagingViewItems = sinon.spy();


  getRepositoryForWorkdir = () => repository;
  resolutionProgress = new ResolutionProgress();

  FilePatchController.resetConfirmedLargeFilePatches();

  return (
    <FilePatchController
      commandRegistry={commandRegistry}
      deserializers={deserializers}
      tooltips={tooltips}
      resolutionProgress={resolutionProgress}
      filePath={filePath}
      initialStagingStatus="unstaged"
      isPartiallyStaged={false}
      isAmending={false}
      switchboard={switchboard}
      discardLines={discardLines}
      didSurfaceFile={didSurfaceFile}
      didDiveIntoFilePath={didDiveIntoFilePath}
      quietlySelectItem={quietlySelectItem}
      undoLastDiscard={undoLastDiscard}
      openFiles={openFiles}
      getRepositoryForWorkdir={getRepositoryForWorkdir}
      workingDirectoryPath={repository.getWorkingDirectoryPath()}
      getSelectedStagingViewItems={getSelectedStagingViewItems}
      uri={'some/uri'}
    />
  );
}

describe('FilePatchController', function() {
  afterEach(function() {
    atomEnv.destroy();
  });

  describe('unit tests', function() {
    let workdirPath, repository, filePath, component;
    beforeEach(async function() {
      workdirPath = await cloneRepository('multi-line-file');
      repository = await buildRepository(workdirPath);
      filePath = 'sample.js';
      component = createComponent(repository, filePath);

      getFilePatchForPath = sinon.stub(repository, 'getFilePatchForPath');
    });

    it('bases its tab title on the staging status', function() {
      const wrapper = mount(React.cloneElement(component, {filePath}));

      assert.equal(wrapper.instance().getTitle(), `Unstaged Changes: ${filePath}`);

      const changeHandler = sinon.spy();
      wrapper.instance().onDidChangeTitle(changeHandler);

      wrapper.setState({stagingStatus: 'staged'});

      const actualTitle = wrapper.instance().getTitle();
      assert.equal(actualTitle, `Staged Changes: ${filePath}`);
      assert.isTrue(changeHandler.called);
    });

    describe('when the FilePatch has many lines', function() {
      it('renders a confirmation widget', async function() {

        const hunk1 = new Hunk(0, 0, 1, 1, '', [
          new HunkLine('line-1', 'added', 1, 1),
          new HunkLine('line-2', 'added', 2, 2),
          new HunkLine('line-3', 'added', 3, 3),
          new HunkLine('line-4', 'added', 4, 4),
          new HunkLine('line-5', 'added', 5, 5),
          new HunkLine('line-6', 'added', 6, 6),
        ]);
        const filePatch = createFilePatch(filePath, filePath, 'modified', [hunk1]);

        getFilePatchForPath.returns(filePatch);

        const wrapper = mount(React.cloneElement(component, {
          filePath, largeDiffLineThreshold: 5,
        }));

        await assert.async.match(wrapper.text(), /large diff/);
      });

      it('renders the full diff when the confirmation is clicked', async function() {
        const hunk = new Hunk(0, 0, 1, 1, '', [
          new HunkLine('line-1', 'added', 1, 1),
          new HunkLine('line-2', 'added', 2, 2),
          new HunkLine('line-3', 'added', 3, 3),
          new HunkLine('line-4', 'added', 4, 4),
          new HunkLine('line-5', 'added', 5, 5),
          new HunkLine('line-6', 'added', 6, 6),
        ]);
        const filePatch = createFilePatch(filePath, filePath, 'modified', [hunk]);
        getFilePatchForPath.returns(filePatch);

        const wrapper = mount(React.cloneElement(component, {
          filePath, largeDiffLineThreshold: 5,
        }));


        await assert.async.isTrue(wrapper.find('.large-file-patch').exists());
        wrapper.find('.large-file-patch').find('button').simulate('click');
        assert.isTrue(wrapper.find('HunkView').exists());
      });

      it('renders the full diff if the file has been confirmed before', async function() {
        const hunk = new Hunk(0, 0, 1, 1, '', [
          new HunkLine('line-1', 'added', 1, 1),
          new HunkLine('line-2', 'added', 2, 2),
          new HunkLine('line-3', 'added', 3, 3),
          new HunkLine('line-4', 'added', 4, 4),
          new HunkLine('line-5', 'added', 5, 5),
          new HunkLine('line-6', 'added', 6, 6),
        ]);
        const filePatch1 = createFilePatch(filePath, filePath, 'modified', [hunk]);
        const filePatch2 = createFilePatch('b.txt', 'b.txt', 'modified', [hunk]);

        getFilePatchForPath.returns(filePatch1);

        const wrapper = mount(React.cloneElement(component, {
          filePath: filePatch1.getPath(), largeDiffLineThreshold: 5,
        }));

        await assert.async.isTrue(wrapper.find('.large-file-patch').exists());
        wrapper.find('.large-file-patch').find('button').simulate('click');
        assert.isTrue(wrapper.find('HunkView').exists());

        getFilePatchForPath.returns(filePatch2);
        wrapper.setProps({filePath: filePatch2.getPath()});
        await assert.async.isTrue(wrapper.find('.large-file-patch').exists());

        getFilePatchForPath.returns(filePatch1);
        wrapper.setProps({filePath: filePatch1.getPath()});
        assert.isTrue(wrapper.find('HunkView').exists());
      });
    });

    describe('onRepoRefresh', function() {
      it('sets the correct FilePatch as state', async function() {
        repository.getFilePatchForPath.restore();
        fs.writeFileSync(path.join(workdirPath, filePath), 'change', 'utf8');

        const wrapper = mount(React.cloneElement(component, {filePath, initialStagingStatus: 'unstaged'}));

        await assert.async.isNotNull(wrapper.state('filePatch'));

        const originalFilePatch = wrapper.state('filePatch');
        assert.equal(wrapper.state('stagingStatus'), 'unstaged');

        fs.writeFileSync(path.join(workdirPath, 'file.txt'), 'change\nand again!', 'utf8');
        repository.refresh();
        await wrapper.instance().onRepoRefresh(repository);

        assert.notEqual(originalFilePatch, wrapper.state('filePatch'));
        assert.equal(wrapper.state('stagingStatus'), 'unstaged');
      });
    });

    // https://github.com/atom/github/issues/505
    describe('getFilePatchForPath(filePath, staged, isAmending)', function() {
      it('calls repository.getFilePatchForPath with amending: true only if staged is true', async () => {
        const wrapper = mount(React.cloneElement(component, {filePath, initialStagingStatus: 'unstaged'}));

        await wrapper.instance().repositoryObserver.getLastModelDataRefreshPromise();
        repository.getFilePatchForPath.reset();

        await wrapper.instance().getFilePatchForPath(filePath, false, true);
        assert.equal(repository.getFilePatchForPath.callCount, 1);
        assert.deepEqual(repository.getFilePatchForPath.args[0], [filePath, {staged: false, amending: false}]);
      });
    });

    it('renders FilePatchView only if FilePatch has hunks', async function() {
      const emptyFilePatch = createFilePatch(filePath, filePath, 'modified', []);
      getFilePatchForPath.returns(emptyFilePatch);

      const wrapper = mount(React.cloneElement(component, {filePath}));

      assert.isTrue(wrapper.find('FilePatchView').exists());
      assert.isTrue(wrapper.find('FilePatchView').text().includes('File has no contents'));

      const hunk1 = new Hunk(0, 0, 1, 1, '', [new HunkLine('line-1', 'added', 1, 1)]);
      const filePatch = createFilePatch(filePath, filePath, 'modified', [hunk1]);
      getFilePatchForPath.returns(filePatch);

      wrapper.instance().onRepoRefresh(repository);
      await assert.async.isTrue(wrapper.find('HunkView').exists());
      assert.isTrue(wrapper.find('HunkView').text().includes('@@ -0,1 +0,1 @@'));
    });

    it('updates the FilePatch after a repo update', async function() {
      const hunk1 = new Hunk(5, 5, 2, 1, '', [new HunkLine('line-1', 'added', -1, 5)]);
      const hunk2 = new Hunk(8, 8, 1, 1, '', [new HunkLine('line-5', 'deleted', 8, -1)]);
      const filePatch0 = createFilePatch(filePath, filePath, 'modified', [hunk1, hunk2]);
      getFilePatchForPath.returns(filePatch0);

      const wrapper = shallow(React.cloneElement(component, {filePath}));

      let view0;
      await until(() => {
        view0 = wrapper.find('FilePatchView').shallow();
        return view0.find({hunk: hunk1}).exists();
      });
      assert.isTrue(view0.find({hunk: hunk2}).exists());

      const hunk3 = new Hunk(8, 8, 1, 1, '', [new HunkLine('line-10', 'modified', 10, 10)]);
      const filePatch1 = createFilePatch(filePath, filePath, 'modified', [hunk1, hunk3]);
      getFilePatchForPath.returns(filePatch1);

      wrapper.instance().onRepoRefresh(repository);
      let view1;
      await until(() => {
        view1 = wrapper.find('FilePatchView').shallow();
        return view1.find({hunk: hunk3}).exists();
      });
      assert.isTrue(view1.find({hunk: hunk1}).exists());
      assert.isFalse(view1.find({hunk: hunk2}).exists());
    });

    it('invokes a didSurfaceFile callback with the current file path', async function() {
      const filePatch = createFilePatch(filePath, filePath, 'modified', [new Hunk(1, 1, 1, 3, '', [])]);
      getFilePatchForPath.returns(filePatch);

      const wrapper = mount(React.cloneElement(component, {filePath}));

      await assert.async.isTrue(wrapper.find('FilePatchView').exists());
      commandRegistry.dispatch(wrapper.find('FilePatchView').getDOMNode(), 'core:move-right');
      assert.isTrue(didSurfaceFile.calledWith(filePath, 'unstaged'));
    });

    describe('openCurrentFile({lineNumber})', () => {
      it('sets the cursor on the correct line of the opened text editor', async function() {
        const editorSpy = {
          relativePath: null,
          scrollToBufferPosition: sinon.spy(),
          setCursorBufferPosition: sinon.spy(),
        };

        const openFilesStub = relativePaths => {
          assert.lengthOf(relativePaths, 1);
          editorSpy.relativePath = relativePaths[0];
          return Promise.resolve([editorSpy]);
        };

        const hunk = new Hunk(5, 5, 2, 1, '', [new HunkLine('line-1', 'added', -1, 5)]);
        const filePatch = createFilePatch(filePath, filePath, 'modified', [hunk]);
        getFilePatchForPath.returns(filePatch);

        const wrapper = mount(React.cloneElement(component, {
          filePath,
          openFiles: openFilesStub,
        }));

        await assert.async.isTrue(wrapper.find('HunkView').exists());

        wrapper.find('LineView').simulate('mousedown', {button: 0, detail: 1});
        window.dispatchEvent(new MouseEvent('mouseup'));
        commandRegistry.dispatch(wrapper.find('FilePatchView').getDOMNode(), 'github:open-file');

        await assert.async.isTrue(editorSpy.setCursorBufferPosition.called);

        assert.isTrue(editorSpy.relativePath === filePath);

        const scrollCall = editorSpy.scrollToBufferPosition.firstCall;
        assert.isTrue(scrollCall.args[0].isEqual([4, 0]));
        assert.deepEqual(scrollCall.args[1], {center: true});

        const cursorCall = editorSpy.setCursorBufferPosition.firstCall;
        assert.isTrue(cursorCall.args[0].isEqual([4, 0]));
      });
    });
  });

  describe('integration tests', function() {
    describe('handling symlink files', function() {
      async function indexModeAndOid(repository, filename) {
        const output = await repository.git.exec(['ls-files', '-s', '--', filename]);
        if (output) {
          const parts = output.split(' ');
          return {mode: parts[0], oid: parts[1]};
        } else {
          return null;
        }
      }

      it('stages symlink change when staging added lines that depend on change', async function() {
        const workingDirPath = await cloneRepository('symlinks');
        const repository = await buildRepository(workingDirPath);

        repository.git.exec(['config', 'core.symlinks', 'true']);

        const deletedSymlinkAddedFilePath = 'symlink.txt';
        fs.unlinkSync(path.join(workingDirPath, deletedSymlinkAddedFilePath));
        fs.writeFileSync(path.join(workingDirPath, deletedSymlinkAddedFilePath), 'qux\nfoo\nbar\nbaz\nzoo\n', 'utf8');

        const component = createComponent(repository, deletedSymlinkAddedFilePath);

        const wrapper = mount(React.cloneElement(component, {filePath: deletedSymlinkAddedFilePath, initialStagingStatus: 'unstaged'}));

        assert.equal((await indexModeAndOid(repository, deletedSymlinkAddedFilePath)).mode, '120000');

        await assert.async.isTrue(wrapper.find('HunkView').exists());
        const opPromise0 = switchboard.getFinishStageOperationPromise();
        const hunkView0 = wrapper.find('HunkView').at(0);
        hunkView0.find('LineView').at(1).find('.github-HunkView-line').simulate('mousedown', {button: 0, detail: 1});
        hunkView0.find('LineView').at(2).find('.github-HunkView-line').simulate('mousemove', {});
        window.dispatchEvent(new MouseEvent('mouseup'));
        hunkView0.find('button.github-HunkView-stageButton').simulate('click');
        await opPromise0;

        repository.refresh();
        assert.autocrlfEqual(await repository.readFileFromIndex(deletedSymlinkAddedFilePath), 'foo\nbar\n');
        assert.equal((await indexModeAndOid(repository, deletedSymlinkAddedFilePath)).mode, '100644');
      });

      it('stages symlink change when staging deleted lines that depend on change', async function() {
        const workingDirPath = await cloneRepository('symlinks');
        const repository = await buildRepository(workingDirPath);

        const deletedFileAddedSymlinkPath = 'a.txt';
        fs.unlinkSync(path.join(workingDirPath, deletedFileAddedSymlinkPath));
        fs.symlinkSync(path.join(workingDirPath, 'regular-file.txt'), path.join(workingDirPath, deletedFileAddedSymlinkPath));
        await repository.stageFiles([deletedFileAddedSymlinkPath]);

        const component = createComponent(repository, deletedFileAddedSymlinkPath);

        assert.equal((await indexModeAndOid(repository, deletedFileAddedSymlinkPath)).mode, '120000');
        const wrapper = mount(React.cloneElement(component, {filePath: deletedFileAddedSymlinkPath, initialStagingStatus: 'staged'}));

        await assert.async.isTrue(wrapper.find('HunkView').exists());
        const opPromise0 = switchboard.getFinishStageOperationPromise();
        const hunkView0 = wrapper.find('HunkView').at(0);
        hunkView0.find('LineView').at(1).find('.github-HunkView-line').simulate('mousedown', {button: 0, detail: 1});
        hunkView0.find('LineView').at(2).find('.github-HunkView-line').simulate('mousemove', {});
        window.dispatchEvent(new MouseEvent('mouseup'));
        hunkView0.find('button.github-HunkView-stageButton').simulate('click');
        await opPromise0;

        repository.refresh();
        assert.autocrlfEqual(await repository.readFileFromIndex(deletedFileAddedSymlinkPath), 'bar\nbaz\n');
        assert.equal((await indexModeAndOid(repository, deletedFileAddedSymlinkPath)).mode, '100644');
      });

      it('stages file deletion when all deleted lines are staged', async function() {
        const workingDirPath = await cloneRepository('symlinks');
        const repository = await buildRepository(workingDirPath);
        await repository.getLoadPromise();

        const deletedFileAddedSymlinkPath = 'a.txt';
        fs.unlinkSync(path.join(workingDirPath, deletedFileAddedSymlinkPath));
        fs.symlinkSync(path.join(workingDirPath, 'regular-file.txt'), path.join(workingDirPath, deletedFileAddedSymlinkPath));

        const component = createComponent(repository, deletedFileAddedSymlinkPath);
        const wrapper = mount(React.cloneElement(component, {filePath: deletedFileAddedSymlinkPath, initialStagingStatus: 'unstaged'}));

        assert.equal((await indexModeAndOid(repository, deletedFileAddedSymlinkPath)).mode, '100644');

        await assert.async.isTrue(wrapper.find('HunkView').exists());
        const opPromise0 = switchboard.getFinishStageOperationPromise();
        const hunkView0 = wrapper.find('HunkView').at(0);
        hunkView0.find('.github-HunkView-title').simulate('click');
        hunkView0.find('button.github-HunkView-stageButton').simulate('click');
        await opPromise0;

        repository.refresh();
        assert.isNull(await indexModeAndOid(repository, deletedFileAddedSymlinkPath)); // File is not on index, file deletion has been staged
        const {stagedFiles, unstagedFiles} = await repository.getStatusesForChangedFiles();
        assert.equal(unstagedFiles[deletedFileAddedSymlinkPath], 'added');
        assert.equal(stagedFiles[deletedFileAddedSymlinkPath], 'deleted');
      });

      it('unstages file creation when all added lines are unstaged', async function() {
        const workingDirPath = await cloneRepository('symlinks');
        const repository = await buildRepository(workingDirPath);

        repository.git.exec(['config', 'core.symlinks', 'true']);

        const deletedSymlinkAddedFilePath = 'symlink.txt';
        fs.unlinkSync(path.join(workingDirPath, deletedSymlinkAddedFilePath));
        fs.writeFileSync(path.join(workingDirPath, deletedSymlinkAddedFilePath), 'qux\nfoo\nbar\nbaz\nzoo\n', 'utf8');
        await repository.stageFiles([deletedSymlinkAddedFilePath]);

        const component = createComponent(repository, deletedSymlinkAddedFilePath);
        const wrapper = mount(React.cloneElement(component, {filePath: deletedSymlinkAddedFilePath, initialStagingStatus: 'staged'}));

        assert.equal((await indexModeAndOid(repository, deletedSymlinkAddedFilePath)).mode, '100644');

        await assert.async.isTrue(wrapper.find('HunkView').exists());
        const opPromise0 = switchboard.getFinishStageOperationPromise();
        const hunkView0 = wrapper.find('HunkView').at(0);
        hunkView0.find('.github-HunkView-title').simulate('click');
        hunkView0.find('button.github-HunkView-stageButton').simulate('click');
        await opPromise0;

        repository.refresh();
        assert.isNull(await indexModeAndOid(repository, deletedSymlinkAddedFilePath)); // File is not on index, file creation has been unstaged
        const {stagedFiles, unstagedFiles} = await repository.getStatusesForChangedFiles();
        assert.equal(unstagedFiles[deletedSymlinkAddedFilePath], 'added');
        assert.equal(stagedFiles[deletedSymlinkAddedFilePath], 'deleted');
      });
    });

    describe('handling non-symlink changes', function() {
      let workdirPath, repository, filePath, component;
      beforeEach(async function() {
        workdirPath = await cloneRepository('multi-line-file');
        repository = await buildRepository(workdirPath);
        filePath = 'sample.js';
        component = createComponent(repository, filePath);
      });

      it('stages and unstages hunks when the stage button is clicked on hunk views with no individual lines selected', async function() {
        const absFilePath = path.join(workdirPath, filePath);
        const originalLines = fs.readFileSync(absFilePath, 'utf8').split('\n');
        const unstagedLines = originalLines.slice();
        unstagedLines.splice(1, 1,
          'this is a modified line',
          'this is a new line',
          'this is another new line',
        );
        unstagedLines.splice(11, 2, 'this is a modified line');
        fs.writeFileSync(absFilePath, unstagedLines.join('\n'));

        const wrapper = mount(React.cloneElement(component, {filePath}));

        // selectNext()
        await assert.async.isTrue(wrapper.find('HunkView').exists());
        commandRegistry.dispatch(wrapper.find('FilePatchView').getDOMNode(), 'core:move-down');

        await assert.async.isTrue(wrapper.find('HunkView').exists());
        const hunkView0 = wrapper.find('HunkView').at(0);
        assert.isFalse(hunkView0.prop('isSelected'));
        const opPromise0 = switchboard.getFinishStageOperationPromise();
        hunkView0.find('button.github-HunkView-stageButton').simulate('click');
        await opPromise0;

        const expectedStagedLines = originalLines.slice();
        expectedStagedLines.splice(1, 1,
          'this is a modified line',
          'this is a new line',
          'this is another new line',
        );
        assert.autocrlfEqual(await repository.readFileFromIndex('sample.js'), expectedStagedLines.join('\n'));
        const updatePromise0 = switchboard.getChangePatchPromise();
        const stagedFilePatch = await repository.getFilePatchForPath('sample.js', {staged: true});
        wrapper.setState({
          stagingStatus: 'staged',
          filePatch: stagedFilePatch,
        });
        await updatePromise0;
        const hunkView1 = wrapper.find('HunkView').at(0);
        const opPromise1 = switchboard.getFinishStageOperationPromise();
        hunkView1.find('button.github-HunkView-stageButton').simulate('click');
        await opPromise1;
        assert.autocrlfEqual(await repository.readFileFromIndex('sample.js'), originalLines.join('\n'));
      });

      it('stages and unstages individual lines when the stage button is clicked on a hunk with selected lines', async function() {
        const absFilePath = path.join(workdirPath, filePath);

        const originalLines = fs.readFileSync(absFilePath, 'utf8').split('\n');

        // write some unstaged changes
        const unstagedLines = originalLines.slice();
        unstagedLines.splice(1, 1,
          'this is a modified line',
          'this is a new line',
          'this is another new line',
        );
        unstagedLines.splice(11, 2, 'this is a modified line');
        fs.writeFileSync(absFilePath, unstagedLines.join('\n'));

        // stage a subset of lines from first hunk
        const wrapper = mount(React.cloneElement(component, {filePath}));

        await assert.async.isTrue(wrapper.find('HunkView').exists());
        const opPromise0 = switchboard.getFinishStageOperationPromise();
        const hunkView0 = wrapper.find('HunkView').at(0);
        hunkView0.find('LineView').at(1).find('.github-HunkView-line').simulate('mousedown', {button: 0, detail: 1});
        hunkView0.find('LineView').at(3).find('.github-HunkView-line').simulate('mousemove', {});
        window.dispatchEvent(new MouseEvent('mouseup'));
        hunkView0.find('button.github-HunkView-stageButton').simulate('click');
        await opPromise0;

        repository.refresh();
        const expectedLines0 = originalLines.slice();
        expectedLines0.splice(1, 1,
          'this is a modified line',
          'this is a new line',
        );
        assert.autocrlfEqual(await repository.readFileFromIndex('sample.js'), expectedLines0.join('\n'));

        // stage remaining lines in hunk
        const updatePromise1 = switchboard.getChangePatchPromise();
        const unstagedFilePatch1 = await repository.getFilePatchForPath('sample.js');
        wrapper.setState({filePatch: unstagedFilePatch1});
        await updatePromise1;

        const opPromise1 = switchboard.getFinishStageOperationPromise();
        wrapper.find('HunkView').at(0).find('button.github-HunkView-stageButton').simulate('click');
        await opPromise1;

        repository.refresh();
        const expectedLines1 = originalLines.slice();
        expectedLines1.splice(1, 1,
          'this is a modified line',
          'this is a new line',
          'this is another new line',
        );
        assert.autocrlfEqual(await repository.readFileFromIndex('sample.js'), expectedLines1.join('\n'));

        // unstage a subset of lines from the first hunk
        const updatePromise2 = switchboard.getChangePatchPromise();
        const stagedFilePatch2 = await repository.getFilePatchForPath('sample.js', {staged: true});
        wrapper.setState({
          filePatch: stagedFilePatch2,
          stagingStatus: 'staged',
        });
        await updatePromise2;

        const hunkView2 = wrapper.find('HunkView').at(0);
        hunkView2.find('LineView').at(1).find('.github-HunkView-line')
          .simulate('mousedown', {button: 0, detail: 1});
        window.dispatchEvent(new MouseEvent('mouseup'));
        hunkView2.find('LineView').at(2).find('.github-HunkView-line')
          .simulate('mousedown', {button: 0, detail: 1, metaKey: true});
        window.dispatchEvent(new MouseEvent('mouseup'));

        const opPromise2 = switchboard.getFinishStageOperationPromise();
        hunkView2.find('button.github-HunkView-stageButton').simulate('click');
        await opPromise2;

        repository.refresh();
        const expectedLines2 = originalLines.slice();
        expectedLines2.splice(2, 0,
          'this is a new line',
          'this is another new line',
        );
        assert.autocrlfEqual(await repository.readFileFromIndex('sample.js'), expectedLines2.join('\n'));

        // unstage the rest of the hunk
        const updatePromise3 = switchboard.getChangePatchPromise();
        const stagedFilePatch3 = await repository.getFilePatchForPath('sample.js', {staged: true});
        wrapper.setState({
          filePatch: stagedFilePatch3,
        });
        await updatePromise3;

        commandRegistry.dispatch(wrapper.find('FilePatchView').getDOMNode(), 'github:toggle-patch-selection-mode');

        const opPromise3 = switchboard.getFinishStageOperationPromise();
        wrapper.find('HunkView').at(0).find('button.github-HunkView-stageButton').simulate('click');
        await opPromise3;

        assert.autocrlfEqual(await repository.readFileFromIndex('sample.js'), originalLines.join('\n'));
      });

      // https://github.com/atom/github/issues/417
      describe('when unstaging the last lines/hunks from a file', function() {
        it('removes added files from index when last hunk is unstaged', async function() {
          const absFilePath = path.join(workdirPath, 'new-file.txt');

          fs.writeFileSync(absFilePath, 'foo\n');
          await repository.stageFiles(['new-file.txt']);

          const wrapper = mount(React.cloneElement(component, {
            filePath: 'new-file.txt',
            initialStagingStatus: 'staged',
          }));

          await assert.async.isTrue(wrapper.find('HunkView').exists());

          const opPromise = switchboard.getFinishStageOperationPromise();
          wrapper.find('HunkView').at(0).find('button.github-HunkView-stageButton').simulate('click');
          await opPromise;

          const stagedChanges = await repository.getStagedChanges();
          assert.equal(stagedChanges.length, 0);
        });

        it('removes added files from index when last lines are unstaged', async function() {
          const absFilePath = path.join(workdirPath, 'new-file.txt');

          fs.writeFileSync(absFilePath, 'foo\n');
          await repository.stageFiles(['new-file.txt']);

          const wrapper = mount(React.cloneElement(component, {
            filePath: 'new-file.txt',
            initialStagingStatus: 'staged',
          }));

          await assert.async.isTrue(wrapper.find('HunkView').exists());

          const viewNode = wrapper.find('FilePatchView').getDOMNode();
          commandRegistry.dispatch(viewNode, 'github:toggle-patch-selection-mode');
          commandRegistry.dispatch(viewNode, 'core:select-all');

          const opPromise = switchboard.getFinishStageOperationPromise();
          wrapper.find('HunkView').at(0).find('button.github-HunkView-stageButton').simulate('click');
          await opPromise;

          const stagedChanges = await repository.getStagedChanges();
          assert.lengthOf(stagedChanges, 0);
        });
      });

      // https://github.com/atom/github/issues/341
      describe('when duplicate staging occurs', function() {
        it('avoids patch conflicts with pending line staging operations', async function() {
          const absFilePath = path.join(workdirPath, filePath);
          const originalLines = fs.readFileSync(absFilePath, 'utf8').split('\n');

          // write some unstaged changes
          const unstagedLines = originalLines.slice();
          unstagedLines.splice(1, 0,
            'this is a modified line',
            'this is a new line',
            'this is another new line',
          );
          unstagedLines.splice(11, 2, 'this is a modified line');
          fs.writeFileSync(absFilePath, unstagedLines.join('\n'));

          const wrapper = mount(React.cloneElement(component, {filePath}));

          await assert.async.isTrue(wrapper.find('HunkView').exists());
          const hunkView0 = wrapper.find('HunkView').at(0);
          hunkView0.find('LineView').at(1).find('.github-HunkView-line')
            .simulate('mousedown', {button: 0, detail: 1});
          window.dispatchEvent(new MouseEvent('mouseup'));

          // stage lines in rapid succession
          // second stage action is a no-op since the first staging operation is in flight
          const line1StagingPromise = switchboard.getFinishStageOperationPromise();
          hunkView0.find('.github-HunkView-stageButton').simulate('click');
          hunkView0.find('.github-HunkView-stageButton').simulate('click');
          await line1StagingPromise;

          const changePatchPromise = switchboard.getChangePatchPromise();

          // assert that only line 1 has been staged
          repository.refresh(); // clear the cached file patches
          let expectedLines = originalLines.slice();
          expectedLines.splice(1, 0,
            'this is a modified line',
          );
          let actualLines = await repository.readFileFromIndex(filePath);
          assert.autocrlfEqual(actualLines, expectedLines.join('\n'));
          await changePatchPromise;

          const hunkView1 = wrapper.find('HunkView').at(0);
          hunkView1.find('LineView').at(2).find('.github-HunkView-line')
            .simulate('mousedown', {button: 0, detail: 1});
          window.dispatchEvent(new MouseEvent('mouseup'));
          const line2StagingPromise = switchboard.getFinishStageOperationPromise();
          hunkView1.find('.github-HunkView-stageButton').simulate('click');
          await line2StagingPromise;

          // assert that line 2 has now been staged
          expectedLines = originalLines.slice();
          expectedLines.splice(1, 0,
            'this is a modified line',
            'this is a new line',
          );
          actualLines = await repository.readFileFromIndex(filePath);
          assert.autocrlfEqual(actualLines, expectedLines.join('\n'));
        });

        it('avoids patch conflicts with pending hunk staging operations', async function() {
          const absFilePath = path.join(workdirPath, filePath);
          const originalLines = fs.readFileSync(absFilePath, 'utf8').split('\n');

          // write some unstaged changes
          const unstagedLines = originalLines.slice();
          unstagedLines.splice(1, 0,
            'this is a modified line',
            'this is a new line',
            'this is another new line',
          );
          unstagedLines.splice(11, 2, 'this is a modified line');
          fs.writeFileSync(absFilePath, unstagedLines.join('\n'));

          const wrapper = mount(React.cloneElement(component, {filePath}));

          await assert.async.isTrue(wrapper.find('HunkView').exists());

          // ensure staging the same hunk twice does not cause issues
          // second stage action is a no-op since the first staging operation is in flight
          const hunk1StagingPromise = switchboard.getFinishStageOperationPromise();
          wrapper.find('HunkView').at(0).find('.github-HunkView-stageButton').simulate('click');
          wrapper.find('HunkView').at(0).find('.github-HunkView-stageButton').simulate('click');
          await hunk1StagingPromise;

          const patchPromise0 = switchboard.getChangePatchPromise();
          repository.refresh(); // clear the cached file patches
          const modifiedFilePatch = await repository.getFilePatchForPath(filePath);
          wrapper.setState({filePatch: modifiedFilePatch});
          await patchPromise0;

          let expectedLines = originalLines.slice();
          expectedLines.splice(1, 0,
            'this is a modified line',
            'this is a new line',
            'this is another new line',
          );
          let actualLines = await repository.readFileFromIndex(filePath);
          assert.autocrlfEqual(actualLines, expectedLines.join('\n'));

          const hunk2StagingPromise = switchboard.getFinishStageOperationPromise();
          wrapper.find('HunkView').at(0).find('.github-HunkView-stageButton').simulate('click');
          await hunk2StagingPromise;

          expectedLines = originalLines.slice();
          expectedLines.splice(1, 0,
            'this is a modified line',
            'this is a new line',
            'this is another new line',
          );
          expectedLines.splice(11, 2, 'this is a modified line');
          actualLines = await repository.readFileFromIndex(filePath);
          assert.autocrlfEqual(actualLines, expectedLines.join('\n'));
        });
      });
    });
  });
});
