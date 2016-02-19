var {
  Emitter,
  GitRepositoryAsync
} = require("atom");

var ChildProcess = require("child_process");
var os = require("os");
var fse = require("fs-extra");
var Path = require("path");
var _ = require("underscore-contrib");
var exec = ChildProcess.exec;
var JsDiff = require("diff");
var Git = GitRepositoryAsync.Git;

module.exports = class GitService {
  statuses = {};

  static instance() {
    (this._instance == null ? this._instance = new GitService() : undefined);
    return this._instance;
  }

  static statusCodes() {
    return Git.Status.STATUS;
  }

  constructor() {
    this.tmpDir = os.tmpDir();
    this.repoPath = atom.project.getPaths()[0];
    this.emitter = new Emitter();
    this.stagePatches.bind(this);
    this.unstagePatches.bind(this);
  }

  emit(event) {
    return this.emitter.emit(event);
  }

  onDidUpdateRepository(callback) {
    return this.emitter.on("did-update-repository", callback);
  }

  updateRepository() {
    return this.emitter.emit("did-update-repository");
  }

  getBranchName() {
    return Git.Repository.open(this.repoPath).then(function(repo) {
      return repo.getBranch("HEAD");
    }).then(branch => {
      return this.normalizeBranchName(branch.name());
    }).catch(function() {
      return Promise.resolve("master");
    });
  }

  normalizeBranchName(name) {
    return name.replace("refs/heads/", "");
  }

  localBranches() {
    var data = {};
    var branches = [];

    return this.getBranchName().then(branchName => {
      data.branchName = branchName;
      return Git.Repository.open(this.repoPath);
    }).then(function(repo) {
      return repo.getReferenceNames();
    }).then(function(refs) {
      var matches;
      var matches;

      for (let ref in refs) {
        if (matches = ref.match(/^refs\/heads\/(.*)/)) {
          var branch = {
            name: matches[1],
            current: matches[1] === data.branchName
          };

          branches.push(branch);
        }
      }

      for (let ref in refs) {
        if (matches = ref.match(/^refs\/remotes\/origin\/(.*)/)) {
          var branch = {
            name: matches[1],
            current: matches[1] === data.branchName,
            remote: true
          };

          var local = _.find(branches, function(br) {
            return br.name === branch.name;
          });

          (!(local || branch.name === "HEAD") ? branches.push(branch) : undefined);
        }
      }

      return branches.sort(function(a, b) {
        var aName = a.name.toLowerCase();
        var bName = b.name.toLowerCase();

        if (aName < bName) {
          return -1;
        } else if (aName > bName) {
          return 1;
        } else {
          return 0;
        }
      });
    }).catch(function() {
      return Promise.resolve({
        name: "master",
        current: true
      });
    });
  }

  createBranch(
    {
      name,
      from
    }) {
    var data = {};
    var name = this.normalizeBranchName(name);

    return Git.Repository.open(this.repoPath).then(function(repo) {
      data.repo = repo;
      return repo.getBranchCommit(from);
    }).then(branch => {
      var signature = data.repo.defaultSignature();
      var message = ("Created " + (name) + " from " + (from));

      return data.repo.createBranch(name, branch, 0, signature, message).then(() => {
        return this.checkoutBranch(name);
      });
    }).then(() => {
      return this.emitter.emit("did-update-repository");
    });
  }

  trackRemoteBranch(name) {
    return this.createBranch({
      name: name,
      from: ("origin/" + (name))
    }).then(() => {
      return Git.Repository.open(this.repoPath);
    }).then(function(repo) {
      return repo.getBranch(name);
    }).then(function(branch) {
      return Git.Branch.setUpstream(branch, ("origin/" + (name)));
    }).then(() => {
      return this.emitter.emit("did-update-repository");
    });
  }

  checkoutBranch(name) {
    return Git.Repository.open(this.repoPath).then(function(repo) {
      return repo.checkoutBranch(name);
    }).then(() => {
      return this.emitter.emit("did-update-repository");
    });
  }

  getDiffForPath(path, state) {
    return this.diffsPromise.then(function(diffs) {
      var ref;

      return (((ref = diffs[state]) != null ? ref.patches : void 0))().then(function(patchList) {
        return _.find(patchList, function(patch) {
          return patch.newFile().path() === path;
        });
      });
    });
  }

  getDiffs(state) {
    return this.diffsPromise.then(function(diffs) {
      var ref1;

      return (((ref1 = diffs[state]) != null ? ref1.patches : void 0))().then(function(patchList) {
        return patchList;
      });
    });
  }

  gatherDiffs() {
    var data = {};

    var diffOpts = {
      flags: Git.Diff.OPTION.SHOW_UNTRACKED_CONTENT | Git.Diff.OPTION.RECURSE_UNTRACKED_DIRS
    };

    var findOpts = {
      flags: Git.Diff.FIND.RENAMES | Git.Diff.FIND.FOR_UNTRACKED
    };

    return this.diffsPromise = Git.Repository.open(this.repoPath).then(function(repo) {
      data.repo = repo;
      return data.repo.openIndex();
    }).then(function(index) {
      data.index = index;
      return Git.Diff.indexToWorkdir(data.repo, data.index, diffOpts);
    }).then(function(unstagedDiffs) {
      data.unstagedDiffs = unstagedDiffs;
      return unstagedDiffs.findSimilar(findOpts);
    }).then(function() {
      return (!data.repo.isEmpty() ? data.repo.getHeadCommit() : undefined);
    }).then(function(commit) {
      return (!data.repo.isEmpty() ? commit.getTree() : undefined);
    }).then(function(tree) {
      data.tree = tree;
      return Git.Diff.treeToIndex(data.repo, tree, data.index, diffOpts);
    }).then(function(stagedDiffs) {
      data.stagedDiffs = stagedDiffs;
      return stagedDiffs.findSimilar(findOpts);
    }).then(function() {
      return Git.Diff.treeToWorkdirWithIndex(data.repo, data.tree, diffOpts);
    }).then(function(allDiffs) {
      data.allDiffs = allDiffs;
      return allDiffs.findSimilar(findOpts);
    }).then(function() {
      var diffs;

      return diffs = {
        all: data.allDiffs,
        staged: data.stagedDiffs,
        unstaged: data.unstagedDiffs
      };
    });
  }

  getStatuses() {
    var opts = {
      flags: Git.Status.OPT.INCLUDE_UNTRACKED | Git.Status.OPT.RECURSE_UNTRACKED_DIRS | Git.Status.OPT.RENAMES_INDEX_TO_WORKDIR | Git.Status.OPT.RENAMES_HEAD_TO_INDEX
    };

    this.gatherDiffs();

    return Git.Repository.open(this.repoPath).then(function(repo) {
      return repo.getStatusExt(opts);
    }).then(statuses => {
      for (let status in statuses) {
        this.statuses[status.path()] = status;
      }

      return statuses;
    });
  }

  getComparisonBranch(names, branchName) {
    var origin = ("refs/remotes/origin/" + (branchName));

    if (names.indexOf(origin) >= 0) {
      return origin;
    } else if (branchName !== "master") {
      return "master";
    } else {
      return null;
    }
  }

  getLatestUnpushed() {
    var data = {};

    return Git.Repository.open(this.repoPath).then(function(repo) {
      data.repo = repo;
      return repo.getCurrentBranch();
    }).then(branch => {
      data.branch = branch;
      data.branchName = this.normalizeBranchName(branch.name());
      data.walker = data.repo.createRevWalk();
      data.walker.pushHead();
      return data.repo.getReferenceNames();
    }).then(names => {
      data.compareBranch = this.getComparisonBranch(names, data.branchName);

      return new Promise(function(resolve, reject) {
        return (data.compareBranch ? data.repo.getBranchCommit(data.compareBranch).then(function(compare) {
          data.walker.hide(compare);
          return resolve();
        }) : resolve());
      });
    }).then(function() {
      return data.walker.next();
    }).then(function(oid) {
      return (oid ? data.repo.getCommit(oid) : null);
    });
  }

  resetBeforeCommit(commit) {
    return commit.getParents().then(function(parents) {
      return Git.Reset.reset(commit.repo, (parents.length ? parents[0] : null), Git.Reset.TYPE.SOFT);
    }).then(function() {
      return commit.repo.openIndex();
    }).then(function(index) {
      return index.write();
    }).then(() => {
      return this.emitter.emit("did-update-repository");
    });
  }

  stagePath(path) {
    return this.stageAllPaths([path]);
  }

  stageAllPaths(paths) {
    return Git.Repository.open(this.repoPath).then(function(repo) {
      return repo.openIndex();
    }).then(index => {
      for (let path in paths) {
        var status = this.statuses[path];

        if (status.isDeleted()) {
          index.removeByPath(path);
        } else if (status.isRenamed()) {
          index.removeByPath(status.indexToWorkdir().oldFile().path());
          index.addByPath(path);
        } else {
          index.addByPath(path);
        }
      }

      return index.write();
    }).then(() => {
      return this.emitter.emit("did-update-repository");
    });
  }

  unstagePath(path) {
    return this.unstageAllPaths([path]);
  }

  unstageAllPaths(paths) {
    var data = {};

    return Git.Repository.open(this.repoPath).then(repo => {
      data.repo = repo;

      return (repo.isEmpty() ? repo.openIndex().then(function(index) {
        for (let path in paths) {
          index.removeByPath(path);
        }

        return index.write();
      }) : repo.getHeadCommit().then(commit => {
        return (() => {
          for (let path in paths) {
            var status = this.statuses[path];
            (status.isRenamed() ? Git.Reset.default(data.repo, commit, status.headToIndex().oldFile().path()) : undefined);
            Git.Reset.default(data.repo, commit, path);
          }
        })();
      }));
    }).then(() => {
      return this.emitter.emit("did-update-repository");
    });
  }

  wordwrap(str) {
    if (!str.length) {
      return str;
    }

    return str.match(/.{1,80}(\s|$)|\S+?(\s|$)/g).join("\\n");
  }

  commit(message) {
    var data = {};

    return Git.Repository.open(this.repoPath).then(function(repo) {
      data.repo = repo;
      return repo.openIndex();
    }).then(function(index) {
      data.index = index;
      return index.writeTree();
    }).then(function(indexTree) {
      data.indexTree = indexTree;
      return data.repo.getHeadCommit();
    }).catch(function() {
      return data.parent = null;
    }).then(parent => {
      var parents = (typeof parent !== "undefined" && parent !== null ? [parent] : null);
      var author = Git.Signature.default(data.repo);
      return data.repo.createCommit("HEAD", author, author, this.wordwrap(message), data.indexTree, parents);
    }).then(() => {
      return this.emitter.emit("did-update-repository");
    });
  }

  parseHeader(header) {
    var data;
    var headerParts = header.match(/^@@ \-([0-9]+),?([0-9]+)? \+([0-9]+),?([0-9]+)? @@(.*)/);

    if (!headerParts) {
      return false;
    }

    return data = {
      oldStart: parseInt(headerParts[1], 10),
      oldCount: parseInt(headerParts[2], 10),
      newStart: parseInt(headerParts[3], 10),
      newCount: parseInt(headerParts[4], 10),
      context: headerParts[5]
    };
  }

  calculatePatchTexts(selectedLinesByHunk, stage) {
    var offset = 0;
    var patches = [];

    for (let [hunkString] in Object.entries(selectedLinesByHunk)) {
      {
        linesToStage,
        linesToUnstage
      } = selectedLinesByHunk[hunkString];

      var linesToUse = (linesToStage.length > 0 ? linesToStage : linesToUnstage);
      var hunk = linesToUse[0].hunk;
      var result = this.calculatePatchText(hunk, linesToUse, offset, stage);
      offset += result.offset;
      patches.push(result.patchText);
    }

    return Promise.resolve(patches);
  }

  calculatePatchText(hunk, selectedLines, offset, stage) {
    var newCount;
    var header = hunk.getHeader();

    {
      oldStart,
      context
    } = this.parseHeader(header);

    oldStart += offset;
    var newStart = oldStart;
    var oldCount = newCount = 0;
    var hunkLines = hunk.getLines();
    var patchLines = [];

    for (let line in hunkLines) {
      var selected = selectedLines.some(function(selectedLine) {
        if (line.isAddition()) {
          return line.getNewLineNumber() === selectedLine.getNewLineNumber();
        } else if (line.isDeletion()) {
          return line.getOldLineNumber() === selectedLine.getOldLineNumber();
        } else {
          return false;
        }
      });

      var content = line.getContent();
      var origin = line.getLineOrigin();

      switch (origin) {
      case " ":
        oldCount++;
        newCount++;
        patchLines.push(("" + (origin) + (content)));
        break;
      case "+":
        if (selected) {
          newCount++;
          patchLines.push(("" + (origin) + (content)));
        } else if (!stage) {
          oldCount++;
          newCount++;
          patchLines.push((" " + (content)));
        }

        break;
      case "-":
        if (selected) {
          oldCount++;
          patchLines.push(("" + (origin) + (content)));
        } else if (stage) {
          oldCount++;
          newCount++;
          patchLines.push((" " + (content)));
        }

        break;
      }
    }

    (oldCount > 0 && oldStart === 0 ? oldStart = 1 : undefined);
    (newCount > 0 && newStart === 0 ? newStart = 1 : undefined);
    header = ("@@ -" + (oldStart) + "," + (oldCount) + " +" + (newStart) + "," + (newCount) + " @@" + (context) + "\\n");
    var patchText = ("" + (header) + (patchLines.join("\\n")) + "\\n");

    return {
      patchText: patchText,
      offset: newCount - oldCount
    };
  }

  stagePatches(fileDiff, patches) {
    var data = {};
    var oldPath = fileDiff.getOldPathName();
    var newPath = fileDiff.getNewPathName();

    return Git.Repository.open(this.repoPath).then(function(repo) {
      data.repo = repo;
      return repo.openIndex();
    }).then(index => {
      data.index = index;
      return (!fileDiff.isUntracked() ? this.indexBlob(oldPath) : undefined);
    }).then(content => {
      var newContent = (content ? content : "");

      for (let patchText in patches) {
        newContent = JsDiff.applyPatch(newContent, patchText);
      }

      var buffer = new Buffer(newContent);
      var oid = data.repo.createBlobFromBuffer(buffer);

      if (fileDiff.isDeleted()) {
        var entry = data.index.getByPath(oldPath);
        entry.id = oid;
        entry.fileSize = buffer.length;
      } else {
        var entry = this.createIndexEntry({
          oid: oid,
          path: newPath,
          fileSize: buffer.length,
          mode: fileDiff.getMode()
        });
      }

      (oldPath !== newPath ? data.index.removeByPath(oldPath) : undefined);
      data.index.add(entry);
      return data.index.write();
    }).then(() => {
      return this.emitter.emit("did-update-repository");
    }).catch(function(error) {
      console.log(error.message);
      return console.log(error.stack);
    });
  }

  unstagePatches(fileDiff, patches) {
    var data = {};
    var oldPath = fileDiff.getOldPathName();
    var newPath = fileDiff.getNewPathName();

    return Git.Repository.open(this.repoPath).then(function(repo) {
      data.repo = repo;
      return repo.openIndex();
    }).then(function(index) {
      data.index = index;
      var entry = index.getByPath(newPath, 0);

      return (typeof entry !== "undefined" && entry !== null ? data.repo.getBlob(entry.id).then(function(blob) {
        return ((typeof blob !== "undefined" && blob !== null ? blob.toString : void 0))();
      }) : undefined);
    }).then(content => {
      var buffer;
      var newContent = (content ? content : "");

      for (let patchText in patches) {
        var patchText = this.reversePatch(patchText);
        newContent = JsDiff.applyPatch(newContent, patchText);
      }

      if (!newContent && fileDiff.isAdded()) {
        return this.unstagePath(newPath);
      } else {
        return buffer = new Buffer(newContent);
      }
    }).then(() => {
      return this.emitter.emit("did-update-repository");
    });
  }

  createIndexEntry(
    {
      oid,
      path,
      fileSize,
      mode
    }) {
    var entry = new Git.IndexEntry();
    entry.id = oid;
    entry.mode = mode;
    entry.path = path;
    entry.fileSize = fileSize;
    entry.flags = 0;
    entry.flagsExtended = 0;
    return entry;
  }

  reversePatch(patch) {
    var lines = patch.split("\\n");
    var header = lines.shift();
    var headerParts = header.match(/^@@ \-([^\s]+) \+([^\s]+) @@(.*)$/);
    var newHeader = ("@@ -" + (headerParts[2]) + " +" + (headerParts[1]) + " @@" + (headerParts[3]));

    var newLines = lines.map(function(line) {
      var origin = line[0];
      var content = line.substr(1);

      return (() => {
        switch (origin) {
        case "+":
          "-" + (content);
          break;
        case "-":
          "+" + (content);
          break;
        default:
          line;
        }
      })();
    });

    newLines.unshift(newHeader);
    return newLines.join("\\n");
  }

  workingBlob(path) {
    return new Git.Promise((resolve, reject) => {
      return fse.readFile(((this.repoPath) + "/" + (path)), "utf8", function(e, text) {
        return resolve(text);
      });
    });
  }

  indexBlob(path) {
    var data = {};

    return Git.Repository.open(this.repoPath).then(function(repo) {
      data.repo = repo;
      return repo.openIndex();
    }).then(index => {
      var entry = index.getByPath(path, 0);

      return (typeof entry !== "undefined" && entry !== null ? data.repo.getBlob(entry.id).then(function(blob) {
        return ((typeof blob !== "undefined" && blob !== null ? blob.toString : void 0))();
      }) : this.treeBlob(path));
    });
  }

  treeBlob(path, sha) {
    return Git.Repository.open(this.repoPath).then(function(repo) {
      return (sha ? repo.getCommit(sha) : repo.getHeadCommit());
    }).then(function(commit) {
      return commit.getTree();
    }).then(function(tree) {
      return tree.getEntry(path);
    }).then(function(entry) {
      return (typeof entry !== "undefined" && entry !== null ? entry.getBlob().then(function(blob) {
        return (typeof blob !== "undefined" && blob !== null ? blob.toString() : "");
      }) : "");
    });
  }

  getCommitBlobs(commit, patch) {
    var data;
    var newBlob;
    var oldBlob;
    var oldPath = patch.oldFile().path();
    var oldSha = commit.parents()[0];
    var newPath = patch.newFile().path();
    var newSha = commit.id();
    (!patch.isAdded() ? oldBlob = this.treeBlob(oldPath, oldSha) : undefined);
    (!patch.isDeleted() ? newBlob = this.treeBlob(newPath, newSha) : undefined);

    if (oldBlob && newBlob) {
      return Git.Promise.all([oldBlob, newBlob]).then(function(blobs) {
        var data;

        return data = {
          old: blobs[0],
          new: blobs[1]
        };
      });
    } else if (newBlob) {
      return newBlob.then(function(blob) {
        var data;

        return data = {
          old: "",
          new: blob
        };
      });
    } else if (oldBlob) {
      return oldBlob.then(function(blob) {
        var data;

        return data = {
          old: blob,
          new: ""
        };
      });
    } else {
      return data = {
        old: "",
        new: ""
      };
    }
  }

  getBlobs(
    {
      patch,
      status,
      commit
    }) {
    if (commit) {
      return this.getCommitBlobs(commit, patch);
    } else if (status === "staged") {
      return this.getStagedBlobs(patch);
    } else {
      return this.getUnstagedBlobs(patch);
    }
  }

  getStagedBlobs(patch) {
    var oldPath = patch.oldFile().path();
    var newPath = patch.newFile().path();

    if (patch.isAdded() || patch.isUntracked()) {
      return this.indexBlob(newPath).then(function(newBlob) {
        var data;

        return data = {
          new: newBlob,
          old: ""
        };
      });
    } else if (patch.isDeleted()) {
      return this.treeBlob(oldPath).then(function(oldBlob) {
        var data;

        return data = {
          old: oldBlob,
          new: ""
        };
      });
    } else {
      return Git.Promise.all([this.treeBlob(oldPath), this.indexBlob(newPath)]).then(function(blobs) {
        var data;

        return data = {
          old: blobs[0],
          new: blobs[1]
        };
      });
    }
  }

  getUnstagedBlobs(patch) {
    var oldPath = patch.oldFile().path();
    var newPath = patch.newFile().path();

    if (patch.isAdded() || patch.isUntracked()) {
      return this.workingBlob(newPath).then(function(newBlob) {
        var data;

        return data = {
          new: newBlob,
          old: ""
        };
      });
    } else if (patch.isDeleted()) {
      return this.indexBlob(oldPath).then(function(oldBlob) {
        var data;

        return data = {
          old: oldBlob,
          new: ""
        };
      });
    } else {
      return Git.Promise.all([this.indexBlob(oldPath), this.workingBlob(newPath)]).then(function(blobs) {
        var data;

        return data = {
          old: blobs[0],
          new: blobs[1]
        };
      });
    }
  }

  forceCheckoutPath(path) {
    var opts = {
      checkoutStrategy: Git.Checkout.STRATEGY.FORCE,
      paths: path
    };

    return Git.Repository.open(this.repoPath).then(function(repo) {
      return Git.Checkout.head(repo, opts);
    }).then(() => {
      return this.emitter.emit("did-update-repository");
    });
  }
};
