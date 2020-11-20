class CacheKey {
  constructor(primary, groups = []) {
    this.primary = primary;
    this.groups = groups;
  }

  getPrimary() {
    return this.primary;
  }

  getGroups() {
    return this.groups;
  }

  removeFromCache(cache, withoutGroup = null) {
    cache.removePrimary(this.getPrimary());

    const groups = this.getGroups();
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      if (group === withoutGroup) {
        continue;
      }

      cache.removeFromGroup(group, this);
    }
  }

  /* istanbul ignore next */
  toString() {
    return `CacheKey(${this.primary})`;
  }
}

class GroupKey {
  constructor(group) {
    this.group = group;
  }

  removeFromCache(cache) {
    for (const matchingKey of cache.keysInGroup(this.group)) {
      matchingKey.removeFromCache(cache, this.group);
    }
  }

  /* istanbul ignore next */
  toString() {
    return `GroupKey(${this.group})`;
  }
}

export const Keys = {
  statusBundle: new CacheKey('status-bundle'),

  stagedChanges: new CacheKey('staged-changes'),

  filePatch: {
    _optKey: ({staged}) => (staged ? 's' : 'u'),

    oneWith: (fileName, options) => { // <-- Keys.filePatch
      const optKey = Keys.filePatch._optKey(options);
      const baseCommit = options.baseCommit || 'head';

      const extraGroups = [];
      if (options.baseCommit) {
        extraGroups.push(`file-patch:base-nonhead:path-${fileName}`);
        extraGroups.push('file-patch:base-nonhead');
      } else {
        extraGroups.push('file-patch:base-head');
      }

      return new CacheKey(`file-patch:${optKey}:${baseCommit}:${fileName}`, [
        'file-patch',
        `file-patch:opt-${optKey}`,
        `file-patch:opt-${optKey}:path-${fileName}`,
        ...extraGroups,
      ]);
    },

    eachWithFileOpts: (fileNames, opts) => {
      const keys = [];
      for (let i = 0; i < fileNames.length; i++) {
        for (let j = 0; j < opts.length; j++) {
          keys.push(new GroupKey(`file-patch:opt-${Keys.filePatch._optKey(opts[j])}:path-${fileNames[i]}`));
        }
      }
      return keys;
    },

    eachNonHeadWithFiles: fileNames => {
      return fileNames.map(fileName => new GroupKey(`file-patch:base-nonhead:path-${fileName}`));
    },

    allAgainstNonHead: new GroupKey('file-patch:base-nonhead'),

    eachWithOpts: (...opts) => opts.map(opt => new GroupKey(`file-patch:opt-${Keys.filePatch._optKey(opt)}`)),

    all: new GroupKey('file-patch'),
  },

  index: {
    oneWith: fileName => new CacheKey(`index:${fileName}`, ['index']),

    all: new GroupKey('index'),
  },

  lastCommit: new CacheKey('last-commit'),

  recentCommits: new CacheKey('recent-commits'),

  authors: new CacheKey('authors'),

  branches: new CacheKey('branches'),

  headDescription: new CacheKey('head-description'),

  remotes: new CacheKey('remotes'),

  config: {
    _optKey: options => (options.local ? 'l' : ''),

    oneWith: (setting, options) => {
      const optKey = Keys.config._optKey(options);
      return new CacheKey(`config:${optKey}:${setting}`, ['config', `config:${optKey}`]);
    },

    eachWithSetting: setting => [
      Keys.config.oneWith(setting, {local: true}),
      Keys.config.oneWith(setting, {local: false}),
    ],

    all: new GroupKey('config'),
  },

  blob: {
    oneWith: sha => new CacheKey(`blob:${sha}`, ['blob']),
  },

  // Common collections of keys and patterns for use with invalidate().

  workdirOperationKeys: fileNames => [
    Keys.statusBundle,
    ...Keys.filePatch.eachWithFileOpts(fileNames, [{staged: false}]),
  ],

  cacheOperationKeys: fileNames => [
    ...Keys.workdirOperationKeys(fileNames),
    ...Keys.filePatch.eachWithFileOpts(fileNames, [{staged: true}]),
    ...fileNames.map(Keys.index.oneWith),
    Keys.stagedChanges,
  ],

  headOperationKeys: () => [
    Keys.headDescription,
    Keys.branches,
    ...Keys.filePatch.eachWithOpts({staged: true}),
    Keys.filePatch.allAgainstNonHead,
    Keys.stagedChanges,
    Keys.lastCommit,
    Keys.recentCommits,
    Keys.authors,
    Keys.statusBundle,
  ],
};
