import {TextBuffer} from 'atom';

import Hunk from './hunk';
import File, {nullFile} from './file';
import Patch, {nullPatch} from './patch';
import {Unchanged, Addition, Deletion, NoNewline} from './region';
import FilePatch from './file-patch';

export default function buildFilePatch(diffs) {
  if (diffs.length === 0) {
    return emptyDiffFilePatch();
  } else if (diffs.length === 1) {
    return singleDiffFilePatch(diffs[0]);
  } else if (diffs.length === 2) {
    return dualDiffFilePatch(...diffs);
  } else {
    throw new Error(`Unexpected number of diffs: ${diffs.length}`);
  }
}

function emptyDiffFilePatch() {
  return new FilePatch(nullFile, nullFile, nullPatch);
}

function singleDiffFilePatch(diff) {
  const wasSymlink = diff.oldMode === '120000';
  const isSymlink = diff.newMode === '120000';
  const [hunks, buffer, layers] = buildHunks(diff);

  let oldSymlink = null;
  let newSymlink = null;
  if (wasSymlink && !isSymlink) {
    oldSymlink = diff.hunks[0].lines[0].slice(1);
  } else if (!wasSymlink && isSymlink) {
    newSymlink = diff.hunks[0].lines[0].slice(1);
  } else if (wasSymlink && isSymlink) {
    oldSymlink = diff.hunks[0].lines[0].slice(1);
    newSymlink = diff.hunks[0].lines[2].slice(1);
  }

  const oldFile = diff.oldPath !== null || diff.oldMode !== null
    ? new File({path: diff.oldPath, mode: diff.oldMode, symlink: oldSymlink})
    : nullFile;
  const newFile = diff.newPath !== null || diff.newMode !== null
    ? new File({path: diff.newPath, mode: diff.newMode, symlink: newSymlink})
    : nullFile;
  const patch = new Patch({status: diff.status, hunks, buffer, layers});

  return new FilePatch(oldFile, newFile, patch);
}

function dualDiffFilePatch(diff1, diff2) {
  let modeChangeDiff, contentChangeDiff;
  if (diff1.oldMode === '120000' || diff1.newMode === '120000') {
    modeChangeDiff = diff1;
    contentChangeDiff = diff2;
  } else {
    modeChangeDiff = diff2;
    contentChangeDiff = diff1;
  }

  const [hunks, buffer, layers] = buildHunks(contentChangeDiff);
  const filePath = contentChangeDiff.oldPath || contentChangeDiff.newPath;
  const symlink = modeChangeDiff.hunks[0].lines[0].slice(1);

  let status;
  let oldMode, newMode;
  let oldSymlink = null;
  let newSymlink = null;
  if (modeChangeDiff.status === 'added') {
    // contents were deleted and replaced with symlink
    status = 'deleted';
    oldMode = contentChangeDiff.oldMode;
    newMode = modeChangeDiff.newMode;
    newSymlink = symlink;
  } else if (modeChangeDiff.status === 'deleted') {
    // contents were added after symlink was deleted
    status = 'added';
    oldMode = modeChangeDiff.oldMode;
    oldSymlink = symlink;
    newMode = contentChangeDiff.newMode;
  } else {
    throw new Error(`Invalid mode change diff status: ${modeChangeDiff.status}`);
  }

  const oldFile = new File({path: filePath, mode: oldMode, symlink: oldSymlink});
  const newFile = new File({path: filePath, mode: newMode, symlink: newSymlink});
  const patch = new Patch({status, hunks, buffer, layers});

  return new FilePatch(oldFile, newFile, patch);
}

const CHANGEKIND = {
  '+': Addition,
  '-': Deletion,
  ' ': Unchanged,
  '\\': NoNewline,
};

function buildHunks(diff) {
  const buffer = new TextBuffer();
  const layers = ['hunk', 'unchanged', 'addition', 'deletion', 'noNewline'].reduce((obj, key) => {
    obj[key] = buffer.addMarkerLayer();
    return obj;
  }, {});
  const layersByKind = new Map([
    [Unchanged, layers.unchanged],
    [Addition, layers.addition],
    [Deletion, layers.deletion],
    [NoNewline, layers.noNewline],
  ]);
  const hunks = [];

  let bufferRow = 0;

  for (const hunkData of diff.hunks) {
    const bufferStartRow = bufferRow;

    const regions = [];

    let LastChangeKind = null;
    let currentRangeStart = bufferRow;
    let lastLineLength = 0;
    let nextLineLength = 0;

    const finishCurrentRange = () => {
      if (currentRangeStart === bufferRow) {
        return;
      }

      regions.push(
        new LastChangeKind(
          layersByKind.get(LastChangeKind).markRange(
            [[currentRangeStart, 0], [bufferRow - 1, lastLineLength]],
            {invalidate: 'never', exclusive: false},
          ),
        ),
      );
      currentRangeStart = bufferRow;
    };

    for (const lineText of hunkData.lines) {
      const bufferLine = lineText.slice(1) + '\n';
      nextLineLength = lineText.length - 1;
      buffer.append(bufferLine);

      const ChangeKind = CHANGEKIND[lineText[0]];
      if (ChangeKind === undefined) {
        throw new Error(`Unknown diff status character: "${lineText[0]}"`);
      }

      if (ChangeKind !== LastChangeKind) {
        finishCurrentRange();
      }

      LastChangeKind = ChangeKind;
      bufferRow++;
      lastLineLength = nextLineLength;
    }
    finishCurrentRange();

    hunks.push(new Hunk({
      oldStartRow: hunkData.oldStartLine,
      newStartRow: hunkData.newStartLine,
      oldRowCount: hunkData.oldLineCount,
      newRowCount: hunkData.newLineCount,
      sectionHeading: hunkData.heading,
      marker: layers.hunk.markRange(
        [[bufferStartRow, 0], [bufferRow - 1, nextLineLength]],
        {invalidate: 'never', exclusive: false},
      ),
      regions,
    }));
  }

  return [hunks, buffer, layers];
}
