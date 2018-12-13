function buildRestURI(endpoint, parts) {
  const suffix = parts.map(encodeURIComponent).join('/');
  return `${endpoint.getRestRoot()}/${suffix}`;
}

// API endpoint for GitHub.com
const dotcomEndpoint = {
  getGraphQLRoot() { return 'https://api.github.com/graphql'; },

  getRestRoot() { return 'https://api.github.com'; },

  getRestURI(...parts) { return buildRestURI(this, parts); },
};

// API endpoint for a GitHub enterprise installation.
class EnterpriseEndpoint {
  constructor(domain) {
    this.apiRoot = `https://${domain}/api/v3`;
  }

  getGraphQLRoot() {
    return `${this.apiRoot}/graphql`;
  }

  getRestRoot() {
    return this.apiRoot;
  }

  getRestURI(...parts) {
    return buildRestURI(this, parts);
  }
}

export function getEndpoint(host) {
  if (host === 'github.com') {
    return dotcomEndpoint;
  } else {
    return new EnterpriseEndpoint(host);
  }
}
