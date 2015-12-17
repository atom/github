/** @babel */

import fs from 'fs'
import path from 'path'
import FileDiff from '../lib/file-diff'
import {createObjectsFromString} from '../lib/common'

function readFileSync(filePath) {
  return fs.readFileSync(path.join(__dirname, filePath), 'utf-8')
}

function createFileDiffsFromString(str) {
  return createObjectsFromString(str, 'FILE', FileDiff)
}

function createFileDiffsFromPath(filePath) {
  let fileStr = readFileSync(filePath)
  return createFileDiffsFromString(fileStr)
}

module.exports = {
  createFileDiffsFromString,
  createFileDiffsFromPath,
  readFileSync
}
