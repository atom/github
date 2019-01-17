import PatchBuffer from './patch-buffer';
import Hunk from './hunk';
import File, {nullFile} from './file';
import Patch, {TOO_LARGE, EXPANDED} from './patch';
import {Unchanged, Addition, Deletion, NoNewline} from './region';
import FilePatch from './file-patch';
import MultiFilePatch from './multi-file-patch';

export const DEFAULT_OPTIONS = {
  // Number of lines after which we consider the diff "large"
  // TODO: Set this based on performance measurements
  largeDiffThreshold: 100,

  // Map of file path (relative to repository root) to Patch render status (EXPANDED, COLLAPSED, TOO_LARGE)
  renderStatusOverrides: {},
};

export function buildFilePatch(diffs, options) {
  const opts = {...DEFAULT_OPTIONS, ...options};

  const patchBuffer = new PatchBuffer();

  let filePatch;
  if (diffs.length === 0) {
    filePatch = emptyDiffFilePatch();
  } else if (diffs.length === 1) {
    filePatch = singleDiffFilePatch(diffs[0], patchBuffer, opts);
  } else if (diffs.length === 2) {
    filePatch = dualDiffFilePatch(diffs[0], diffs[1], patchBuffer, opts);
  } else {
    throw new Error(`Unexpected number of diffs: ${diffs.length}`);
  }

  return new MultiFilePatch({patchBuffer, filePatches: [filePatch]});
}

export function buildMultiFilePatch(diffs, options) {
  const opts = {...DEFAULT_OPTIONS, ...options};

  const patchBuffer = new PatchBuffer();
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
        actions[otherIndex] = () => dualDiffFilePatch(diff, otherDiff, patchBuffer, opts);
        byPath.delete(thePath);
      } else {
        // The first half we've seen.
        byPath.set(thePath, [diff, index]);
        index++;
      }
    } else {
      actions[index] = () => singleDiffFilePatch(diff, patchBuffer, opts);
      index++;
    }
  }

  // Populate unpaired diffs that looked like they could be part of a pair, but weren't.
  for (const [unpairedDiff, originalIndex] of byPath.values()) {
    actions[originalIndex] = () => singleDiffFilePatch(unpairedDiff, patchBuffer, opts);
  }

  const filePatches = actions.map(action => action());

  // Fix markers for patches with no hunks.
  // Head position was moved everytime lines were appended.
  filePatches.forEach(filePatch => {
    if (filePatch.getHunks().length === 0) {
      const marker = filePatch.getMarker();
      marker.setHeadPosition(marker.getTailPosition());
    }
  });

  return new MultiFilePatch({patchBuffer, filePatches});
}

function emptyDiffFilePatch() {
  return FilePatch.createNull();
}

function singleDiffFilePatch(diff, patchBuffer, opts) {
  const wasSymlink = diff.oldMode === File.modes.SYMLINK;
  const isSymlink = diff.newMode === File.modes.SYMLINK;

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

  const renderStatusOverride =
    (oldFile.isPresent() && opts.renderStatusOverrides[oldFile.getPath()]) ||
    (newFile.isPresent() && opts.renderStatusOverrides[newFile.getPath()]) ||
    undefined;

  const renderStatus = renderStatusOverride ||
    (isDiffLarge([diff], opts) && TOO_LARGE) ||
    EXPANDED;

  if (renderStatus === TOO_LARGE) {
    const insertRow = patchBuffer.getBuffer().getLastRow();
    const patchMarker = patchBuffer.markPosition(
      Patch.layerName,
      [insertRow, 0],
      {invalidate: 'never', exclusive: false},
    );

    return FilePatch.createDelayedFilePatch(
      oldFile, newFile, patchMarker, TOO_LARGE,
      () => {
        const [hunks] = buildHunks(diff, patchBuffer, insertRow, patchMarker);
        return new Patch({status: diff.status, hunks, marker: patchMarker});
      },
    );
  } else {
    const [hunks, patchMarker] = buildHunks(diff, patchBuffer, patchBuffer.getBuffer().getLastRow());
    const patch = new Patch({status: diff.status, hunks, marker: patchMarker});

    return new FilePatch(oldFile, newFile, patch);
  }
}

function dualDiffFilePatch(diff1, diff2, patchBuffer, opts) {
  let modeChangeDiff, contentChangeDiff;
  if (diff1.oldMode === File.modes.SYMLINK || diff1.newMode === File.modes.SYMLINK) {
    modeChangeDiff = diff1;
    contentChangeDiff = diff2;
  } else {
    modeChangeDiff = diff2;
    contentChangeDiff = diff1;
  }

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

  if (isDiffLarge([diff1, diff2], opts)) {
    // TODO: do something with large diff too
  }

  const [hunks, patchMarker] = buildHunks(contentChangeDiff, patchBuffer, patchBuffer.getBuffer().getLastRow());
  const patch = new Patch({status, hunks, marker: patchMarker});

  return new FilePatch(oldFile, newFile, patch);
}

const CHANGEKIND = {
  '+': Addition,
  '-': Deletion,
  ' ': Unchanged,
  '\\': NoNewline,
};

function buildHunks(diff, patchBuffer, insertRow, existingMarker = null) {
  const hunks = [];

  const patchStartRow = insertRow;
  let bufferRow = patchStartRow;
  let nextLineLength = 0;

  if (diff.hunks.length === 0) {
    const patchMarker = patchBuffer.markPosition(
      Patch.layerName,
      [patchStartRow, 0],
      {invalidate: 'never', exclusive: true},
    );

    return [hunks, patchMarker];
  }

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
          patchBuffer.markRange(
            LastChangeKind.layerName,
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
      patchBuffer.getBuffer().insert([bufferRow, 0], bufferLine);

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
      marker: patchBuffer.markRange(
        Hunk.layerName,
        [[bufferStartRow, 0], [bufferRow - 1, nextLineLength]],
        {invalidate: 'never', exclusive: false},
      ),
      regions,
    }));
  }

  let patchMarker = existingMarker;
  if (patchMarker) {
    patchMarker.setRange([[patchStartRow, 0], [bufferRow - 1, nextLineLength]], {exclusive: false});
  } else {
    patchMarker = patchBuffer.markRange(
      Patch.layerName,
      [[patchStartRow, 0], [bufferRow - 1, nextLineLength]],
      {invalidate: 'never', exclusive: false},
    );
  }

  return [hunks, patchMarker];
}

function isDiffLarge(diffs, opts) {
  const size = diffs.reduce((diffSizeCounter, diff) => {
    return diffSizeCounter + diff.hunks.reduce((hunkSizeCounter, hunk) => {
      return hunkSizeCounter + hunk.lines.length;
    }, 0);
  }, 0);

  return size > opts.largeDiffThreshold;
}
