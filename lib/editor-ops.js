/* @flow */

import GitStore from './git-store'
import FileListViewModel from './file-list-view-model'
import FileDiff from './file-diff'
import HunkLine from './hunk-line'

import type {Range} from 'atom'

export function stageOrUnstageSelectedLines (gitStore: GitStore, fileListViewModel: FileListViewModel): void {
  const editor = atom.workspace.getActiveTextEditor()
  if (editor) {
    const selectedRanges = editor.getSelectedBufferRanges()
    const [_projectPath, relativePath] = editor.project.relativizePath(editor.getPath())
    stageBufferRanges(selectedRanges, relativePath, gitStore, fileListViewModel)
  }
}

export async function stageBufferRanges (ranges: Array<Range>, filePath: string, gitStore: GitStore, fileListViewModel: FileListViewModel): Promise<void> {
  await gitStore.loadFromGit()
  const fileDiff = fileListViewModel.getDiffForPathName(filePath)
  const [changedLines, stageOrUnstage] = getChangedLinesAndStagingType(fileDiff, ranges)
  await gitStore.stageLines(changedLines, stageOrUnstage)
}

export function getChangedLinesAndStagingType (fileDiff: FileDiff, ranges: Array<Range>): [Array<HunkLine>, boolean] {
  let lineOffsetSoFar = 0

  ranges = ranges.map(range => {
    // If a range spans at least one line, and ends on column zero we don't
    // want to stage the last line (since no text on that line is selected).
    // So, copy the range and rewind the ending row by 1.
    if (range.end.column === 0 && range.start.row !== range.end.row) {
      range = range.copy()
      range.end.row = range.end.row - 1
    }
    return range
  })

  const anyRangesIntersectLine = (ranges, line) => {
    // Added/deleted lines mess up the row offset; account for them
    let row
    if (line.isAddition()) {
      row = line.getNewLineNumber() - 1
      lineOffsetSoFar++
    } else {
      row = line.getOldLineNumber()
      lineOffsetSoFar--
    }
    if (line.isDeletion()) row += lineOffsetSoFar
    return ranges.some(range => range.intersectsRow(row))
  }

  const linesChangedInRange = fileDiff.getHunks()
    .map(hunk => hunk.getLines())
    .reduce((acc, lines) => acc.concat(lines), [])
    .filter(line => line.isChanged() && anyRangesIntersectLine(ranges, line))

  const linesToStage = linesChangedInRange.filter(line => !line.isStaged())

  return linesToStage.length ? [linesToStage, true] : [linesChangedInRange, false]
}
