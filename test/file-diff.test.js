/** @babel */

import {copyRepositoryDir, buildRepository} from './helpers'
import path from 'path'
import fs from 'fs'
import dedent from 'dedent-js'

describe('FileDiff', () => {
  describe('toString()', () =>{
    it('converts the diff to the standard textual format', async () => {
      const workdirPath = copyRepositoryDir(2)
      const repository = await buildRepository(workdirPath)

      const lines = fs.readFileSync(path.join(workdirPath, 'sample.js'), 'utf8').split('\n')
      lines[0] = 'this is a modified line'
      lines.splice(1, 0, 'this is a new line')
      lines[11] = 'this is a modified line'
      lines.splice(12, 1)
      fs.writeFileSync(path.join(workdirPath, 'sample.js'), lines.join('\n'))

      const [diff] = await repository.getUnstagedChanges()
      assert.equal(diff.toString(), dedent`
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
      const workingDirPath = copyRepositoryDir(1)
      const repo = await buildRepository(workingDirPath)
      fs.writeFileSync(path.join(workingDirPath, 'e.txt'), 'qux', 'utf8')
      const [diff] = await repo.getUnstagedChanges()

      assert.equal(diff.toString(), dedent`
        @@ -0,0 +1,1 @@
        +qux
        \\ No newline at end of file

      `)
    })
  })
})
