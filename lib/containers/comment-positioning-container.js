import React from 'react';
import PropTypes from 'prop-types';
import path from 'path';
import crypto from 'crypto';
import {translateLinesGivenDiff, diffPositionToFilePosition} from 'whats-my-line';

import File from '../models/patch/file';
import {toNativePathSep} from '../helpers';

export default class CommentPositioningContainer extends React.Component {
  static propTypes = {
    localRepository: PropTypes.object.isRequired,
    multiFilePatch: PropTypes.object.isRequired,
    commentThreads: PropTypes.arrayOf(PropTypes.shape({
      comments: PropTypes.arrayOf(PropTypes.shape({
        position: PropTypes.number,
        path: PropTypes.string.isRequired,
      })).isRequired,
    })),
    prCommitSha: PropTypes.string.isRequired,
    children: PropTypes.func.isRequired,

    // If provided, normalize comment paths as relative paths to the this root directory and convert path separators
    // to platform-native
    workdir: PropTypes.string,

    // For unit test injection
    translateLinesGivenDiff: PropTypes.func,
    diffPositionToFilePosition: PropTypes.func,
    didTranslate: PropTypes.func,
  }

  static defaultProps = {
    translateLinesGivenDiff,
    diffPositionToFilePosition,
    didTranslate: /* istanbul ignore next */ () => {},
  }

  constructor(props) {
    super(props);

    this.state = {translationsByFile: null};
    this.calculateTranslations();
  }

  render() {
    return this.props.children(this.state.translationsByFile, this.updateTranslationsForFile);
  }

  async calculateTranslations() {
    const translationsByFile = new Map();

    for (const commentThread of this.props.commentThreads) {
      const rootComment = commentThread.comments[0];
      const commentPath = this.props.workdir
        ? path.join(this.props.workdir, toNativePathSep(rootComment.path))
        : rootComment.path;

      let translation = translationsByFile.get(commentPath);
      if (!translation) {
        translation = new FileTranslation(rootComment.path);
        translationsByFile.set(commentPath, translation);
      }
      translation.addCommentThread(commentThread);
    }

    await Promise.all(
      Array.from(translationsByFile.values(), translation => translation.update({
        repository: this.props.localRepository,
        multiFilePatch: this.props.multiFilePatch,
        prSha: this.props.prCommitSha,
        diffPositionFn: this.props.diffPositionToFilePosition,
        translatePositionFn: this.props.translateLinesGivenDiff,
      })),
    );

    this.setState({translationsByFile}, this.props.didTranslate);
  }

  updateTranslationsForFile = async filePath => {
    // filePath must be consistent with the keys passed to rendered children: absolute if workdir was provided,
    // relative if it was not.
    const translation = this.state.translationsByFile.get(filePath);

    // But we always use the native, workdir-relative path to invalidate the cache.
    const workdir = this.props.localRepository.getWorkingDirectoryPath();
    this.props.localRepository.observeFilesystemChange([{path: translation.getFullPath(workdir)}]);

    await translation.update({
      repository: this.props.localRepository,
      multiFilePatch: this.props.multiFilePatch,
      prSha: this.props.prCommitSha,
      diffPositionFn: this.props.diffPositionToFilePosition,
      translatePositionFn: this.props.translateLinesGivenDiff,
    });
    this.forceUpdate(this.didTranslate);
  }
}

class FileTranslation {
  constructor(relPath) {
    this.relPath = relPath;
    this.nativeRelPath = toNativePathSep(relPath);

    this.rawPositions = new Set();
    this.diffToFilePosition = new Map();
    this.fileTranslations = null;
    this.digest = null;
  }

  addCommentThread(thread) {
    this.rawPositions.add(thread.comments[0].position);
  }

  getFullPath(workdir) {
    return path.join(workdir, this.nativeRelPath);
  }

  async update({repository, multiFilePatch, prSha, diffPositionFn, translatePositionFn}) {
    const filePatch = multiFilePatch.getPatchForPath(this.nativeRelPath);
    this.diffToFilePosition = diffPositionFn(this.rawPositions, filePatch.getRawContentPatch());

    const diffs = await repository.getDiffsForFilePath(this.nativeRelPath, prSha).catch(() => []);
    let contentChangeDiff;
    if (diffs.length === 1) {
      contentChangeDiff = diffs[0];
    } else if (diffs.length === 2) {
      const [diff1, diff2] = diffs;
      if (diff1.oldMode === File.modes.SYMLINK || diff1.newMode === File.modes.SYMLINK) {
        contentChangeDiff = diff2;
      } else {
        contentChangeDiff = diff1;
      }
    }

    if (contentChangeDiff) {
      const filePositions = [...this.diffToFilePosition.values()];
      this.fileTranslations = translatePositionFn(filePositions, contentChangeDiff);

      const hash = crypto.createHash('sha256');
      hash.update(JSON.stringify(Array.from(this.fileTranslations.entries())));
      this.digest = hash.digest('hex');
    } else {
      this.fileTranslations = null;
      this.digest = null;
    }
  }
}
