/** @babel */

import fs from 'fs'
import path from 'path'
import DiffViewModel from '../lib/diff-view-model'
import DiffComponent from '../lib/diff-component'
import FileDiff from '../lib/file-diff'
import FileList from '../lib/file-list'
import {createFileDiffsFromPath, buildMouseEvent} from './helpers'

function createDiffs(filePath) {
  let fileDiffs = createFileDiffsFromPath(filePath)
  return new DiffViewModel({fileList: new FileList(fileDiffs)})
}

describe("DiffComponent", function() {
  let viewModel, component, element

  function getLineNumberAtPosition(position) {
    let [fileIndex, hunkIndex, lineIndex] = position
    let fileElement = element.querySelectorAll('.git-file-diff')[fileIndex]
    let hunkElement = fileElement.querySelectorAll('.git-diff-hunk')[hunkIndex]
    let lineElement = hunkElement.querySelectorAll('.git-hunk-line')[lineIndex + 1] // account for header
    return lineElement.querySelector('.old-line-number')
  }

  beforeEach(function() {
    viewModel = createDiffs('fixtures/two-file-diff.txt')
    component = new DiffComponent({diffViewModel: viewModel})
    element = component.element
    jasmine.attachToDOM(component.element)
  })

  it("renders correctly", function() {
    expect(element.querySelectorAll('.git-file-diff')).toHaveLength(2)
    expect(element.querySelector('.git-diff-hunk')).toBeDefined()
    expect(element.querySelector('.git-hunk-line')).toBeDefined()
  })

  describe("mouse selection of diff lines", function() {
    it("selects a line when clicked", function() {
      let selection = viewModel.getLastSelection()
      expect(selection.getMode()).toBe('hunk')

      let line = getLineNumberAtPosition([0, 0, 4])

      line.dispatchEvent(buildMouseEvent('mousedown', { target: line }))
      line.dispatchEvent(buildMouseEvent('mouseup', { target: line }))

      selection = viewModel.getLastSelection()
      expect(selection.getMode()).toBe('line')
      expect(selection.getHeadPosition()).toEqual([0, 0, 4])
      expect(selection.getTailPosition()).toEqual([0, 0, 4])
    })

    it("selects multiple lines when dragged", function() {
      let selection
      let line1 = getLineNumberAtPosition([0, 0, 4])
      let line2 = getLineNumberAtPosition([0, 0, 5])

      line1.dispatchEvent(buildMouseEvent('mousedown', { target: line1 }))
      line1.dispatchEvent(buildMouseEvent('mousemove', { target: line1 }))
      line2.dispatchEvent(buildMouseEvent('mousemove', { target: line2 }))
      line2.dispatchEvent(buildMouseEvent('mouseup', { target: line2 }))

      selection = viewModel.getLastSelection()
      expect(selection.getMode()).toBe('line')
      expect(selection.getHeadPosition()).toEqual([0, 0, 4])
      expect(selection.getTailPosition()).toEqual([0, 0, 5])
    })

    it("creates a new selection when dragging a new part of the gutter", function() {
      let selection
      let lineOld = getLineNumberAtPosition([0, 0, 4])
      lineOld.dispatchEvent(buildMouseEvent('mousedown', { target: lineOld }))
      lineOld.dispatchEvent(buildMouseEvent('mouseup', { target: lineOld }))

      let line1 = getLineNumberAtPosition([0, 1, 3])
      let line2 = getLineNumberAtPosition([0, 1, 4])
      line1.dispatchEvent(buildMouseEvent('mousedown', { target: line1 }))
      line1.dispatchEvent(buildMouseEvent('mousemove', { target: line1 }))
      line2.dispatchEvent(buildMouseEvent('mousemove', { target: line2 }))
      line2.dispatchEvent(buildMouseEvent('mouseup', { target: line2 }))

      expect(viewModel.getSelections()).toHaveLength(1)
      selection = viewModel.getLastSelection()
      expect(selection.getMode()).toBe('line')
      expect(selection.getHeadPosition()).toEqual([0, 1, 3])
      expect(selection.getTailPosition()).toEqual([0, 1, 4])
    })

    it("adds to the selection when dragging a new part of the gutter with the shift key down", function() {
      let selection
      let lineOld = getLineNumberAtPosition([0, 0, 4])
      lineOld.dispatchEvent(buildMouseEvent('mousedown', { target: lineOld }))
      lineOld.dispatchEvent(buildMouseEvent('mouseup', { target: lineOld }))

      let line1 = getLineNumberAtPosition([0, 1, 3])
      let line2 = getLineNumberAtPosition([0, 1, 4])
      line1.dispatchEvent(buildMouseEvent('mousedown', { target: line1, shiftKey: true }))
      line1.dispatchEvent(buildMouseEvent('mousemove', { target: line1, shiftKey: true }))
      line2.dispatchEvent(buildMouseEvent('mousemove', { target: line2, shiftKey: true }))
      line2.dispatchEvent(buildMouseEvent('mouseup', { target: line2, shiftKey: true }))

      expect(viewModel.getSelections()).toHaveLength(2)
      selection = viewModel.getLastSelection()
      expect(selection.getMode()).toBe('line')
      expect(selection.getHeadPosition()).toEqual([0, 1, 3])
      expect(selection.getTailPosition()).toEqual([0, 1, 4])
    })
  })
})
