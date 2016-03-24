/** @babel */

import etch from 'etch'
import {GitRepositoryAsync} from 'atom'
import GitService from '../lib/git-service'
import GitStore from '../lib/git-store'
import StatusBarViewModel from '../lib/status-bar-view-model'
import StatusBarComponent from '../lib/status-bar-component'
import {copyRepository} from './helpers'
import {it, beforeEach} from './async-spec-helpers'

describe('StatusBarComponent', () => {
  let component
  let gitStore
  let repoPath
  let element

  beforeEach(async () => {
    repoPath = copyRepository()

    const gitService = new GitService(GitRepositoryAsync.open(repoPath))
    gitStore = new GitStore(gitService)

    await gitStore.loadFromGit()

    const viewModel = new StatusBarViewModel(gitStore)
    component = new StatusBarComponent(viewModel, () => { return })

    element = component.element
    jasmine.attachToDOM(component.element)
    spyOn(etch, 'update').andCallFake(component => {
      return etch.updateSync(component)
    })
  })

  it('renders correctly', () => {
    expect(element).toHaveClass('git-status-bar')
    expect(element).toHaveText('0 files')
  })
})
