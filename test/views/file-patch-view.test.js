/** @babel */

import FilePatchView from '../../lib/views/file-patch-view'
import Hunk from '../../lib/models/hunk'
import HunkLine from '../../lib/models/hunk-line'


// Add test for selecting hunk when clicked in 'hunk' mode
// add test for staging/unstaging hunk lines

describe('FilePatchView', () => {
  it('displays selected hunks and lines as selected', async () => {
    const line1 = new HunkLine('line-1', 'removed', 5, -1)
    const line2 = new HunkLine('line-2', 'removed', 6, -1)
    const line3 = new HunkLine('line-3', 'removed', 7, -1)
    const line4 = new HunkLine('line-4', 'added', -1, 6)
    const line5 = new HunkLine('line-5', 'removed', 8, -1)
    const line6 = new HunkLine('line-6', 'added', -1, 8)
    const hunk1 = new Hunk(5, 5, 3, 1, [line1, line2, line3, line4])
    const hunk2 = new Hunk(8, 8, 1, 1, [line5, line6])
    const hunkViewsByHunk = new Map()
    const view = new FilePatchView({hunks: [hunk1, hunk2], registerHunkView: (hunk, view) => hunkViewsByHunk.set(hunk, view)})

    const selectedHunks = view.getSelectedHunks()
    // TODO: write test to ensure that hunks and lines have correct isSelected props
  })

  describe('selectLineForHunk(hunk, selectedLine) when selection is enabled', () => {
    it('sets the lines between selectedLine and first line selected', async () => {
      const line1 = new HunkLine('line-1', 'removed', 5, -1)
      const line2 = new HunkLine('line-2', 'removed', 6, -1)
      const line3 = new HunkLine('line-3', 'removed', 7, -1)
      const line4 = new HunkLine('line-4', 'added', -1, 6)
      const line5 = new HunkLine('line-5', 'removed', 8, -1)
      const line6 = new HunkLine('line-6', 'added', -1, 8)
      const hunk1 = new Hunk(5, 5, 3, 1, [line1, line2, line3, line4])
      const hunk2 = new Hunk(8, 8, 1, 1, [line5, line6])
      const view = new FilePatchView({hunks: [hunk1, hunk2]})
      view.togglePatchSelectionMode()
      assertSelectedLines(view, [line1])
      view.enableSelections()
      // line2 is first line selected. it is the end reference for all future selections
      await view.selectLineForHunk(hunk1, line2)
      assertSelectedLines(view, [line2])
      await view.selectLineForHunk(hunk1, line4)
      assertSelectedLines(view, [line2, line3, line4])
      assertSelectedHunks(view, [hunk1])
      // can select across hunk boundaries
      await view.selectLineForHunk(hunk2, line6)
      assertSelectedLines(view, [line2, line3, line4, line5, line6])
      assertSelectedHunks(view, [hunk1, hunk2])
      view.disableSelections()

      // can select in any direction, with subseqent selection above initial
      view.enableSelections()
      await view.selectLineForHunk(hunk2, line6)
      assertSelectedLines(view, [line6])
      await view.selectLineForHunk(hunk2, line5)
      assertSelectedLines(view, [line5, line6])
      assertSelectedHunks(view, [hunk2])
      // can select across hunk boundaries
      await view.selectLineForHunk(hunk1, line2)
      assertSelectedLines(view, [line2, line3, line4, line5, line6])
      assertSelectedHunks(view, [hunk1, hunk2])
      view.disableSelections()
    })
  })

  it('assigns the appropriate stage button label prefix on hunks based on the stagingStatus', async () => {
    const hunk = new Hunk(1, 1, 1, 2, [new HunkLine('line-1', 'added', -1, 1)])
    let hunkView
    function registerHunkView (hunk, view) { hunkView = view }
    const view = new FilePatchView({hunks: [hunk], stagingStatus: 'unstaged', registerHunkView})
    assert.equal(hunkView.props.stageButtonLabelPrefix, 'Stage')
    await view.update({hunks: [hunk], stagingStatus: 'staged', registerHunkView})
    assert.equal(hunkView.props.stageButtonLabelPrefix, 'Unstage')
  })

  describe('hunk focus when hunk disappears', () => {
    describe('when there is another hunk at it\'s index', () => {
      it('selects the new hunk in it\'s place', async () => {
        const hunk1 = new Hunk(5, 5, 2, 1, [new HunkLine('line-1', 'added', -1, 5)])
        const hunk2 = new Hunk(8, 8, 1, 1, [new HunkLine('line-5', 'removed', 8, -1)])
        const view = new FilePatchView({hunks: [hunk1, hunk2]})
        assertSelectedHunks(view, [hunk1])
        await view.update({hunks: [hunk2]})
        assertSelectedHunks(view, [hunk2])
      })
    })

    describe('when there is no hunk at it\'s index', () => {
      it('selects the last hunk', async () => {
        const hunk1 = new Hunk(5, 5, 2, 1, [new HunkLine('line-1', 'added', -1, 5)])
        const hunk2 = new Hunk(8, 8, 1, 1, [new HunkLine('line-5', 'removed', 8, -1)])
        const view = new FilePatchView({hunks: [hunk1, hunk2]})
        await view.focusNextHunk()
        assertSelectedHunks(view, [hunk2])
        await view.update({hunks: [hunk1]})
        assertSelectedHunks(view, [hunk1])
      })
    })
  })

  describe('togglePatchSelectionMode()', () => {
    it('toggles between hunk and hunk-line selection modes', async () => {
      const hunk = new Hunk(5, 5, 2, 1, [
        new HunkLine('line-1', 'unchanged', 5, 5),
        new HunkLine('line-2', 'removed', 6, -1),
        new HunkLine('line-3', 'removed', 7, -1),
        new HunkLine('line-4', 'added', -1, 6)
      ])
      const view = new FilePatchView({hunks: [hunk]})

      assert.equal(view.getPatchSelectionMode(), 'hunk')

      await view.togglePatchSelectionMode()
      assert.equal(view.getPatchSelectionMode(), 'hunkLine')
      assertSelectedLines(view, [hunk.getLines()[1]]) // first non-context line

      await view.togglePatchSelectionMode()
      assert.equal(view.getPatchSelectionMode(), 'hunk')
      assertSelectedLines(view, hunk.getLines().filter(l => l.isChanged()))
    })
  })

  describe('focusNextHunk({wrap, addToExisting}) and focusPreviousHunk({wrap, addToExisting})', () => {
    it('focuses next/previous hunk, and wraps at the end/beginning if wrap is true', async () => {
      const hunk1 = new Hunk(5, 5, 2, 1, [new HunkLine('line-1', 'added', -1, 5)])
      const hunk2 = new Hunk(8, 8, 1, 1, [new HunkLine('line-5', 'removed', 8, -1)])
      const hunk3 = new Hunk(8, 8, 1, 1, [new HunkLine('line-10', 'added', -1, 10)])
      const view = new FilePatchView({hunks: [hunk1, hunk2, hunk3]})

      assertSelectedHunks(view, [hunk1])

      await view.focusNextHunk()
      assertSelectedHunks(view, [hunk2])

      await view.focusNextHunk()
      assertSelectedHunks(view, [hunk3])

      await view.focusNextHunk()
      assertSelectedHunks(view, [hunk3])

      await view.focusNextHunk({wrap: true})
      assertSelectedHunks(view, [hunk1])

      await view.focusPreviousHunk()
      assertSelectedHunks(view, [hunk1])

      await view.focusPreviousHunk({wrap: true})
      assertSelectedHunks(view, [hunk3])

      await view.focusPreviousHunk()
      assertSelectedHunks(view, [hunk2])

      await view.focusPreviousHunk()
      assertSelectedHunks(view, [hunk1])
    })

    it('retains currently selected hunks when addToExisting is true', async () => {
      const hunk1 = new Hunk(5, 5, 2, 1, [new HunkLine('line-1', 'added', -1, 5)])
      const hunk2 = new Hunk(8, 8, 1, 1, [new HunkLine('line-5', 'removed', 8, -1)])
      const hunk3 = new Hunk(8, 8, 1, 1, [new HunkLine('line-10', 'added', -1, 10)])
      const view = new FilePatchView({hunks: [hunk1, hunk2, hunk3]})

      assertSelectedHunks(view, [hunk1])

      await view.focusNextHunk({addToExisting: true})
      assertSelectedHunks(view, [hunk1, hunk2])

      await view.focusNextHunk({addToExisting: true})
      assertSelectedHunks(view, [hunk1, hunk2, hunk3])

      await view.focusNextHunk({wrap: true})
      assertSelectedHunks(view, [hunk1])

      await view.focusPreviousHunk({wrap: true, addToExisting: true})
      assertSelectedHunks(view, [hunk1, hunk3])

      await view.focusPreviousHunk({addToExisting: true})
      assertSelectedHunks(view, [hunk1, hunk3, hunk2])
    })
  })

  describe('focusNextHunkLine({addToExisting}) and focusPreviousHunkLine({addToExisting})', () => {
    it('focuses next/previous non-context hunk line, crossing hunk boundaries but not wrapping', async () => {
      const line1 = new HunkLine('line-1', 'unchanged', 5, 5) // context lines won't be selected
      const line2 = new HunkLine('line-2', 'removed', 6, -1)
      const line3 = new HunkLine('line-3', 'removed', 7, -1)

      const line4 = new HunkLine('line-4', 'unchanged', 8, 8) // context lines won't be selected
      const line5 = new HunkLine('line-5', 'added', -1, 9)
      const line6 = new HunkLine('line-6', 'unchanged', 9, 10) // context lines won't be selected

      const hunk1 = new Hunk(5, 5, 2, 0, [line1, line2, line3])
      const hunk2 = new Hunk(8, 8, 1, 2, [line4, line5, line6])
      const view = new FilePatchView({hunks: [hunk1, hunk2]})

      view.togglePatchSelectionMode()

      assertSelectedHunks(view, [hunk1])
      assertSelectedLines(view, [line2])

      await view.focusNextHunkLine()
      assertSelectedLines(view, [line3])

      await view.focusNextHunkLine()
      assertSelectedHunks(view, [hunk2])
      assertSelectedLines(view, [line5])

      await view.focusNextHunkLine()
      assertSelectedLines(view, [line5])

      await view.focusPreviousHunkLine()
      assertSelectedHunks(view, [hunk1])
      assertSelectedLines(view, [line3])

      await view.focusPreviousHunkLine()
      assertSelectedLines(view, [line2])

      await view.focusPreviousHunkLine()
      assertSelectedLines(view, [line2])
    })

    it('retains currently selected lines when addToExisting is true', async () => {
      const line1 = new HunkLine('line-1', 'unchanged', 5, 5) // context lines won't be selected
      const line2 = new HunkLine('line-2', 'removed', 6, -1)
      const line3 = new HunkLine('line-3', 'removed', 7, -1)

      const line4 = new HunkLine('line-4', 'unchanged', 8, 8) // context lines won't be selected
      const line5 = new HunkLine('line-5', 'added', -1, 9)
      const line6 = new HunkLine('line-6', 'unchanged', 9, 10) // context lines won't be selected

      const hunk1 = new Hunk(5, 5, 2, 0, [line1, line2, line3])
      const hunk2 = new Hunk(8, 8, 1, 2, [line4, line5, line6])
      const view = new FilePatchView({hunks: [hunk1, hunk2]})

      view.togglePatchSelectionMode()

      assertSelectedHunks(view, [hunk1])
      assertSelectedLines(view, [line2])

      await view.focusNextHunkLine({addToExisting: true})
      assertSelectedLines(view, [line2, line3])

      await view.focusNextHunkLine({addToExisting: true})
      assertSelectedHunks(view, [hunk1, hunk2])
      assertSelectedLines(view, [line2, line3, line5])

      await view.focusNextHunkLine()
      assertSelectedHunks(view, [hunk2])
      assertSelectedLines(view, [line5])

      await view.focusPreviousHunkLine({addToExisting: true})
      assertSelectedHunks(view, [hunk2, hunk1])
      assertSelectedLines(view, [line5, line3])

      await view.focusPreviousHunkLine({addToExisting: true})
      assertSelectedLines(view, [line5, line3, line2])
    })
  })
})

function assertSelectedHunks (view, hunks) {
  assert.deepEqual([...view.getSelectedHunks()], hunks)
}

function assertSelectedLines (view, lines) {
  assert.deepEqual([...view.getSelectedLines()], lines)
}
