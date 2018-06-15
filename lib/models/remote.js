export default class Remote {
  constructor(name, url) {
    this.name = name;
    this.url = url;

    const {isGithubRepo, owner, domain, repo} = githubInfoFromRemote(url);
    this.githubRepo = isGithubRepo;
    this.domain = domain;
    this.owner = owner;
    this.repo = repo;
  }

  getName() {
    return this.name;
  }

  getUrl() {
    return this.url;
  }

  isGithubRepo() {
    return this.githubRepo;
  }

  getDomain() {
    return this.domain;
  }

  getOwner() {
    return this.owner;
  }

  getRepo() {
    return this.repo;
  }

  getNameOr(fallback) {
    return this.getName();
  }

  getSlug() {
    return `${this.owner}/${this.repo}`;
  }

  isPresent() {
    return true;
  }
}

function githubInfoFromRemote(remoteUrl) {
  if (!remoteUrl) {
    return {
      isGithubRepo: false,
      domain: null,
      owner: null,
      repo: null,
    };
  }

  //             proto       login   domain         owner    repo
  const regex = /(?:.+:\/\/)?(?:.+@)?(github\.com)[:/]([^/]+)\/(.+)/;
  const match = remoteUrl.match(regex);
  if (match) {
    return {
      isGithubRepo: true,
      domain: match[1],
      owner: match[2],
      repo: match[3].replace(/\.git$/, ''),
    };
  } else {
    return {
      isGithubRepo: false,
      domain: null,
      owner: null,
      repo: null,
    };
  }
}

export const nullRemote = {
  getName() {
    return '';
  },

  getUrl() {
    return '';
  },

  isGithubRepo() {
    return false;
  },

  getDomain() {
    return null;
  },

  getOwner() {
    return null;
  },

  getRepo() {
    return null;
  },

  getNameOr(fallback) {
    return fallback;
  },

  getSlug() {
    return '';
  },

  isPresent() {
    return false;
  },
};
