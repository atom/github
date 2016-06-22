/** @babel */

import FileDiff from '../lib/file-diff'
import FileDiffListComponent from '../lib/file-diff-list-component'

describe('FileDiffListComponent', () => {
  it('renders file diffs, allowing one of them to be selected', async () => {
    const fileDiffs = [
      new FileDiff('a.txt', 'a.txt', 1234, 1234, 'modified'),
      new FileDiff(null, 'b.txt', 1234, 1234, 'added'),
      new FileDiff('c.txt', null, 1234, 1234, 'removed'),
      new FileDiff('d.txt', 'e.txt', 1234, 1234, 'renamed')
    ]

    const component = new FileDiffListComponent({fileDiffs})
    assert.equal(component.element.querySelector('.git-FileDiff.modified .git-FileDiff-path').textContent, 'a.txt')
    assert.equal(component.element.querySelector('.git-FileDiff.added .git-FileDiff-path').textContent, 'b.txt')
    assert.equal(component.element.querySelector('.git-FileDiff.removed .git-FileDiff-path').textContent, 'c.txt')
    assert.equal(component.element.querySelector('.git-FileDiff.renamed .git-FileDiff-path').textContent, 'd.txt → e.txt')

    await component.update({fileDiffs})
    assert.equal(component.element.querySelector('.git-FileDiff.modified .git-FileDiff-path').textContent, 'a.txt')
    assert.equal(component.element.querySelector('.git-FileDiff.added .git-FileDiff-path').textContent, 'b.txt')
    assert.equal(component.element.querySelector('.git-FileDiff.removed .git-FileDiff-path').textContent, 'c.txt')
    assert.equal(component.element.querySelector('.git-FileDiff.renamed .git-FileDiff-path').textContent, 'd.txt → e.txt')

    await component.update({fileDiffs, selectedFileDiff: fileDiffs[1]})
    let selectedDiffs = component.element.querySelectorAll('.git-FileDiff.is-selected .git-FileDiff-path')
    assert.equal(selectedDiffs.length, 1)
    assert.equal(selectedDiffs[0].textContent, 'b.txt')

    await component.update({fileDiffs, selectedFileDiff: fileDiffs[3]})
    selectedDiffs = component.element.querySelectorAll('.git-FileDiff.is-selected .git-FileDiff-path')
    assert.equal(selectedDiffs.length, 1)
    assert.equal(selectedDiffs[0].textContent, 'd.txt → e.txt')
  })

  describe('when a file diff is clicked', () => {
    it('invokes the supplied function', async () => {
      const fileDiffs = [
        new FileDiff('a.txt', 'a.txt', 1234, 1234, 'modified'),
        new FileDiff(null, 'b.txt', 1234, 1234, 'added'),
        new FileDiff('c.txt', null, 1234, 1234, 'removed'),
        new FileDiff('d.txt', 'e.txt', 1234, 1234, 'renamed')
      ]
      const clickedDiffs = []
      const component = new FileDiffListComponent({
        fileDiffs,
        onDidClickFileDiff: (d) => clickedDiffs.push(d)
      })

      component.element.querySelector('.git-FileDiff.modified').dispatchEvent(new MouseEvent('click', {detail: 1}))
      assert.deepEqual(clickedDiffs, [fileDiffs[0]])

      component.element.querySelector('.git-FileDiff.renamed').dispatchEvent(new MouseEvent('click', {detail: 1}))
      assert.deepEqual(clickedDiffs, [fileDiffs[0], fileDiffs[3]])
    })
  })

  describe('when a file diff is double-clicked', () => {
    it('invokes the supplied function', async () => {
      const fileDiffs = [
        new FileDiff('a.txt', 'a.txt', 1234, 1234, 'modified'),
        new FileDiff(null, 'b.txt', 1234, 1234, 'added'),
        new FileDiff('c.txt', null, 1234, 1234, 'removed'),
        new FileDiff('d.txt', 'e.txt', 1234, 1234, 'renamed')
      ]
      const doubleClickedDiffs = []
      const component = new FileDiffListComponent({
        fileDiffs,
        onDidDoubleClickFileDiff: (d) => doubleClickedDiffs.push(d)
      })

      component.element.querySelector('.git-FileDiff.modified').dispatchEvent(new MouseEvent('click', {detail: 2}))
      assert.deepEqual(doubleClickedDiffs, [fileDiffs[0]])

      component.element.querySelector('.git-FileDiff.renamed').dispatchEvent(new MouseEvent('click', {detail: 2}))
      assert.deepEqual(doubleClickedDiffs, [fileDiffs[0], fileDiffs[3]])
    })
  })
})
