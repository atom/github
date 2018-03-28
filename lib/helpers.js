import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import temp from 'temp';

import FilePatchController from './controllers/file-patch-controller';

export const LINE_ENDING_REGEX = /\r?\n/;
export const CO_AUTHOR_REGEX = /^co-authored-by. (.+?) <(.+?)>$/i;

export function getPackageRoot() {
  const {resourcePath} = atom.getLoadSettings();
  const currentFileWasRequiredFromSnapshot = !path.isAbsolute(__dirname);
  if (currentFileWasRequiredFromSnapshot) {
    return path.join(resourcePath, 'node_modules', 'github');
  } else {
    const packageRoot = path.resolve(__dirname, '..');
    if (path.extname(resourcePath) === '.asar') {
      if (packageRoot.indexOf(resourcePath) === 0) {
        return path.join(`${resourcePath}.unpacked`, 'node_modules', 'github');
      }
    }
    return packageRoot;
  }
}

export function getAtomHelperPath() {
  if (process.platform === 'darwin') {
    const beta = atom.appVersion.match(/-beta/);
    const appName = beta ? 'Atom Beta Helper' : 'Atom Helper';
    return path.resolve(process.resourcesPath, '..', 'Frameworks',
     `${appName}.app`, 'Contents', 'MacOS', appName);
  } else {
    return process.execPath;
  }
}

let DUGITE_PATH;
export function getDugitePath() {
  if (!DUGITE_PATH) {
    DUGITE_PATH = require.resolve('dugite');
    if (!path.isAbsolute(DUGITE_PATH)) {
      // Assume we're snapshotted
      const {resourcePath} = atom.getLoadSettings();
      if (path.extname(resourcePath) === '.asar') {
        DUGITE_PATH = path.join(`${resourcePath}.unpacked`, 'node_modules', 'dugite');
      } else {
        DUGITE_PATH = path.join(resourcePath, 'node_modules', 'dugite');
      }
    }
  }

  return DUGITE_PATH;
}

const SHARED_MODULE_PATHS = new Map();
export function getSharedModulePath(relPath) {
  let modulePath = SHARED_MODULE_PATHS.get(relPath);
  if (!modulePath) {
    modulePath = require.resolve(path.join(__dirname, 'shared', relPath));
    if (!path.isAbsolute(modulePath)) {
      // Assume we're snapshotted
      const {resourcePath} = atom.getLoadSettings();
      modulePath = path.join(resourcePath, modulePath);
    }

    SHARED_MODULE_PATHS.set(relPath, modulePath);
  }

  return modulePath;
}

export function isBinary(data) {
  for (let i = 0; i < 50; i++) {
    const code = data.charCodeAt(i);
    // Char code 65533 is the "replacement character";
    // 8 and below are control characters.
    if (code === 65533 || code < 9) {
      return true;
    }
  }

  return false;
}

function descriptorsFromProto(proto) {
  return Object.getOwnPropertyNames(proto).reduce((acc, name) => {
    Object.assign(acc, {
      [name]: Reflect.getOwnPropertyDescriptor(proto, name),
    });
    return acc;
  }, {});
}

/**
 * Takes an array of targets and returns a proxy. The proxy intercepts property accessor calls and
 * returns the value of that property on the first object in `targets` where the target implements that property.
 */
export function firstImplementer(...targets) {
  return new Proxy({__implementations: targets}, {
    get(target, name) {
      if (name === 'getImplementers') {
        return () => targets;
      }

      if (Reflect.has(target, name)) {
        return target[name];
      }

      const firstValidTarget = targets.find(t => Reflect.has(t, name));
      if (firstValidTarget) {
        return firstValidTarget[name];
      } else {
        return undefined;
      }
    },

    set(target, name, value) {
      const firstValidTarget = targets.find(t => Reflect.has(t, name));
      if (firstValidTarget) {
        // eslint-disable-next-line no-return-assign
        return firstValidTarget[name] = value;
      } else {
        // eslint-disable-next-line no-return-assign
        return target[name] = value;
      }
    },

    // Used by sinon
    getOwnPropertyDescriptor(target, name) {
      const firstValidTarget = targets.find(t => Reflect.getOwnPropertyDescriptor(t, name));
      const compositeOwnPropertyDescriptor = Reflect.getOwnPropertyDescriptor(target, name);
      if (firstValidTarget) {
        return Reflect.getOwnPropertyDescriptor(firstValidTarget, name);
      } else if (compositeOwnPropertyDescriptor) {
        return compositeOwnPropertyDescriptor;
      } else {
        return undefined;
      }
    },

    // Used by sinon
    getPrototypeOf(target) {
      return targets.reduceRight((acc, t) => {
        return Object.create(acc, descriptorsFromProto(Object.getPrototypeOf(t)));
      }, Object.prototype);
    },
  });
}

function isRoot(dir) {
  return path.resolve(dir, '..') === dir;
}

export function isValidWorkdir(dir) {
  return dir !== os.homedir() && !isRoot(dir);
}

export async function fileExists(absoluteFilePath) {
  try {
    await fs.access(absoluteFilePath);
    return true;
  } catch (e) {
    if (e.code === 'ENOENT') {
      return false;
    }

    throw e;
  }
}

export function getTempDir(options = {}) {
  temp.track();

  return new Promise((resolve, reject) => {
    temp.mkdir(options, (tempError, folder) => {
      if (tempError) {
        reject(tempError);
        return;
      }

      if (options.symlinkOk) {
        resolve(folder);
      } else {
        fs.realpath(folder, (realError, rpath) => (realError ? reject(realError) : resolve(rpath)));
      }
    });
  });
}

export async function isFileExecutable(absoluteFilePath) {
  const stat = await fs.stat(absoluteFilePath);
  return stat.mode & fs.constants.S_IXUSR; // eslint-disable-line no-bitwise
}

export async function isFileSymlink(absoluteFilePath) {
  const stat = await fs.lstat(absoluteFilePath);
  return stat.isSymbolicLink();
}

export function shortenSha(sha) {
  return sha.slice(0, 8);
}

export const classNameForStatus = {
  added: 'added',
  deleted: 'removed',
  modified: 'modified',
  typechange: 'modified',
  equivalent: 'ignored',
};

/*
 * Apply any platform-specific munging to a path before presenting it as
 * a git environment variable or option.
 *
 * Convert a Windows-style "C:\foo\bar\baz" path to a "/c/foo/bar/baz" UNIX-y
 * path that the sh.exe used to execute git's credential helpers will
 * understand.
 */
export function normalizeGitHelperPath(inPath) {
  if (process.platform === 'win32') {
    return inPath.replace(/\\/g, '/').replace(/^([^:]+):/, '/$1');
  } else {
    return inPath;
  }
}

/*
 * On Windows, git commands report paths with / delimiters. Convert them to \-delimited paths
 * so that Atom unifromly treats paths with native path separators.
 */
export function toNativePathSep(rawPath) {
  if (process.platform !== 'win32') {
    return rawPath;
  } else {
    return rawPath.split('/').join(path.sep);
  }
}

/*
 * Convert Windows paths back to /-delimited paths to be presented to git.
 */
export function toGitPathSep(rawPath) {
  if (process.platform !== 'win32') {
    return rawPath;
  } else {
    return rawPath.split(path.sep).join('/');
  }
}


/**
 * Turns an array of things @kuychaco cannot eat
 * into a sentence containing things @kuychaco cannot eat
 *
 * ['toast'] => 'toast'
 * ['toast', 'eggs'] => 'toast and eggs'
 * ['toast', 'eggs', 'cheese'] => 'toast, eggs, and cheese'
 *
 * Oxford comma included because you're wrong, shut up.
 */
export function toSentence(array) {
  const len = array.length;
  if (len === 1) {
    return `${array[0]}`;
  } else if (len === 2) {
    return `${array[0]} and ${array[1]}`;
  }

  return array.reduce((acc, item, idx) => {
    if (idx === 0) {
      return `${item}`;
    } else if (idx === len - 1) {
      return `${acc}, and ${item}`;
    } else {
      return `${acc}, ${item}`;
    }
  }, '');
}


// Repository and workspace helpers

export function getCommitMessagePath(repository) {
  return path.join(repository.getGitDirectoryPath(), 'ATOM_COMMIT_EDITMSG');
}

export function getCommitMessageEditors(repository, workspace) {
  if (!repository.isPresent()) {
    return [];
  }
  return workspace.getTextEditors().filter(editor => editor.getPath() === getCommitMessagePath(repository));
}

export function getFilePatchPaneItems({onlyStaged, empty} = {}, workspace) {
  return workspace.getPaneItems().filter(item => {
    const isFilePatchItem = item && item.getRealItem && item.getRealItem() instanceof FilePatchController;
    if (onlyStaged) {
      return isFilePatchItem && item.stagingStatus === 'staged';
    } else if (empty) {
      return isFilePatchItem ? item.isEmpty() : false;
    } else {
      return isFilePatchItem;
    }
  });
}

export function destroyFilePatchPaneItems({onlyStaged} = {}, workspace) {
  const itemsToDestroy = getFilePatchPaneItems({onlyStaged}, workspace);
  itemsToDestroy.forEach(item => item.destroy());
}

export function destroyEmptyFilePatchPaneItems(workspace) {
  const itemsToDestroy = getFilePatchPaneItems({empty: true}, workspace);
  itemsToDestroy.forEach(item => item.destroy());
}

export function extractCoAuthorsAndRawCommitMessage(commitMessage) {
  let rawMessage = '';
  const coAuthors = commitMessage.split(LINE_ENDING_REGEX).reduce((coAuthors, line) => {
    const match = line.match(CO_AUTHOR_REGEX);
    if (match) {
      const [_, name, email] = match
      coAuthors.push({name, email});
    } else {
      rawMessage += line;
    }
    return coAuthors;
  }, []);
  return {message: rawMessage, coAuthors};
}
