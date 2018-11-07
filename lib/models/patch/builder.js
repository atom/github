import {TextBuffer} from 'atom';

import Hunk from './hunk';
import File, {nullFile} from './file';
import Patch from './patch';
import {Unchanged, Addition, Deletion, NoNewline} from './region';
import FilePatch from './file-patch';
import MultiFilePatch from './multi-file-patch';

export function buildFilePatch(diffs) {
  const layeredBuffer = initializeBuffer();

  let filePatch;
  if (diffs.length === 0) {
    filePatch = emptyDiffFilePatch();
  } else if (diffs.length === 1) {
    filePatch = singleDiffFilePatch(diffs[0], layeredBuffer);
  } else if (diffs.length === 2) {
    filePatch = dualDiffFilePatch(diffs[0], diffs[1], layeredBuffer);
  } else {
    throw new Error(`Unexpected number of diffs: ${diffs.length}`);
  }

  return new MultiFilePatch(layeredBuffer.buffer, layeredBuffer.layers, [filePatch]);
}

export function buildMultiFilePatch(diffs) {
  const layeredBuffer = initializeBuffer();
  const byPath = new Map();
  const actions = [];

  let index = 0;
  for (const diff of diffs) {
    const thePath = diff.oldPath || diff.newPath;

    if (diff.status === 'added' || diff.status === 'deleted') {
      // Potential paired diff. Either a symlink deletion + content addition or a symlink addition +
      // content deletion.
      const otherHalf = byPath.get(thePath);
      if (otherHalf) {
        // The second half. Complete the paired diff, or fail if they have unexpected statuses or modes.
        const [otherDiff, otherIndex] = otherHalf;
        actions[otherIndex] = () => dualDiffFilePatch(diff, otherDiff, layeredBuffer);
        byPath.delete(thePath);
      } else {
        // The first half we've seen.
        byPath.set(thePath, [diff, index]);
        index++;
      }
    } else {
      actions[index] = () => singleDiffFilePatch(diff, layeredBuffer);
      index++;
    }
  }

  // Populate unpaired diffs that looked like they could be part of a pair, but weren't.
  for (const [unpairedDiff, originalIndex] of byPath.values()) {
    actions[originalIndex] = () => singleDiffFilePatch(unpairedDiff, layeredBuffer);
  }

  const filePatches = actions.map(action => action());

  return new MultiFilePatch(layeredBuffer.buffer, layeredBuffer.layers, filePatches);
}

function emptyDiffFilePatch() {
  return FilePatch.createNull();
}

function singleDiffFilePatch(diff, layeredBuffer = null) {
  const wasSymlink = diff.oldMode === '120000';
  const isSymlink = diff.newMode === '120000';

  if (!layeredBuffer) {
    layeredBuffer = initializeBuffer();
  }
  const [hunks, patchMarker] = buildHunks(diff, layeredBuffer);

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
  const patch = new Patch({status: diff.status, hunks, marker: patchMarker, buffer: layeredBuffer.buffer});

  return new FilePatch(oldFile, newFile, patch);
}

function dualDiffFilePatch(diff1, diff2, layeredBuffer = null) {
  if (!layeredBuffer) {
    layeredBuffer = initializeBuffer();
  }

  let modeChangeDiff, contentChangeDiff;
  if (diff1.oldMode === '120000' || diff1.newMode === '120000') {
    modeChangeDiff = diff1;
    contentChangeDiff = diff2;
  } else {
    modeChangeDiff = diff2;
    contentChangeDiff = diff1;
  }

  const [hunks, patchMarker] = buildHunks(contentChangeDiff, layeredBuffer);
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
  const patch = new Patch({status, hunks, marker: patchMarker, buffer: layeredBuffer.buffer});

  return new FilePatch(oldFile, newFile, patch);
}

const CHANGEKIND = {
  '+': Addition,
  '-': Deletion,
  ' ': Unchanged,
  '\\': NoNewline,
};

function initializeBuffer() {
  const buffer = new TextBuffer();
  const layers = ['patch', 'hunk', 'unchanged', 'addition', 'deletion', 'noNewline'].reduce((obj, key) => {
    obj[key] = buffer.addMarkerLayer();
    return obj;
  }, {});

  return {buffer, layers};
}

function buildHunks(diff, {buffer, layers}) {
  const layersByKind = new Map([
    [Unchanged, layers.unchanged],
    [Addition, layers.addition],
    [Deletion, layers.deletion],
    [NoNewline, layers.noNewline],
  ]);
  const hunks = [];

  const patchStartRow = buffer.getLastRow();
  let bufferRow = patchStartRow;
  let nextLineLength = 0;

  for (const hunkData of diff.hunks) {
    const bufferStartRow = bufferRow;

    const regions = [];

    let LastChangeKind = null;
    let currentRangeStart = bufferRow;
    let lastLineLength = 0;

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

  const patchMarker = layers.patch.markRange(
    [[patchStartRow, 0], [bufferRow - 1, nextLineLength]],
    {invalidate: 'never', exclusive: false},
  );

  return [hunks, patchMarker];
}
