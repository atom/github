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
    assert.equal(component.element.querySelector('.git-FileDiffListItem.modified .git-FileDiffListItem-path').textContent, 'a.txt')
    assert.equal(component.element.querySelector('.git-FileDiffListItem.added .git-FileDiffListItem-path').textContent, 'b.txt')
    assert.equal(component.element.querySelector('.git-FileDiffListItem.removed .git-FileDiffListItem-path').textContent, 'c.txt')
    assert.equal(component.element.querySelector('.git-FileDiffListItem.renamed .git-FileDiffListItem-path').textContent, 'd.txt → e.txt')

    await component.update({fileDiffs})
    assert.equal(component.element.querySelector('.git-FileDiffListItem.modified .git-FileDiffListItem-path').textContent, 'a.txt')
    assert.equal(component.element.querySelector('.git-FileDiffListItem.added .git-FileDiffListItem-path').textContent, 'b.txt')
    assert.equal(component.element.querySelector('.git-FileDiffListItem.removed .git-FileDiffListItem-path').textContent, 'c.txt')
    assert.equal(component.element.querySelector('.git-FileDiffListItem.renamed .git-FileDiffListItem-path').textContent, 'd.txt → e.txt')

    await component.selectFileDiff(fileDiffs[1])
    let selectedDiffs = component.element.querySelectorAll('.git-FileDiffListItem.is-selected .git-FileDiffListItem-path')
    assert.equal(selectedDiffs.length, 1)
    assert.deepEqual(component.selectedFileDiff, fileDiffs[1])
    assert.equal(selectedDiffs[0].textContent, 'b.txt')

    await component.selectFileDiff(fileDiffs[3])
    selectedDiffs = component.element.querySelectorAll('.git-FileDiffListItem.is-selected .git-FileDiffListItem-path')
    assert.equal(selectedDiffs.length, 1)
    assert.deepEqual(component.selectedFileDiff, fileDiffs[3])
    assert.equal(selectedDiffs[0].textContent, 'd.txt → e.txt')
  })

  describe('when a file diff is selected via single clicked', () => {
    it('invokes the supplied function', async () => {
      const fileDiffs = [
        new FileDiff('a.txt', 'a.txt', 1234, 1234, 'modified'),
        new FileDiff(null, 'b.txt', 1234, 1234, 'added'),
        new FileDiff('c.txt', null, 1234, 1234, 'removed'),
        new FileDiff('d.txt', 'e.txt', 1234, 1234, 'renamed')
      ]
      const selectedDiffs = []
      const component = new FileDiffListComponent({
        fileDiffs,
        didSelectFileDiff: (d) => selectedDiffs.push(d)
      })

      component.element.querySelector('.git-FileDiffListItem.modified').dispatchEvent(new MouseEvent('click', {detail: 1}))
      assert.deepEqual(selectedDiffs, [fileDiffs[0]])

      component.element.querySelector('.git-FileDiffListItem.renamed').dispatchEvent(new MouseEvent('click', {detail: 1}))
      assert.deepEqual(selectedDiffs, [fileDiffs[0], fileDiffs[3]])
    })

    it('selects the file diff', () => {
      const fileDiffs = [
        new FileDiff('a.txt', 'a.txt', 1234, 1234, 'modified'),
        new FileDiff(null, 'b.txt', 1234, 1234, 'added'),
        new FileDiff('c.txt', null, 1234, 1234, 'removed'),
        new FileDiff('d.txt', 'e.txt', 1234, 1234, 'renamed')
      ]

      const component = new FileDiffListComponent({fileDiffs})
      assert.deepEqual(component.selectedFileDiff, fileDiffs[0])

      component.element.querySelector('.git-FileDiffListItem.added').dispatchEvent(new MouseEvent('click', {detail: 1}))
      assert.deepEqual(component.selectedFileDiff, fileDiffs[1])

      component.element.querySelector('.git-FileDiffListItem.renamed').dispatchEvent(new MouseEvent('click', {detail: 1}))
      assert.deepEqual(component.selectedFileDiff, fileDiffs[3])
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
      const confirmedDiffs = []
      const component = new FileDiffListComponent({
        fileDiffs,
        didConfirmFileDiff: (d) => confirmedDiffs.push(d)
      })

      component.element.querySelector('.git-FileDiffListItem.modified').dispatchEvent(new MouseEvent('click', {detail: 2}))
      assert.deepEqual(confirmedDiffs, [fileDiffs[0]])

      component.element.querySelector('.git-FileDiffListItem.renamed').dispatchEvent(new MouseEvent('click', {detail: 2}))
      assert.deepEqual(confirmedDiffs, [fileDiffs[0], fileDiffs[3]])
    })
  })
})
