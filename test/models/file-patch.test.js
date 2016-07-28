/** @babel */

import {copyRepositoryDir, buildRepository} from '../helpers'
import path from 'path'
import fs from 'fs'
import dedent from 'dedent-js'

import FilePatch from '../../lib/models/file-patch'
import Hunk from '../../lib/models/hunk'
import HunkLine from '../../lib/models/hunk-line'

describe('FilePatch', () => {
  describe('getId()', () => {
    it('returns a logical identifier for the FilePatch', () => {
      assert.equal(new FilePatch('a.txt', 'b.txt', 1234, 1234, 'renamed').getId(), 'a/a.txt b/b.txt')
      assert.equal(new FilePatch('a.txt', 'a.txt', 1234, 1234, 'modified').getId(), 'a/a.txt b/a.txt')
      assert.equal(new FilePatch(null, 'a.txt', 0, 1234, 'added').getId(), 'a/null b/a.txt')
      assert.equal(new FilePatch('a.txt', null, 1234, 0, 'removed').getId(), 'a/a.txt b/null')
    })
  })

  describe('update(filePatch)', () => {
    it('mutates the FilePatch to match the given FilePatch, preserving hunk and line instances where possible', () => {
      const hunks = [
        new Hunk(1, 1, 1, 3, [
          new HunkLine('line-1\n', 'added', -1, 1),
          new HunkLine('line-2\n', 'added', -1, 2),
          new HunkLine('line-3\n', 'unchanged', 1, 3)
        ]),
        new Hunk(5, 7, 5, 4, [
          new HunkLine('line-4\n', 'unchanged', 5, 7),
          new HunkLine('line-5\n', 'removed', 6, -1),
          new HunkLine('line-6\n', 'removed', 7, -1),
          new HunkLine('line-7\n', 'added', -1, 8),
          new HunkLine('line-8\n', 'added', -1, 9),
          new HunkLine('line-9\n', 'added', -1, 10),
          new HunkLine('line-10\n', 'removed', 8, -1),
          new HunkLine('line-11\n', 'removed', 9, -1)
        ]),
        new Hunk(20, 19, 2, 2, [
          new HunkLine('line-12\n', 'removed', 20, -1),
          new HunkLine('line-13\n', 'added', -1, 19),
          new HunkLine('line-14\n', 'unchanged', 21, 20)
        ])
      ]
      const patch = new FilePatch('a.txt', 'b.txt', 1234, 1234, 'renamed', hunks)
      const newPatch = new FilePatch('a.txt', 'b.txt', 1234, 1234, 'renamed', [
        new Hunk(9, 9, 2, 1, [
          new HunkLine('line-9\n', 'added', -1, 9),
          new HunkLine('line-10\n', 'removed', 8, -1),
          new HunkLine('line-11\n', 'removed', 9, -1)
        ]),
        new Hunk(15, 14, 1, 1, [
          new HunkLine('line-15\n', 'removed', 15, -1),
          new HunkLine('line-16\n', 'added', -1, 14)
        ]),
        new Hunk(21, 19, 2, 3, [
          new HunkLine('line-13\n', 'added', -1, 19),
          new HunkLine('line-14\n', 'unchanged', 21, 20),
          new HunkLine('line-17\n', 'unchanged', 22, 21)
        ])
      ])

      const originalHunks = hunks.slice()
      const originalLines = originalHunks.map(h => h.getLines().slice())
      patch.update(newPatch)
      const newHunks = patch.getHunks()

      assert.deepEqual(patch, newPatch)

      assert.equal(newHunks.length, 3)
      assert.equal(newHunks.indexOf(originalHunks[0]), -1)
      assert.equal(newHunks.indexOf(originalHunks[1]), 0)
      assert.equal(newHunks.indexOf(originalHunks[2]), 2)

      assert.equal(newHunks[0].getLines().indexOf(originalLines[1][0]), -1)
      assert.equal(newHunks[0].getLines().indexOf(originalLines[1][5]), 0)
      assert.equal(newHunks[0].getLines().indexOf(originalLines[1][7]), 2)
      assert.equal(newHunks[2].getLines().indexOf(originalLines[1][0]), -1)
      assert.equal(newHunks[2].getLines().indexOf(originalLines[2][1]), 0)
      assert.equal(newHunks[2].getLines().indexOf(originalLines[2][2]), 1)
    })

    it('throws an error when the supplied filePatch has a different id', () => {
      const patch = new FilePatch('a.txt', 'b.txt', 1234, 1234, 'renamed')
      assert.throws(() => patch.update(new FilePatch('c.txt', 'd.txt', 1234, 1234, 'renamed')))
    })
  })

  describe('getStagePatchForLines()', () => {
    it('returns a new FilePatch that applies only the specified lines', () => {
      const filePatch = new FilePatch('a.txt', 'a.txt', 1234, 1234, 'modified', [
        new Hunk(1, 1, 1, 3, [
          new HunkLine('line-1\n', 'added', -1, 1),
          new HunkLine('line-2\n', 'added', -1, 2),
          new HunkLine('line-3\n', 'unchanged', 1, 3)
        ]),
        new Hunk(5, 7, 5, 4, [
          new HunkLine('line-4\n', 'unchanged', 5, 7),
          new HunkLine('line-5\n', 'removed', 6, -1),
          new HunkLine('line-6\n', 'removed', 7, -1),
          new HunkLine('line-7\n', 'added', -1, 8),
          new HunkLine('line-8\n', 'added', -1, 9),
          new HunkLine('line-9\n', 'added', -1, 10),
          new HunkLine('line-10\n', 'removed', 8, -1),
          new HunkLine('line-11\n', 'removed', 9, -1)
        ]),
        new Hunk(20, 19, 2, 2, [
          new HunkLine('line-12\n', 'removed', 20, -1),
          new HunkLine('line-13\n', 'added', -1, 19),
          new HunkLine('line-14\n', 'unchanged', 21, 20)
        ])
      ])
      const lines = new Set(filePatch.getHunks()[1].getLines().slice(1, 4))
      assert.deepEqual(filePatch.getStagePatchForLines(lines), new FilePatch(
        'a.txt', 'a.txt', 1234, 1234, 'modified', [
          new Hunk(5, 5, 5, 4, [
            new HunkLine('line-4\n', 'unchanged', 5, 5),
            new HunkLine('line-5\n', 'removed', 6, -1),
            new HunkLine('line-6\n', 'removed', 7, -1),
            new HunkLine('line-7\n', 'added', -1, 6),
            new HunkLine('line-10\n', 'unchanged', 8, 7),
            new HunkLine('line-11\n', 'unchanged', 9, 8)
          ])
        ]
      ))
    })
  })

  describe('getUnstagePatchForLines()', () => {
    it('returns a new FilePatch that applies only the specified lines', () => {
      const filePatch = new FilePatch('a.txt', 'a.txt', 1234, 1234, 'modified', [
        new Hunk(1, 1, 1, 3, [
          new HunkLine('line-1\n', 'added', -1, 1),
          new HunkLine('line-2\n', 'added', -1, 2),
          new HunkLine('line-3\n', 'unchanged', 1, 3)
        ]),
        new Hunk(5, 7, 5, 4, [
          new HunkLine('line-4\n', 'unchanged', 5, 7),
          new HunkLine('line-5\n', 'removed', 6, -1),
          new HunkLine('line-6\n', 'removed', 7, -1),
          new HunkLine('line-7\n', 'added', -1, 8),
          new HunkLine('line-8\n', 'added', -1, 9),
          new HunkLine('line-9\n', 'added', -1, 10),
          new HunkLine('line-10\n', 'removed', 8, -1),
          new HunkLine('line-11\n', 'removed', 9, -1)
        ]),
        new Hunk(20, 19, 2, 2, [
          new HunkLine('line-12\n', 'removed', 20, -1),
          new HunkLine('line-13\n', 'added', -1, 19),
          new HunkLine('line-14\n', 'unchanged', 21, 20)
        ])
      ])
      const lines = new Set(filePatch.getHunks()[1].getLines().slice(1, 5))
      assert.deepEqual(filePatch.getUnstagePatchForLines(lines), new FilePatch(
        'a.txt', 'a.txt', 1234, 1234, 'modified', [
          new Hunk(7, 7, 4, 4, [
            new HunkLine('line-4\n', 'unchanged', 7, 7),
            new HunkLine('line-7\n', 'removed', 8, -1),
            new HunkLine('line-8\n', 'removed', 9, -1),
            new HunkLine('line-5\n', 'added', -1, 8),
            new HunkLine('line-6\n', 'added', -1, 9),
            new HunkLine('line-9\n', 'unchanged', 10, 10)
          ])
        ]
      ))
    })
  })

  describe('toString()', () => {
    it('converts the patch to the standard textual format', async () => {
      const workdirPath = copyRepositoryDir('multi-line-file')
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
      const workingDirPath = copyRepositoryDir('three-files')
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
