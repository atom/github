import React from 'react';
import {shallow} from 'enzyme';
import path from 'path';

import CommentPositioningContainer from '../../lib/containers/comment-positioning-container';
import File from '../../lib/models/patch/file';
import {cloneRepository, buildRepository} from '../helpers';
import {multiFilePatchBuilder} from '../builder/patch';

describe('CommentPositioningContainer', function() {
  let atomEnv, localRepository, calculationPromise, resolveCalculationPromise;

  beforeEach(async function() {
    atomEnv = global.buildAtomEnvironment();

    localRepository = await buildRepository(await cloneRepository());

    calculationPromise = new Promise(resolve => {
      resolveCalculationPromise = resolve;
    });
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function buildApp(override = {}) {
    const props = {
      localRepository,
      multiFilePatch: multiFilePatchBuilder().build().multiFilePatch,
      commentThreads: [],
      prCommitSha: '0000000000000000000000000000000000000000',
      children: () => <div />,
      translateLinesGivenDiff: () => {},
      diffPositionToFilePosition: () => {},
      didTranslate: resolveCalculationPromise,
      ...override,
    };

    return <CommentPositioningContainer {...props} />;
  }

  it('renders its child with null while loading positions', function() {
    const children = sinon.stub().returns(<div className="done" />);
    const wrapper = shallow(buildApp({children}));

    assert.isTrue(wrapper.exists('.done'));
    assert.isTrue(children.calledWith(null));
  });

  it('renders its child with a map of translated positions', async function() {
    const children = sinon.stub().returns(<div className="done" />);

    const {multiFilePatch} = multiFilePatchBuilder()
      .addFilePatch(fp => {
        fp.setOldFile(f => f.path('file0.txt'));
      })
      .addFilePatch(fp => {
        fp.setOldFile(f => f.path('file1.txt'));
      })
      .build({preserveOriginal: true});

    const commentThreads = [
      {comments: [{path: 'file0.txt', position: 1}, {path: 'ignored.txt', position: 999}]},
      {comments: [{path: 'file0.txt', position: 5}]},
      {comments: [{path: 'file1.txt', position: 11}]},
    ];

    const diffPositionToFilePosition = (rawPositions, patch) => {
      if (patch.oldPath === 'file0.txt') {
        assert.sameMembers(Array.from(rawPositions), [1, 5]);
        return new Map([
          [1, 10],
          [5, 50],
        ]);
      } else if (patch.oldPath === 'file1.txt') {
        assert.sameMembers(Array.from(rawPositions), [11]);
        return new Map([
          [11, 16],
        ]);
      } else {
        throw new Error(`Unexpected patch: ${patch.oldPath}`);
      }
    };

    const wrapper = shallow(buildApp({children, multiFilePatch, commentThreads, diffPositionToFilePosition}));

    await calculationPromise;

    assert.isTrue(wrapper.exists('.done'));
    const [translations] = children.lastCall.args;

    const file0 = translations.get('file0.txt');
    assert.sameDeepMembers(Array.from(file0.diffToFilePosition), [[1, 10], [5, 50]]);
    assert.isNull(file0.fileTranslations);

    const file1 = translations.get('file1.txt');
    assert.sameDeepMembers(Array.from(file1.diffToFilePosition), [[11, 16]]);
    assert.isNull(file1.fileTranslations);
  });

  it("provides its child with a function to force the update of a single file's translation map", async function() {
    const children = sinon.stub().returns(<div className="done" />);

    const {multiFilePatch} = multiFilePatchBuilder()
      .addFilePatch(fp => {
        fp.setOldFile(f => f.path('file0.txt'));
      })
      .addFilePatch(fp => {
        fp.setOldFile(f => f.path('file1.txt'));
      })
      .build({preserveOriginal: true});

    const commentThreads = [
      {comments: [{path: 'file0.txt', position: 1}]},
      {comments: [{path: 'file0.txt', position: 5}]},
      {comments: [{path: 'file1.txt', position: 11}]},
    ];

    const diffPositionToFilePosition = sinon.stub().callsFake((rawPositions, patch) => {
      if (patch.oldPath === 'file0.txt') {
        assert.sameMembers(Array.from(rawPositions), [1, 5]);
        return new Map([
          [1, 10],
          [5, 50],
        ]);
      } else if (patch.oldPath === 'file1.txt') {
        assert.sameMembers(Array.from(rawPositions), [11]);
        return new Map([
          [11, 16],
        ]);
      } else {
        throw new Error(`Unexpected patch: ${patch.oldPath}`);
      }
    });

    sinon.stub(localRepository, 'getDiffsForFilePath').callsFake(filePath => {
      return Promise.resolve([filePath]);
    });

    let callSeq = 0;
    const translateLinesGivenDiff = sinon.stub().callsFake((_translatedRows, diff) => {
      if (diff === 'file0.txt' && callSeq === 0) {
        return new Map([
          [10, 11],
          [50, 51],
        ]);
      } else if (diff === 'file0.txt' && callSeq === 1) {
        return new Map([
          [10, 12],
          [50, 52],
        ]);
      } else if (diff === 'file1.txt' && callSeq === 0) {
        return new Map([
          [16, 26],
        ]);
      } else {
        throw new Error(`Unexpected diff: ${diff} ${callSeq}`);
      }
    });

    const wrapper = shallow(buildApp({
      children, multiFilePatch, commentThreads, diffPositionToFilePosition, translateLinesGivenDiff,
    }));

    await calculationPromise;

    assert.isTrue(wrapper.exists('.done'));
    const [translations, updateTranslationsForFile] = children.lastCall.args;

    const before0 = translations.get('file0.txt');
    assert.sameDeepMembers(Array.from(before0.diffToFilePosition), [[1, 10], [5, 50]]);
    assert.sameDeepMembers(Array.from(before0.fileTranslations), [[10, 11], [50, 51]]);

    const before1 = translations.get('file1.txt');
    assert.sameDeepMembers(Array.from(before1.diffToFilePosition), [[11, 16]]);
    assert.sameDeepMembers(Array.from(before1.fileTranslations), [[16, 26]]);

    callSeq = 1;
    children.resetHistory();
    await updateTranslationsForFile('file0.txt');

    const [nextTranslations] = children.lastCall.args;

    const after0 = nextTranslations.get('file0.txt');
    assert.sameDeepMembers(Array.from(after0.diffToFilePosition), [[1, 10], [5, 50]]);
    assert.sameDeepMembers(Array.from(after0.fileTranslations), [[10, 12], [50, 52]]);

    const after1 = nextTranslations.get('file1.txt');
    assert.sameDeepMembers(Array.from(after1.diffToFilePosition), [[11, 16]]);
    assert.sameDeepMembers(Array.from(after1.fileTranslations), [[16, 26]]);
  });

  it('keys the translation map with absolute paths if a workdir is provided', async function() {
    const children = sinon.stub().returns(<div className="done" />);

    const {multiFilePatch} = multiFilePatchBuilder()
      .addFilePatch(fp => {
        fp.setOldFile(f => f.path('file0.txt'));
      })
      .build({preserveOriginal: true});

    const commentThreads = [
      {comments: [{path: 'file0.txt', position: 5}]},
    ];

    const diffPositionToFilePosition = (rawPositions, patch) => {
      assert.strictEqual(patch.oldPath, 'file0.txt');
      assert.sameMembers(Array.from(rawPositions), [5]);
      return new Map([[5, 50]]);
    };

    const wrapper = shallow(buildApp({
      children,
      multiFilePatch,
      commentThreads,
      diffPositionToFilePosition,
      workdir: __dirname,
    }));

    await calculationPromise;

    assert.isTrue(wrapper.exists('.done'));
    const [translations] = children.lastCall.args;

    const file0 = translations.get(path.join(__dirname, 'file0.txt'));
    assert.sameDeepMembers(Array.from(file0.diffToFilePosition), [[5, 50]]);
    assert.isNull(file0.fileTranslations);
  });

  it('uses a single content-change diff if one is available', async function() {
    const children = sinon.stub().returns(<div className="done" />);

    const {multiFilePatch} = multiFilePatchBuilder()
      .addFilePatch(fp => {
        fp.setOldFile(f => f.path('file0.txt'));
      })
      .build({preserveOriginal: true});

    const commentThreads = [
      {comments: [{path: 'file0.txt', position: 1}]},
    ];

    const diffPositionToFilePosition = (rawPositions, patch) => {
      assert.strictEqual(patch.oldPath, 'file0.txt');
      assert.sameMembers(Array.from(rawPositions), [1]);
      return new Map([[1, 2]]);
    };

    const translateLinesGivenDiff = (translatedRows, diff) => {
      assert.sameMembers(Array.from(translatedRows), [2]);
      assert.strictEqual(diff, DIFF);
      return new Map([[2, 4]]);
    };

    const DIFF = Symbol('diff payload');
    sinon.stub(localRepository, 'getDiffsForFilePath').resolves([DIFF]);

    const wrapper = shallow(buildApp({
      children,
      multiFilePatch,
      commentThreads,
      prCommitSha: '1111111111111111111111111111111111111111',
      diffPositionToFilePosition,
      translateLinesGivenDiff,
    }));

    await calculationPromise;

    assert.isTrue(wrapper.exists('.done'));

    assert.isTrue(localRepository.getDiffsForFilePath.calledWith(
      'file0.txt', '1111111111111111111111111111111111111111',
    ));

    const [translations] = children.lastCall.args;

    const file0 = translations.get('file0.txt');
    assert.sameDeepMembers(Array.from(file0.diffToFilePosition), [[1, 2]]);
    assert.sameDeepMembers(Array.from(file0.fileTranslations), [[2, 4]]);
  });

  it('identifies the content change diff when two diffs are present', async function() {
    const children = sinon.stub().returns(<div className="done" />);

    const {multiFilePatch} = multiFilePatchBuilder()
      .addFilePatch(fp => {
        fp.setOldFile(f => f.path('file0.txt'));
      })
      .build({preserveOriginal: true});

    const commentThreads = [
      {comments: [{path: 'file0.txt', position: 1}]},
    ];

    const diffs = [
      {oldPath: 'file0.txt', oldMode: File.modes.SYMLINK},
      {oldPath: 'file0.txt', oldMode: File.modes.NORMAL},
    ];
    sinon.stub(localRepository, 'getDiffsForFilePath').resolves(diffs);

    const diffPositionToFilePosition = (rawPositions, patch) => {
      assert.strictEqual(patch.oldPath, 'file0.txt');
      assert.sameMembers(Array.from(rawPositions), [1]);
      return new Map([[1, 2]]);
    };

    const translateLinesGivenDiff = (translatedRows, diff) => {
      assert.sameMembers(Array.from(translatedRows), [2]);
      assert.strictEqual(diff, diffs[1]);
      return new Map([[2, 4]]);
    };

    const wrapper = shallow(buildApp({
      children,
      multiFilePatch,
      commentThreads,
      prCommitSha: '1111111111111111111111111111111111111111',
      diffPositionToFilePosition,
      translateLinesGivenDiff,
    }));

    await calculationPromise;

    assert.isTrue(wrapper.exists('.done'));

    const [translations] = children.lastCall.args;

    const file0 = translations.get('file0.txt');
    assert.sameDeepMembers(Array.from(file0.diffToFilePosition), [[1, 2]]);
    assert.sameDeepMembers(Array.from(file0.fileTranslations), [[2, 4]]);
  });

  it("finds the content diff if it's the first one", async function() {
    const children = sinon.stub().returns(<div className="done" />);

    const {multiFilePatch} = multiFilePatchBuilder()
      .addFilePatch(fp => {
        fp.setOldFile(f => f.path('file0.txt'));
      })
      .build({preserveOriginal: true});

    const commentThreads = [
      {comments: [{path: 'file0.txt', position: 1}]},
    ];

    const diffs = [
      {oldPath: 'file0.txt', oldMode: File.modes.NORMAL},
      {oldPath: 'file0.txt', oldMode: File.modes.SYMLINK},
    ];
    sinon.stub(localRepository, 'getDiffsForFilePath').resolves(diffs);

    const diffPositionToFilePosition = (rawPositions, patch) => {
      assert.strictEqual(patch.oldPath, 'file0.txt');
      assert.sameMembers(Array.from(rawPositions), [1]);
      return new Map([[1, 2]]);
    };

    const translateLinesGivenDiff = (translatedRows, diff) => {
      assert.sameMembers(Array.from(translatedRows), [2]);
      assert.strictEqual(diff, diffs[0]);
      return new Map([[2, 4]]);
    };

    const wrapper = shallow(buildApp({
      children,
      multiFilePatch,
      commentThreads,
      prCommitSha: '1111111111111111111111111111111111111111',
      diffPositionToFilePosition,
      translateLinesGivenDiff,
    }));

    await calculationPromise;

    assert.isTrue(wrapper.exists('.done'));

    const [translations] = children.lastCall.args;

    const file0 = translations.get('file0.txt');
    assert.sameDeepMembers(Array.from(file0.diffToFilePosition), [[1, 2]]);
    assert.sameDeepMembers(Array.from(file0.fileTranslations), [[2, 4]]);
  });
});
