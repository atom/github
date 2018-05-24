export default class Remote {
  constructor(name, url) {
    this.name = name;
    this.url = url;

    const {isGithubRepo, owner, repo} = githubInfoFromRemote(url);
    this.githubRepo = isGithubRepo;
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
      owner: null,
      repo: null,
    };
  }

  //             proto       login   domain         owner    repo
  const regex = /(?:.+:\/\/)?(?:.+@)?github\.com[:/]([^/]+)\/(.+)/;
  const match = remoteUrl.match(regex);
  if (match) {
    return {
      isGithubRepo: true,
      owner: match[1],
      repo: match[2].replace(/\.git$/, ''),
    };
  } else {
    return {
      isGithubRepo: false,
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
