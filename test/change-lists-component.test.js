/** @babel */

import FileDiff from '../lib/file-diff'
import ChangeListsComponent from '../lib/change-lists-component'

describe('ChangeListsComponent', () => {
  it('renders staged and unstaged files', async () => {
    const stagedFileDiffs = [
      new FileDiff('a.txt', 'a.txt', 1234, 1234, 'modified'),
      new FileDiff(null, 'b.txt', 1234, 1234, 'added')
    ]
    const unstagedFileDiffs = [
      new FileDiff('c.txt', null, 1234, 1234, 'removed'),
      new FileDiff('d.txt', 'e.txt', 1234, 1234, 'renamed')
    ]

    const component = new ChangeListsComponent({stagedFileDiffs, unstagedFileDiffs})
    assert.equal(component.element.querySelector('.git-StagedFiles .git-FileDiff.modified .git-FileDiff-path').textContent, 'a.txt')
    assert.equal(component.element.querySelector('.git-StagedFiles .git-FileDiff.added .git-FileDiff-path').textContent, 'b.txt')
    assert.equal(component.element.querySelector('.git-UnstagedFiles .git-FileDiff.removed .git-FileDiff-path').textContent, 'c.txt')
    assert.equal(component.element.querySelector('.git-UnstagedFiles .git-FileDiff.renamed .git-FileDiff-path').textContent, 'd.txt → e.txt')

    await component.update({stagedFileDiffs: unstagedFileDiffs, unstagedFileDiffs: stagedFileDiffs})
    assert.equal(component.element.querySelector('.git-StagedFiles .git-FileDiff.removed .git-FileDiff-path').textContent, 'c.txt')
    assert.equal(component.element.querySelector('.git-StagedFiles .git-FileDiff.renamed .git-FileDiff-path').textContent, 'd.txt → e.txt')
    assert.equal(component.element.querySelector('.git-UnstagedFiles .git-FileDiff.modified .git-FileDiff-path').textContent, 'a.txt')
    assert.equal(component.element.querySelector('.git-UnstagedFiles .git-FileDiff.added .git-FileDiff-path').textContent, 'b.txt')
  })

  describe('when a file diff is clicked', () => {
    it('invokes the supplied function', async () => {
      const diff1 = new FileDiff('a.txt', 'a.txt', 1234, 1234, 'modified')
      const diff2 = new FileDiff('b.txt', 'b.txt', 1234, 1234, 'removed')
      const diff3 = new FileDiff('c.txt', 'c.txt', 1234, 1234, 'added')
      const stagedDiffsClicks = []
      const unstagedDiffsClicks = []
      const component = new ChangeListsComponent({
        stagedFileDiffs: [diff1, diff2], unstagedFileDiffs: [diff3],
        onDidClickStagedFileDiff: (d) => stagedDiffsClicks.push(d),
        onDidClickUnstagedFileDiff: (d) => unstagedDiffsClicks.push(d)
      })

      component.element.querySelector('.git-StagedFiles .git-FileDiff.modified').dispatchEvent(new MouseEvent('click', {detail: 1}))
      assert.deepEqual(stagedDiffsClicks, [diff1])
      assert.deepEqual(unstagedDiffsClicks, [])

      component.element.querySelector('.git-UnstagedFiles .git-FileDiff.added').dispatchEvent(new MouseEvent('click', {detail: 1}))
      assert.deepEqual(stagedDiffsClicks, [diff1])
      assert.deepEqual(unstagedDiffsClicks, [diff3])

      component.element.querySelector('.git-StagedFiles .git-FileDiff.removed').dispatchEvent(new MouseEvent('click', {detail: 1}))
      assert.deepEqual(stagedDiffsClicks, [diff1, diff2])
      assert.deepEqual(unstagedDiffsClicks, [diff3])
    })
  })

  describe('when a file diff is double clicked', () => {
    it('invokes the supplied function', async () => {
      const diff1 = new FileDiff('a.txt', 'a.txt', 1234, 1234, 'modified')
      const diff2 = new FileDiff('b.txt', 'b.txt', 1234, 1234, 'removed')
      const diff3 = new FileDiff('c.txt', 'c.txt', 1234, 1234, 'added')
      const stagedDiffsDoubleClicks = []
      const unstagedDiffsDoubleClicks = []
      const component = new ChangeListsComponent({
        stagedFileDiffs: [diff1, diff2], unstagedFileDiffs: [diff3],
        onDidDoubleClickStagedFileDiff: (d) => stagedDiffsDoubleClicks.push(d),
        onDidDoubleClickUnstagedFileDiff: (d) => unstagedDiffsDoubleClicks.push(d)
      })

      component.element.querySelector('.git-StagedFiles .git-FileDiff.modified').dispatchEvent(new MouseEvent('click', {detail: 2}))
      assert.deepEqual(stagedDiffsDoubleClicks, [diff1])
      assert.deepEqual(unstagedDiffsDoubleClicks, [])

      component.element.querySelector('.git-UnstagedFiles .git-FileDiff.added').dispatchEvent(new MouseEvent('click', {detail: 2}))
      assert.deepEqual(stagedDiffsDoubleClicks, [diff1])
      assert.deepEqual(unstagedDiffsDoubleClicks, [diff3])

      component.element.querySelector('.git-StagedFiles .git-FileDiff.removed').dispatchEvent(new MouseEvent('click', {detail: 2}))
      assert.deepEqual(stagedDiffsDoubleClicks, [diff1, diff2])
      assert.deepEqual(unstagedDiffsDoubleClicks, [diff3])
    })
  })
})
