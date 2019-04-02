import React from 'react';
import PropTypes from 'prop-types';
import path from 'path';
import {translateLinesGivenDiff, diffPositionToFilePosition} from 'whats-my-line';

import {toNativePathSep} from '../helpers';

export default class CommentPositioningContainer extends React.Component {
  static propTypes = {
    multiFilePatch: PropTypes.object.isRequired,
    commentThreads: PropTypes.arrayOf(PropTypes.shape({
      thread: PropTypes.object.isRequired,
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
  }

  constructor(props) {
    super(props);

    this.state = {infoByFile: null};
    this.calculateTranslations();
  }

  async calculateTranslations() {
    const repository = this.props.localRepository;
    const infoByFile = new Map();

    this.props.commentThreads.forEach(commentThread => {
      const rootComment = commentThread.comments[0];
      const commentPath = this.props.workdir
        ? path.join(this.props.workdir, toNativePathSep(rootComment.path))
        : rootComment.path;

      let info = infoByFile.get(commentPath);
      if (!info) {
        info = {
          nativeRelPath: toNativePathSep(rootComment.path),
          rawPositions: new Set(),
        };
        infoByFile.set(commentPath, info);
      }
      info.rawPositions.add(rootComment.position);
    });

    await Promise.all([...infoByFile.entries()].map(async ([filePath, info]) => {
      const filePatch = this.props.multiFilePatch.getPatchForPath(info.nativeRelPath);
      const diffToFilePosition = diffPositionToFilePosition(info.rawPositions, filePatch.getRawContentPatch());
      info.diffToFilePosition = diffToFilePosition;

      const diffs = await repository.getDiffsForFilePath(filePath, this.props.prCommitSha);
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
        info.fileTranslations = translateLinesGivenDiff([...diffToFilePosition.values()], contentChangeDiff);
      } else {
        info.fileTranslations = null;
      }
    }));

    this.setState({infoByFile});
  }

  render() {
    return this.props.children(this.state.infoByFile);
  }
}
