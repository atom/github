/** @babel */

import {cloneRepository, buildRepository} from '../helpers'
import path from 'path'
import fs from 'fs'
import dedent from 'dedent-js'

import FilePatch from '../../lib/models/file-patch'
import Hunk from '../../lib/models/hunk'
import HunkLine from '../../lib/models/hunk-line'

describe('FilePatch', () => {
  describe('update(filePatch)', () => {
    it('mutates the FilePatch to match the given FilePatch, replacing its hunks with the new filePatch\'s hunks', () => {
      const hunks = [
        new Hunk(1, 1, 1, 3, [
          new HunkLine('line-1', 'added', -1, 1),
          new HunkLine('line-2', 'added', -1, 2),
          new HunkLine('line-3', 'unchanged', 1, 3)
        ]),
        new Hunk(5, 7, 5, 4, [
          new HunkLine('line-4', 'unchanged', 5, 7),
          new HunkLine('line-5', 'deleted', 6, -1),
          new HunkLine('line-6', 'deleted', 7, -1),
          new HunkLine('line-7', 'added', -1, 8),
          new HunkLine('line-8', 'added', -1, 9),
          new HunkLine('line-9', 'added', -1, 10),
          new HunkLine('line-10', 'deleted', 8, -1),
          new HunkLine('line-11', 'deleted', 9, -1)
        ]),
        new Hunk(20, 19, 2, 2, [
          new HunkLine('line-12', 'deleted', 20, -1),
          new HunkLine('line-13', 'added', -1, 19),
          new HunkLine('line-14', 'unchanged', 21, 20)
        ])
      ]
      const patch = new FilePatch('a.txt', 'a.txt', 'modified', hunks)
      const newPatch = new FilePatch('a.txt', 'a.txt', 'modified', [
        new Hunk(9, 9, 2, 1, [
          new HunkLine('line-9', 'added', -1, 9),
          new HunkLine('line-10', 'deleted', 8, -1),
          new HunkLine('line-11', 'deleted', 9, -1)
        ]),
        new Hunk(15, 14, 1, 1, [
          new HunkLine('line-15', 'deleted', 15, -1),
          new HunkLine('line-16', 'added', -1, 14)
        ]),
        new Hunk(21, 19, 2, 3, [
          new HunkLine('line-13', 'added', -1, 19),
          new HunkLine('line-14', 'unchanged', 21, 20),
          new HunkLine('line-17', 'unchanged', 22, 21)
        ])
      ])

      const originalHunks = hunks.slice()
      const originalLines = originalHunks.map(h => h.getLines().slice())
      patch.update(newPatch)
      const newHunks = patch.getHunks()

      assert.deepEqual(patch, newPatch)
      assert.notDeepEqual(originalHunks, newHunks)
    })

    it('throws an error when the supplied filePatch has a different id', () => {
      const patch = new FilePatch('a.txt', 'b.txt', 'renamed')
      assert.throws(() => patch.update(new FilePatch('c.txt', 'd.txt', 'renamed')))
    })
  })

  describe('getStagePatchForLines()', () => {
    it('returns a new FilePatch that applies only the specified lines', () => {
      const filePatch = new FilePatch('a.txt', 'a.txt', 'modified', [
        new Hunk(1, 1, 1, 3, [
          new HunkLine('line-1', 'added', -1, 1),
          new HunkLine('line-2', 'added', -1, 2),
          new HunkLine('line-3', 'unchanged', 1, 3)
        ]),
        new Hunk(5, 7, 5, 4, [
          new HunkLine('line-4', 'unchanged', 5, 7),
          new HunkLine('line-5', 'deleted', 6, -1),
          new HunkLine('line-6', 'deleted', 7, -1),
          new HunkLine('line-7', 'added', -1, 8),
          new HunkLine('line-8', 'added', -1, 9),
          new HunkLine('line-9', 'added', -1, 10),
          new HunkLine('line-10', 'deleted', 8, -1),
          new HunkLine('line-11', 'deleted', 9, -1)
        ]),
        new Hunk(20, 19, 2, 2, [
          new HunkLine('line-12', 'deleted', 20, -1),
          new HunkLine('line-13', 'added', -1, 19),
          new HunkLine('line-14', 'unchanged', 21, 20)
        ])
      ])
      const linesFromHunk2 = filePatch.getHunks()[1].getLines().slice(1, 4)
      assert.deepEqual(filePatch.getStagePatchForLines(new Set(linesFromHunk2)), new FilePatch(
        'a.txt', 'a.txt', 'modified', [
          new Hunk(5, 5, 5, 4, [
            new HunkLine('line-4', 'unchanged', 5, 5),
            new HunkLine('line-5', 'deleted', 6, -1),
            new HunkLine('line-6', 'deleted', 7, -1),
            new HunkLine('line-7', 'added', -1, 6),
            new HunkLine('line-10', 'unchanged', 8, 7),
            new HunkLine('line-11', 'unchanged', 9, 8)
          ])
        ]
      ))

      // add lines from other hunks
      const linesFromHunk1 = filePatch.getHunks()[0].getLines().slice(0, 1)
      const linesFromHunk3 = filePatch.getHunks()[2].getLines().slice(1, 2)
      const selectedLines = linesFromHunk2.concat(linesFromHunk1, linesFromHunk3)
      assert.deepEqual(filePatch.getStagePatchForLines(new Set(selectedLines)), new FilePatch(
        'a.txt', 'a.txt', 'modified', [
          new Hunk(1, 1, 1, 2, [
            new HunkLine('line-1', 'added', -1, 1),
            new HunkLine('line-3', 'unchanged', 1, 2)
          ]),
          new Hunk(5, 6, 5, 4, [
            new HunkLine('line-4', 'unchanged', 5, 6),
            new HunkLine('line-5', 'deleted', 6, -1),
            new HunkLine('line-6', 'deleted', 7, -1),
            new HunkLine('line-7', 'added', -1, 7),
            new HunkLine('line-10', 'unchanged', 8, 8),
            new HunkLine('line-11', 'unchanged', 9, 9)
          ]),
          new Hunk(20, 18, 2, 3, [
            new HunkLine('line-12', 'unchanged', 20, 18),
            new HunkLine('line-13', 'added', -1, 19),
            new HunkLine('line-14', 'unchanged', 21, 20)
          ])
        ]
      ))
    })
  })

  describe('getUnstagePatchForLines()', () => {
    it('returns a new FilePatch that applies only the specified lines', () => {
      const filePatch = new FilePatch('a.txt', 'a.txt', 'modified', [
        new Hunk(1, 1, 1, 3, [
          new HunkLine('line-1', 'added', -1, 1),
          new HunkLine('line-2', 'added', -1, 2),
          new HunkLine('line-3', 'unchanged', 1, 3)
        ]),
        new Hunk(5, 7, 5, 4, [
          new HunkLine('line-4', 'unchanged', 5, 7),
          new HunkLine('line-5', 'deleted', 6, -1),
          new HunkLine('line-6', 'deleted', 7, -1),
          new HunkLine('line-7', 'added', -1, 8),
          new HunkLine('line-8', 'added', -1, 9),
          new HunkLine('line-9', 'added', -1, 10),
          new HunkLine('line-10', 'deleted', 8, -1),
          new HunkLine('line-11', 'deleted', 9, -1)
        ]),
        new Hunk(20, 19, 2, 2, [
          new HunkLine('line-12', 'deleted', 20, -1),
          new HunkLine('line-13', 'added', -1, 19),
          new HunkLine('line-14', 'unchanged', 21, 20)
        ])
      ])
      const lines = new Set(filePatch.getHunks()[1].getLines().slice(1, 5))
      assert.deepEqual(filePatch.getUnstagePatchForLines(lines), new FilePatch(
        'a.txt', 'a.txt', 'modified', [
          new Hunk(7, 7, 4, 4, [
            new HunkLine('line-4', 'unchanged', 7, 7),
            new HunkLine('line-7', 'deleted', 8, -1),
            new HunkLine('line-8', 'deleted', 9, -1),
            new HunkLine('line-5', 'added', -1, 8),
            new HunkLine('line-6', 'added', -1, 9),
            new HunkLine('line-9', 'unchanged', 10, 10)
          ])
        ]
      ))
    })
  })

  describe('toString()', () => {
    it('converts the patch to the standard textual format', async () => {
      const workdirPath = await cloneRepository('multi-line-file')
      const repository = await buildRepository(workdirPath)

      const lines = fs.readFileSync(path.join(workdirPath, 'sample.js'), 'utf8').split('\n')
      lines[0] = 'this is a modified line'
      lines.splice(1, 0, 'this is a new line')
      lines[11] = 'this is a modified line'
      lines.splice(12, 1)
      fs.writeFileSync(path.join(workdirPath, 'sample.js'), lines.join('\n'))

      const [patch] = await repository.getUnstagedChanges()
      assert.equal(patch.toString(), dedent`
        @@ -1,4 +1,5 @@
        -var quicksort = function () {
        +this is a modified line
        +this is a new line
           var sort = function(items) {
             if (items.length <= 1) return items;
             var pivot = items.shift(), current, left = [], right = [];
        @@ -8,6 +9,5 @@
             }
             return sort(left).concat(pivot).concat(sort(right));
           };
        -
        -  return sort(Array.apply(this, arguments));
        +this is a modified line
         };

      `)
    })

    it('correctly formats new files with no newline at the end', async () => {
      const workingDirPath = await cloneRepository('three-files')
      const repo = await buildRepository(workingDirPath)
      fs.writeFileSync(path.join(workingDirPath, 'e.txt'), 'qux', 'utf8')
      const [patch] = await repo.getUnstagedChanges()

      assert.equal(patch.toString(), dedent`
        @@ -0,0 +1,1 @@
        +qux
        \\ No newline at end of file

      `)
    })
  })
})
