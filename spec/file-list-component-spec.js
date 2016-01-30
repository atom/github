/** @babel */

import etch from 'etch'
import FileList from '../lib/file-list'
import FileListViewModel from '../lib/file-list-view-model'
import FileListComponent from '../lib/file-list-component'
import {createFileDiffsFromPath, buildMouseEvent} from './helpers'

function createFileList(filePath) {
  let fileDiffs = createFileDiffsFromPath(filePath)
  let fileList = new FileList(fileDiffs)
  return new FileListViewModel(fileList)
}

describe("FileListComponent", function() {
  let viewModel, component, element

  function getFileElements() {
    return element.querySelectorAll('.file-summary')
  }

  function getFileElement(index) {
    return getFileElements()[index]
  }

  beforeEach(function() {
    viewModel = createFileList('fixtures/two-file-diff.txt')
    component = new FileListComponent({fileListViewModel: viewModel})
    element = component.element
    jasmine.attachToDOM(component.element)
    spyOn(etch, 'updateElement').andCallFake((component) => {
      return etch.updateElementSync(component)
    })
  })

  it("renders correctly", function() {
    let fileElements = getFileElements()
    expect(fileElements).toHaveLength(2)
    expect(fileElements[0]).toHaveClass('selected')
    expect(fileElements[1]).not.toHaveClass('selected')
  })

  describe("keyboard selection of files", function() {
    it("arrows through the list with core move commands", function() {
      expect(getFileElement(0)).toHaveClass('selected')

      atom.commands.dispatch(element, 'core:move-down')
      expect(getFileElement(1)).toHaveClass('selected')

      atom.commands.dispatch(element, 'core:move-up')
      expect(getFileElement(0)).toHaveClass('selected')
    })
  })
})
