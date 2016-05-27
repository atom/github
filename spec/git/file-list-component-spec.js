/** @babel */

import etch from 'etch'
import FileListComponent from '../../lib/git/file-list/file-list-component'
import {createFileListViewModel} from './git-helpers'
import {buildMouseEvent} from '../event-helpers'

describe('FileListComponent', function () {
  let viewModel, component, element

  function getFileElements () {
    return element.querySelectorAll('.git-FileSummary')
  }

  function getFileElement (index) {
    return getFileElements()[index]
  }

  beforeEach(async () => {
    viewModel = await createFileListViewModel()
    component = new FileListComponent({fileListViewModel: viewModel})
    element = component.element
    jasmine.attachToDOM(component.element)
    spyOn(etch, 'update').andCallFake((component) => {
      return etch.updateSync(component)
    })
  })

  it('renders correctly', function () {
    let fileElements = getFileElements()
    expect(fileElements).toHaveLength(2)
    expect(fileElements[0]).toHaveClass('is-selected')
    expect(fileElements[1]).not.toHaveClass('is-selected')
  })

  describe('keyboard selection of files', function () {
    it('arrows through the list with core move commands', function () {
      spyOn(component, 'selectionDidChange').andCallFake(() => {
        return etch.updateSync(component)
      })

      expect(getFileElement(0)).toHaveClass('is-selected')

      atom.commands.dispatch(element, 'core:move-down')
      expect(getFileElement(1)).toHaveClass('is-selected')

      atom.commands.dispatch(element, 'core:move-up')
      expect(getFileElement(0)).toHaveClass('is-selected')
    })
  })

  describe('keyboard staging of files', function () {
    it('toggle stagedness on core:confirm', () => {
      expect(viewModel.getSelectedFile().getStageStatus()).toBe('unstaged')

      atom.commands.dispatch(element, 'core:confirm')
      expect(viewModel.getSelectedFile().getStageStatus()).toBe('staged')

      atom.commands.dispatch(element, 'core:confirm')
      expect(viewModel.getSelectedFile().getStageStatus()).toBe('unstaged')
    })
  })

  describe('mouse clicks', () => {
    const expectedURI = 'atom://git/diff/README.md'

    it("displays the file's diff in the pending state on single click", () => {
      spyOn(atom.workspace, 'open')

      const element = getFileElement(0)
      element.dispatchEvent(buildMouseEvent('click', {target: element}))

      const args = atom.workspace.open.mostRecentCall.args
      const uri = args[0]
      const options = args[1]
      expect(options.pending).toBe(true)
      expect(uri).toBe(expectedURI)
    })

    it("displays the file's diff in the normal state on double click", () => {
      spyOn(atom.workspace, 'open')

      const element = getFileElement(0)
      element.dispatchEvent(buildMouseEvent('dblclick', {target: element}))

      const args = atom.workspace.open.mostRecentCall.args
      const uri = args[0]
      const options = args[1]
      expect(options.pending).toBe(false)
      expect(uri).toBe(expectedURI)
    })
  })
})
