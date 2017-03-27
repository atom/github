import React from 'react';
import {shallow, mount} from 'enzyme';

import fs from 'fs';
import path from 'path';

import {Point} from 'atom';

import {cloneRepository, buildRepository} from '../helpers';
import FilePatch from '../../lib/models/file-patch';
import FilePatchController from '../../lib/controllers/file-patch-controller';
import Hunk from '../../lib/models/hunk';
import HunkLine from '../../lib/models/hunk-line';
import EventWatcher from '../../lib/event-watcher';

describe('FilePatchController', function() {
  let atomEnv, commandRegistry, workspace;
  let component, eventWatcher;
  let discardLines, didSurfaceFile, didDiveIntoFilePath, quietlySelectItem, undoLastDiscard;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
    commandRegistry = atomEnv.commands;
    workspace = atomEnv.workspace;

    eventWatcher = new EventWatcher();

    discardLines = sinon.spy();
    didSurfaceFile = sinon.spy();
    didDiveIntoFilePath = sinon.spy();
    quietlySelectItem = sinon.spy();
    undoLastDiscard = sinon.spy();

    const filePatch = new FilePatch('a.txt', 'a.txt', 'modified', [new Hunk(1, 1, 1, 3, '', [])]);

    component = (
      <FilePatchController
        commandRegistry={commandRegistry}
        filePatch={filePatch}
        stagingStatus="unstaged"
        isPartiallyStaged={false}
        isAmending={false}
        eventWatcher={eventWatcher}
        discardLines={discardLines}
        didSurfaceFile={didSurfaceFile}
        didDiveIntoFilePath={didDiveIntoFilePath}
        quietlySelectItem={quietlySelectItem}
        undoLastDiscard={undoLastDiscard}
      />
    );
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  it('bases its tab title on the staging status', function() {
    const filePatch1 = new FilePatch('a.txt', 'a.txt', 'modified', [new Hunk(1, 1, 1, 3, '', [])]);

    const wrapper = shallow(React.cloneElement(component, {
      filePatch: filePatch1,
      stagingStatus: 'unstaged',
    }));

    assert.equal(wrapper.instance().getTitle(), 'Unstaged Changes: a.txt');

    const changeHandler = sinon.spy();
    wrapper.instance().onDidChangeTitle(changeHandler);

    wrapper.setProps({stagingStatus: 'staged'});

    const actualTitle = wrapper.instance().getTitle();
    assert.equal(actualTitle, 'Staged Changes: a.txt');
    assert.isTrue(changeHandler.calledWith(actualTitle));
  });

  it('renders FilePatchView only if FilePatch has hunks', function() {
    const emptyFilePatch = new FilePatch('a.txt', 'a.txt', 'modified', []);

    const wrapper = mount(React.cloneElement(component, {
      filePatch: emptyFilePatch,
    }));

    assert.isFalse(wrapper.find('FilePatchView').exists());

    const hunk1 = new Hunk(0, 0, 1, 1, '', [new HunkLine('line-1', 'added', 1, 1)]);
    const filePatch = new FilePatch('a.txt', 'a.txt', 'modified', [hunk1]);

    wrapper.setProps({filePatch});
    assert.isTrue(wrapper.find('FilePatchView').exists());
  });

  it('updates when a new FilePatch is passed', function() {
    const hunk1 = new Hunk(5, 5, 2, 1, '', [new HunkLine('line-1', 'added', -1, 5)]);
    const hunk2 = new Hunk(8, 8, 1, 1, '', [new HunkLine('line-5', 'deleted', 8, -1)]);
    const filePatch0 = new FilePatch('a.txt', 'a.txt', 'modified', [hunk1, hunk2]);

    const wrapper = shallow(React.cloneElement(component, {
      filePatch: filePatch0,
    }));

    const view0 = wrapper.find('FilePatchView').shallow();
    assert.isTrue(view0.find({hunk: hunk1}).exists());
    assert.isTrue(view0.find({hunk: hunk2}).exists());

    const hunk3 = new Hunk(8, 8, 1, 1, '', [new HunkLine('line-10', 'modified', 10, 10)]);
    const filePatch1 = new FilePatch('a.txt', 'a.txt', 'modified', [hunk1, hunk3]);

    wrapper.setProps({filePatch: filePatch1});

    const view1 = wrapper.find('FilePatchView').shallow();
    assert.isTrue(view1.find({hunk: hunk1}).exists());
    assert.isTrue(view1.find({hunk: hunk3}).exists());
    assert.isFalse(view1.find({hunk: hunk2}).exists());
  });

  it('invokes a didSurfaceFile callback with the current file path', function() {
    const filePatch = new FilePatch('a.txt', 'a.txt', 'modified', [new Hunk(1, 1, 1, 3, '', [])]);
    const wrapper = mount(React.cloneElement(component, {
      filePatch,
      stagingStatus: 'unstaged',
    }));

    commandRegistry.dispatch(wrapper.find('FilePatchView').getDOMNode(), 'core:move-right');
    assert.isTrue(didSurfaceFile.calledWith('a.txt', 'unstaged'));
  });

  it('ignores being passed a null repository', async function() {
    const workdirPath = await cloneRepository('multi-line-file');
    const repository = await buildRepository(workdirPath);
    const filePatch = new FilePatch('a.txt', 'a.txt', 'modified', [new Hunk(1, 1, 1, 3, '', [])]);

    const wrapper = shallow(React.cloneElement(component, {
      filePatch,
      repository,
    }));

    assert.equal(wrapper.instance().props.repository, repository);
    // This is mostly ensuring that the render here doesn't throw.
    wrapper.setProps({repository: null});
    assert.isNull(wrapper.instance().props.repository);
  });

  describe('integration tests', function() {
    it('stages and unstages hunks when the stage button is clicked on hunk views with no individual lines selected', async function() {
      const workdirPath = await cloneRepository('multi-line-file');
      const repository = await buildRepository(workdirPath);
      const filePath = path.join(workdirPath, 'sample.js');
      const originalLines = fs.readFileSync(filePath, 'utf8').split('\n');
      const unstagedLines = originalLines.slice();
      unstagedLines.splice(1, 1,
        'this is a modified line',
        'this is a new line',
        'this is another new line',
      );
      unstagedLines.splice(11, 2, 'this is a modified line');
      fs.writeFileSync(filePath, unstagedLines.join('\n'));

      const unstagedFilePatch = await repository.getFilePatchForPath('sample.js');

      const wrapper = mount(React.cloneElement(component, {
        filePatch: unstagedFilePatch,
        stagingStatus: 'unstaged',
        repository,
      }));

      // selectNext()
      commandRegistry.dispatch(wrapper.find('FilePatchView').getDOMNode(), 'core:move-down');

      const hunkView0 = wrapper.find('HunkView').at(0);
      assert.isFalse(hunkView0.prop('isSelected'));

      const opPromise0 = eventWatcher.getStageOperationPromise();
      hunkView0.find('button.github-HunkView-stageButton').simulate('click');
      await opPromise0;

      const expectedStagedLines = originalLines.slice();
      expectedStagedLines.splice(1, 1,
        'this is a modified line',
        'this is a new line',
        'this is another new line',
      );
      assert.autocrlfEqual(await repository.readFileFromIndex('sample.js'), expectedStagedLines.join('\n'));

      const updatePromise0 = eventWatcher.getPatchChangedPromise();
      const stagedFilePatch = await repository.getFilePatchForPath('sample.js', {staged: true});
      wrapper.setProps({
        filePatch: stagedFilePatch,
        stagingStatus: 'staged',
      });
      await updatePromise0;

      const hunkView1 = wrapper.find('HunkView').at(0);
      const opPromise1 = eventWatcher.getStageOperationPromise();
      hunkView1.find('button.github-HunkView-stageButton').simulate('click');
      await opPromise1;

      assert.autocrlfEqual(await repository.readFileFromIndex('sample.js'), originalLines.join('\n'));
    });

    it('stages and unstages individual lines when the stage button is clicked on a hunk with selected lines', async function() {
      const workdirPath = await cloneRepository('multi-line-file');
      const repository = await buildRepository(workdirPath);
      const filePath = path.join(workdirPath, 'sample.js');
      const originalLines = fs.readFileSync(filePath, 'utf8').split('\n');

      // write some unstaged changes
      const unstagedLines = originalLines.slice();
      unstagedLines.splice(1, 1,
        'this is a modified line',
        'this is a new line',
        'this is another new line',
      );
      unstagedLines.splice(11, 2, 'this is a modified line');
      fs.writeFileSync(filePath, unstagedLines.join('\n'));
      const unstagedFilePatch0 = await repository.getFilePatchForPath('sample.js');

      // stage a subset of lines from first hunk
      const wrapper = mount(React.cloneElement(component, {
        filePatch: unstagedFilePatch0,
        stagingStatus: 'unstaged',
        repository,
      }));

      const opPromise0 = eventWatcher.getStageOperationPromise();
      const hunkView0 = wrapper.find('HunkView').at(0);
      hunkView0.find('LineView').at(1).simulate('mousedown', {button: 0, detail: 1});
      hunkView0.find('LineView').at(3).simulate('mousemove', {});
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
      const updatePromise1 = eventWatcher.getPatchChangedPromise();
      const unstagedFilePatch1 = await repository.getFilePatchForPath('sample.js');
      wrapper.setProps({filePatch: unstagedFilePatch1});
      await updatePromise1;

      const opPromise1 = eventWatcher.getStageOperationPromise();
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
      const updatePromise2 = eventWatcher.getPatchChangedPromise();
      const stagedFilePatch2 = await repository.getFilePatchForPath('sample.js', {staged: true});
      wrapper.setProps({
        filePatch: stagedFilePatch2,
        stagingStatus: 'staged',
      });
      await updatePromise2;

      const hunkView2 = wrapper.find('HunkView').at(0);
      hunkView2.find('LineView').at(1).simulate('mousedown', {button: 0, detail: 1});
      window.dispatchEvent(new MouseEvent('mouseup'));
      hunkView2.find('LineView').at(2).simulate('mousedown', {button: 0, detail: 1, metaKey: true});
      window.dispatchEvent(new MouseEvent('mouseup'));

      const opPromise2 = eventWatcher.getStageOperationPromise();
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
      const updatePromise3 = eventWatcher.getPatchChangedPromise();
      const stagedFilePatch3 = await repository.getFilePatchForPath('sample.js', {staged: true});
      wrapper.setProps({
        filePatch: stagedFilePatch3,
      });
      await updatePromise3;

      commandRegistry.dispatch(wrapper.find('FilePatchView').getDOMNode(), 'github:toggle-patch-selection-mode');

      const opPromise3 = eventWatcher.getStageOperationPromise();
      wrapper.find('HunkView').at(0).find('button.github-HunkView-stageButton').simulate('click');
      await opPromise3;

      assert.autocrlfEqual(await repository.readFileFromIndex('sample.js'), originalLines.join('\n'));
    });

    // https://github.com/atom/github/issues/417
    describe('when unstaging the last lines/hunks from a file', function() {
      it('removes added files from index when last hunk is unstaged', async function() {
        const workdirPath = await cloneRepository('three-files');
        const repository = await buildRepository(workdirPath);
        const filePath = path.join(workdirPath, 'new-file.txt');

        fs.writeFileSync(filePath, 'foo\n');
        await repository.stageFiles(['new-file.txt']);
        const stagedFilePatch = await repository.getFilePatchForPath('new-file.txt', {staged: true});

        const wrapper = mount(React.cloneElement(component, {
          filePatch: stagedFilePatch,
          stagingStatus: 'staged',
          repository,
        }));

        const opPromise = eventWatcher.getStageOperationPromise();
        wrapper.find('HunkView').at(0).find('button.github-HunkView-stageButton').simulate('click');
        await opPromise;

        const stagedChanges = await repository.getStagedChanges();
        assert.equal(stagedChanges.length, 0);
      });

      it('removes added files from index when last lines are unstaged', async function() {
        const workdirPath = await cloneRepository('three-files');
        const repository = await buildRepository(workdirPath);
        const filePath = path.join(workdirPath, 'new-file.txt');

        fs.writeFileSync(filePath, 'foo\n');
        await repository.stageFiles(['new-file.txt']);
        const stagedFilePatch = await repository.getFilePatchForPath('new-file.txt', {staged: true});

        const wrapper = mount(React.cloneElement(component, {
          filePatch: stagedFilePatch,
          stagingStatus: 'staged',
          repository,
        }));

        const viewNode = wrapper.find('FilePatchView').getDOMNode();
        commandRegistry.dispatch(viewNode, 'github:toggle-patch-selection-mode');
        commandRegistry.dispatch(viewNode, 'core:select-all');

        const opPromise = eventWatcher.getStageOperationPromise();
        wrapper.find('HunkView').at(0).find('button.github-HunkView-stageButton').simulate('click');
        await opPromise;

        const stagedChanges = await repository.getStagedChanges();
        assert.lengthOf(stagedChanges, 0);
      });
    });

    // https://github.com/atom/github/issues/341
    describe('when duplicate staging occurs', function() {
      it('avoids patch conflicts with pending line staging operations', async function() {
        const workdirPath = await cloneRepository('multi-line-file');
        const repository = await buildRepository(workdirPath);
        const filePath = path.join(workdirPath, 'sample.js');
        const originalLines = fs.readFileSync(filePath, 'utf8').split('\n');

        // write some unstaged changes
        const unstagedLines = originalLines.slice();
        unstagedLines.splice(1, 0,
          'this is a modified line',
          'this is a new line',
          'this is another new line',
        );
        unstagedLines.splice(11, 2, 'this is a modified line');
        fs.writeFileSync(filePath, unstagedLines.join('\n'));
        const unstagedFilePatch = await repository.getFilePatchForPath('sample.js');
        const hunkViewsByHunk = new Map();
        function registerHunkView(hunk, view) { hunkViewsByHunk.set(hunk, view); }

        const controller = new FilePatchController({commandRegistry, filePatch: unstagedFilePatch, repository, stagingStatus: 'unstaged', registerHunkView});
        const view = controller.refs.filePatchView;
        let hunk = unstagedFilePatch.getHunks()[0];
        let lines = hunk.getLines();
        let hunkView = hunkViewsByHunk.get(hunk);
        hunkView.props.mousedownOnLine({button: 0, detail: 1}, hunk, lines[1]);
        view.mouseup();

        // stage lines in rapid succession
        // second stage action is a no-op since the first staging operation is in flight
        const line1StagingPromises = hunkView.props.didClickStageButton();
        hunkView.props.didClickStageButton();

        await line1StagingPromises.stageOperationPromise;
        repository.refresh(); // clear the cached file patches
        const modifiedFilePatch = await repository.getFilePatchForPath('sample.js');
        await controller.update({filePatch: modifiedFilePatch, repository, stagingStatus: 'unstaged', registerHunkView});
        await line1StagingPromises.selectionUpdatePromise;

        // assert that only line 1 has been staged
        let expectedLines = originalLines.slice();
        expectedLines.splice(1, 0,
          'this is a modified line',
        );
        let actualLines = await repository.readFileFromIndex('sample.js');
        assert.autocrlfEqual(actualLines, expectedLines.join('\n'));

        hunk = modifiedFilePatch.getHunks()[0];
        lines = hunk.getLines();
        hunkView = hunkViewsByHunk.get(hunk);
        hunkView.props.mousedownOnLine({button: 0, detail: 1}, hunk, lines[2]);
        view.mouseup();

        const line2StagingPromises = hunkView.props.didClickStageButton();
        await line2StagingPromises.stageOperationPromise;

        // assert that line 2 has now been staged
        expectedLines = originalLines.slice();
        expectedLines.splice(1, 0,
          'this is a modified line',
          'this is a new line',
        );
        actualLines = await repository.readFileFromIndex('sample.js');
        assert.autocrlfEqual(actualLines, expectedLines.join('\n'));
      });

      it('avoids patch conflicts with pending hunk staging operations', async function() {
        const workdirPath = await cloneRepository('multi-line-file');
        const repository = await buildRepository(workdirPath);
        const filePath = path.join(workdirPath, 'sample.js');
        const originalLines = fs.readFileSync(filePath, 'utf8').split('\n');

        // write some unstaged changes
        const unstagedLines = originalLines.slice();
        unstagedLines.splice(1, 0,
          'this is a modified line',
          'this is a new line',
          'this is another new line',
        );
        unstagedLines.splice(11, 2, 'this is a modified line');
        fs.writeFileSync(filePath, unstagedLines.join('\n'));
        const unstagedFilePatch = await repository.getFilePatchForPath('sample.js');
        const hunkViewsByHunk = new Map();
        function registerHunkView(hunk, view) { hunkViewsByHunk.set(hunk, view); }

        const controller = new FilePatchController({commandRegistry, filePatch: unstagedFilePatch, repository, stagingStatus: 'unstaged', registerHunkView});
        let hunk = unstagedFilePatch.getHunks()[0];
        let hunkView = hunkViewsByHunk.get(hunk);

        // ensure staging the same hunk twice does not cause issues
        // second stage action is a no-op since the first staging operation is in flight
        const hunk1StagingPromises = hunkView.props.didClickStageButton();
        hunkView.props.didClickStageButton();

        await hunk1StagingPromises.stageOperationPromise;
        repository.refresh(); // clear the cached file patches
        const modifiedFilePatch = await repository.getFilePatchForPath('sample.js');
        await controller.update({filePatch: modifiedFilePatch, repository, stagingStatus: 'unstaged', registerHunkView});
        await hunk1StagingPromises.selectionUpdatePromise;

        let expectedLines = originalLines.slice();
        expectedLines.splice(1, 0,
          'this is a modified line',
          'this is a new line',
          'this is another new line',
        );
        let actualLines = await repository.readFileFromIndex('sample.js');
        assert.autocrlfEqual(actualLines, expectedLines.join('\n'));

        hunk = modifiedFilePatch.getHunks()[0];
        hunkView = hunkViewsByHunk.get(hunk);

        const hunk2StagingPromises = hunkView.props.didClickStageButton();
        await hunk2StagingPromises.stageOperationPromise;

        expectedLines = originalLines.slice();
        expectedLines.splice(1, 0,
          'this is a modified line',
          'this is a new line',
          'this is another new line',
        );
        expectedLines.splice(11, 2, 'this is a modified line');
        actualLines = await repository.readFileFromIndex('sample.js');
        assert.autocrlfEqual(actualLines, expectedLines.join('\n'));
      });
    });
  });

  describe('openCurrentFile({lineNumber})', () => {
    it('sets the cursor on the correct line of the opened text editor', async () => {
      const workdirPath = await cloneRepository('multi-line-file');
      const repository = await buildRepository(workdirPath);

      const openFiles = filePaths => {
        return Promise.all(filePaths.map(filePath => {
          const absolutePath = path.join(repository.getWorkingDirectoryPath(), filePath);
          return workspace.open(absolutePath, {pending: filePaths.length === 1});
        }));
      };

      const hunk1 = new Hunk(5, 5, 2, 1, '', [new HunkLine('line-1', 'added', -1, 5)]);
      const filePatch = new FilePatch('sample.js', 'sample.js', 'modified', [hunk1]);
      const controller = new FilePatchController({commandRegistry, filePatch, openFiles}); // eslint-disable-line no-new

      const editor = await controller.openCurrentFile({lineNumber: 5});
      assert.deepEqual(editor.getCursorBufferPosition(), new Point(4, 0));
    });
  });
});
