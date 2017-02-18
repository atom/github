import fs from 'fs-extra';
import {ncp} from 'ncp';

/**
 * Takes an array of targets and returns a proxy. The proxy intercepts property accessor calls and
 * returns the value of that property on the first object in `targets` where the target implements that property.
 */
export function firstImplementer(...targets) {
  return new Proxy(targets, {
    get(target, name) {
      const firstValidTarget = target.find(t => Reflect.has(t, name));
      if (firstValidTarget) {
        return firstValidTarget[name];
      } else {
        return undefined;
      }
    },
  });
}

export function readFile(absoluteFilePath, encoding = 'utf8') {
  return new Promise((resolve, reject) => {
    fs.readFile(absoluteFilePath, encoding, (err, contents) => {
      if (err) { reject(err); } else { resolve(contents); }
    });
  });
}

export function writeFile(absoluteFilePath, contents) {
  return new Promise((resolve, reject) => {
    fs.writeFile(absoluteFilePath, contents, err => {
      if (err) { return reject(err); } else { return resolve(); }
    });
  });
}

export function deleteFileOrFolder(path) {
  return new Promise((resolve, reject) => {
    fs.remove(path, err => {
      if (err) { return reject(err); } else { return resolve(); }
    });
  });
}

export function copyFile(source, target) {
  return new Promise((resolve, reject) => {
    ncp(source, target, err => {
      if (err) { return reject(err); } else { return resolve(target); }
    });
  });
}

export function getTempDir(prefix) {
  return new Promise((resolve, reject) => {
    fs.mkdtemp(prefix, (err, folder) => {
      if (err) { return reject(err); } else { return resolve(folder); }
    });
  });
}

export function fsStat(absoluteFilePath) {
  return new Promise((resolve, reject) => {
    fs.stat(absoluteFilePath, (err, stats) => {
      if (err) { reject(err); } else { resolve(stats); }
    });
  });
}

export function shortenSha(sha) {
  return sha.slice(0, 8);
}

export const classNameForStatus = {
  added: 'added',
  deleted: 'removed',
  modified: 'modified',
  equivalent: 'ignored',
};
