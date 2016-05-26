/** @babel */

import etch from 'etch'
import path from 'path'
import fs from 'fs-plus'
import {GitRepositoryAsync} from 'atom'
import GitService from '../lib/git-service'
import CommitBoxViewModel from '../lib/commit-box-view-model'
import CommitBoxComponent from '../lib/commit-box-component'
import {copyRepository, buildMouseEvent} from './helpers'


xdescribe('CommitBoxComponent', () => {
  let component
  let gitService
  let repoPath
  let element
  let makeAndStageChanges
  let expectNoChanges
  let getCommitButtonElement
  let getMessageElement

  beforeEach(() => {
    repoPath = copyRepository()

    gitService = new GitService(GitRepositoryAsync.open(repoPath))

    const newFileName = 'new-file.txt'
    makeAndStageChanges = async () => {
      const newFile = path.join(repoPath, newFileName)
      fs.writeFileSync(newFile, 'my fav file')

      const statuses = await gitService.getStatuses()
      expect(statuses[newFileName]).not.toBeUndefined()

      await gitService.stagePath(newFileName)
    }

    expectNoChanges = async () => {
      await component.committingPromise
      const statuses = await gitService.getStatuses()
      expect(statuses[newFileName]).toBeUndefined()
    }

    const viewModel = new CommitBoxViewModel(gitService)
    waitsForPromise(() => viewModel.update())
    runs(() => {
      component = new CommitBoxComponent({viewModel})
      element = component.element
      jasmine.attachToDOM(component.element)
      spyOn(etch, 'update').andCallFake(component => {
        return etch.updateSync(component)
      })

      getCommitButtonElement = () => {
        const children = element.children
        return children[1]
      }

      getMessageElement = () => {
        const children = element.children
        return children[0].children[0]
      }
    })
  })

  describe('::commit', () => {
    beforeEach(() => makeAndStageChanges())

    it('commits', async () => {
      await component.commit()
      await expectNoChanges()
    })

    it('clears the commit message after committing', async () => {
      const editor = getMessageElement()
      editor.getModel().setText('some message')

      await component.commit()
      expect(editor).toHaveText('')
    })
  })

  describe('git:commit', () => {
    beforeEach(() => makeAndStageChanges())

    it('commits', async () => {
      atom.commands.dispatch(element, 'git:commit')
      await expectNoChanges()
    })
  })

  describe('mouse clicks', () => {
    describe('when there is a click on the commit button', () => {
      beforeEach(() => makeAndStageChanges())

      it('commits', async () => {
        const commitButton = getCommitButtonElement()
        commitButton.dispatchEvent(buildMouseEvent('click', {target: commitButton}))
        await expectNoChanges()
      })
    })
  })
})
