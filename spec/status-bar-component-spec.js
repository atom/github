/** @babel */

import etch from 'etch'
import GitService from '../lib/git-service'
import StatusBarViewModel from '../lib/status-bar-view-model'
import StatusBarComponent from '../lib/status-bar-component'
import {copyRepository} from './helpers'
import {it, beforeEach} from './async-spec-helpers'

describe('StatusBarComponent', () => {
  let component
  let gitService
  let repoPath
  let element

  beforeEach(() => {
    repoPath = copyRepository()

    gitService = GitService.instance()

    atom.project.setPaths([repoPath])
    gitService.repoPath = repoPath

    const viewModel = new StatusBarViewModel(gitService)
    component = new StatusBarComponent(viewModel, () => { return })

    element = component.element
    jasmine.attachToDOM(component.element)
    spyOn(etch, 'update').andCallFake(component => {
      return etch.updateSync(component)
    })
  })

  it('renders correctly', () => {
    const children = element.children
    expect(element).toHaveClass('git-status-bar')
    expect(children).toHaveLength(1)

    const span = children[0]
    expect(span).toHaveClass('icon')
    expect(span).toHaveText('0 files')
  })
})
