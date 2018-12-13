// API endpoint for a GitHub instance, either dotcom or an Enterprise installation
class Endpoint {
  constructor(domain, apiRoot) {
    this.domain = domain;
    this.apiRoot = apiRoot;
  }

  getRestURI(...parts) {
    const suffix = parts.map(encodeURIComponent).join('/');
    return `${this.apiRoot}/${suffix}`;
  }

  getGraphQLRoot() {
    return this.getRestURI('graphql');
  }

  getRestRoot() {
    return this.apiRoot;
  }

  getLoginAccount() {
    return `https://${this.domain}`;
  }
}

// API endpoint for GitHub.com
const dotcomEndpoint = new Endpoint('api.github.com', 'https://api.github.com');

export function getEndpoint(host) {
  if (host === 'github.com') {
    return dotcomEndpoint;
  } else {
    return new Endpoint(host, `https://${host}/api/v3`);
  }
}
