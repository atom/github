'use babel'

import {GitRepositoryAsync} from 'atom'
const Git = GitRepositoryAsync.Git
const diff = require('diff')

export function isEditor (item) {
  return item && item.getPath
}

export function getForegroundEditors () {
  return atom.workspace.getPanes()
    .map(pane => pane.getActiveItem())
    .filter(item => isEditor(item))
}

export function groupBy (items, fieldGetter) {
  if (typeof fieldGetter === 'string') {
    const prop = fieldGetter
    fieldGetter = (item) => item[prop]
  }
  const itemsByField = new Map()
  items.forEach(item => {
    const field = fieldGetter(item)
    const arr = itemsByField.get(field) || []
    arr.push(item)
    itemsByField.set(field, arr)
  })
  return itemsByField
}

export function getCommentsById (comments) {
  return comments.reduce((acc, comment) => {
    return acc.set(comment.id, comment)
  }, new Map())
}

export function groupCommentsByOriginalCommitId (commentIds, commentsById) {
  return [...commentIds.values()].reduce((acc, id) => {
    const commitId = commentsById.get(id).original_commit_id
    if (!acc.has(commitId)) {
      acc.set(commitId, new Map())
    }
    acc.get(commitId).set(id, commentsById.get(id))
    return acc
  }, new Map())
}

export async function getFileForCommitId (commitId, projectPath, filePath) {
  const repo = await Git.Repository.open(projectPath)
  const commit = await repo.getCommit(commitId)
  const tree = await commit.getTree()
  const contents = await tree.getEntry(filePath)
  const blob = await contents.getBlob()
  return blob.toString()
}

export function addRowForComments (commentsById, diffStr) {
  commentsById.forEach((comment, commentId) => {
    comment.row = getLineNumber(diffStr, comment.path, comment.original_position) - 1
  })
  return commentsById
}

export function getLineNumber (diffStr, fileName, hunkPosition) {
  const parsed = diff.parsePatch(diffStr)

  const file = parsed.filter(p => p.newFileName === 'b/' + fileName)[0]

  let linesParsed = 0
  for (let hunk of file.hunks) {
    if (linesParsed + hunk.lines.length >= hunkPosition) {
      const remainingLines = hunk.lines.slice(0, hunkPosition - linesParsed)
      // on the right side of the diff,
      // context and added lines increment the line number
      return remainingLines.reduce((acc, line) => {
        return line[0] === '-' ? acc : acc + 1
      }, hunk.newStart - 1)
    } else {
      // include the header for the next hunk (if any)
      linesParsed += hunk.lines.length + 1
    }
  }
}
