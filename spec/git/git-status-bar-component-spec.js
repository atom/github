/** @babel */

import etch from 'etch'
import {GitRepositoryAsync} from 'atom'
import GitService from '../../lib/git/git-service'
import GitStore from '../../lib/git/git-store'
import GitStatusBarViewModel from '../../lib/git/status-bar/git-status-bar-view-model'
import GitStatusBarComponent from '../../lib/git/status-bar/git-status-bar-component'
import {copyRepository} from './git-helpers'

describe('GitStatusBarComponent', () => {
  let component
  let gitStore
  let repoPath
  let element

  beforeEach(async () => {
    repoPath = copyRepository()

    const gitService = new GitService(GitRepositoryAsync.open(repoPath))
    gitStore = new GitStore(gitService)

    await gitStore.loadFromGit()

    const viewModel = new GitStatusBarViewModel(gitStore)
    component = new GitStatusBarComponent(viewModel, () => { return })

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
