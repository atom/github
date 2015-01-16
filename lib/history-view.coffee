Git = require 'nodegit'
TemplateHelper = require 'template-helper'

BaseTemplate = """
  <div class="history"></div>
  <div class="diffs"></div>
"""

CommitSummaryTemplateString = """
  <div class="commit">
    <div class="sha"></div>
    <div class="author"></div>
    <div class="message"></div>
  </div>
"""



class GitHistory
  commits: {}
  numberCommits: 10

  constructor: ->
    @repoPromise = Git.Repository.open(atom.project.getPaths()[0])

  addCommit: (commit) -> @commits[commit.sha()] = commit

  getCommit: (sha) -> @commits[sha]

  walkHistory: (commitCallback) ->
    walk = (repo, walker, numberCommits, callback) ->
      return if numberCommits == 0
      walker.next().then (oid) =>
        repo.getCommit(oid).then(callback)
        walk(repo, walker, numberCommits - 1, callback)

    @repoPromise.then (repo) =>
      repo.getHeadCommit().then (commit) =>
        walker = repo.createRevWalk()
        walker.push(commit.id())
        walk repo, walker, @numberCommits, (commit) =>
          @addCommit(commit)
          commitCallback(commit)


class HistoryView extends HTMLElement
  createdCallback: ->
    window.diffsView = this

    @history = new GitHistory()

    @innerHTML = BaseTemplate
    @historyNode = @querySelector('.history')
    @diffsNode = @querySelector('.diffs')

    @historyNode.addEventListener 'click', (e) =>
      commitNode = e.target
      while commitNode? && !commitNode.classList?.contains('commit')
        commitNode = commitNode.parentNode
      if commitNode?
        sha = commitNode.querySelector('.sha').textContent
        @renderCommitDetail(sha)

    @commitTemplate = TemplateHelper.addTemplate(this, CommitSummaryTemplateString)

    @renderHistory().catch (error) ->
      console.error error.message, error
      console.error error.stack

  getTitle: ->
    'Git History View'

  renderHistory: ->
    new Promise (resolve, reject) =>
      @history.walkHistory (commit) =>
        promise = @renderCommitSummary(commit)
        resolve(commit)
        promise
    .then (firstCommit) =>
      @renderCommitDetail(firstCommit.sha())

  renderCommitSummary: (commit) ->
    # We still dont have a good view framework yet
    commitNode = TemplateHelper.renderTemplate(@commitTemplate)
    commitNode.querySelector('.sha').textContent = commit.sha()
    commitNode.querySelector('.author').textContent = commit.author().name()
    commitNode.querySelector('.message').textContent = commit.message().split('\n')[0]
    commitNode.firstElementChild.id = "sha-#{commit.sha()}"
    @historyNode.appendChild(commitNode)

  renderCommitDetail: (sha) ->
    @diffsNode.innerHTML = ''

    for commitNode in @querySelectorAll('.commit')
      commitNode.classList.remove('selected')
    @querySelector("#sha-#{sha}")?.classList.add('selected')

    commit = @history.getCommit(sha)
    commit.getDiff().then (diffList) =>
      for diff in diffList
        window.diff = diff
        for patch in diff.patches()
          patchView = document.createElement('patch-view')
          patchView.setPatch(patch)
          @diffsNode.appendChild(patchView)


PatchTemplateString = """
  <div class="diff-file"></div>
  <table class="diff-hunk"></table>
"""

PatchLineTemplateString = """
  <tr class="diff-hunk-line">
    <td class="old-line-number"></td>
    <td class="new-line-number"></td>
    <td class="diff-hunk-data"></td>
  </tr>
"""

class PatchView extends HTMLElement
  @lineTemplate: TemplateHelper.addTemplate(document.body, PatchLineTemplateString)

  setPatch: (@patch) ->
    @innerHTML = PatchTemplateString
    fileNode = @querySelector('.diff-file')
    hunkNode = @querySelector('.diff-hunk')

    fileNode.textContent = @patch.newFile().path()

    for hunk in @patch.hunks()
      hunkHeaderNode = TemplateHelper.renderTemplate(PatchView.lineTemplate)
      hunkHeaderNode.firstElementChild.classList.add('diff-hunk-header')
      hunkHeaderNode.querySelector('.diff-hunk-data').textContent = hunk.header()
      hunkNode.appendChild(hunkHeaderNode)

      for line in hunk.lines()
        hunkLineNode = TemplateHelper.renderTemplate(PatchView.lineTemplate)
        content = line.content().split(/[\r\n]/g)[0] # srsly.
        lineOrigin = String.fromCharCode(line.origin())

        switch lineOrigin
          when '-' then hunkLineNode.firstElementChild.classList.add('deletion')
          when '+' then hunkLineNode.firstElementChild.classList.add('addition')

        hunkLineNode.querySelector('.diff-hunk-data').textContent = lineOrigin + content
        hunkLineNode.querySelector('.old-line-number').textContent = line.oldLineno() if line.oldLineno() > 0
        hunkLineNode.querySelector('.new-line-number').textContent = line.newLineno() if line.newLineno() > 0
        hunkNode.appendChild(hunkLineNode)

document.registerElement 'patch-view', prototype: PatchView.prototype

module.exports = document.registerElement 'git-experiment-history-view', prototype: HistoryView.prototype
