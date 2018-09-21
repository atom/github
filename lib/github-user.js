import RelayNetworkLayerManager from './relay-network-layer-manager';
import {UNAUTHENTICATED, INSUFFICIENT} from './shared/keytar-strategy';

export default async function getGitHubUser(loginModel) {
  const token = await loginModel.getToken('https://api.github.com');
  if (token === UNAUTHENTICATED || token === INSUFFICIENT) {
    return null;
  }

  const fetchQuery = RelayNetworkLayerManager.getFetchQuery('https://api.github.com/graphql', token);
  const response = await fetchQuery({
    name: 'GetGitHubUser',
    text: `
    query {
      viewer {
        login
          }
        }
  `,
  });
  if (response.errors && response.errors.length > 1) {
    // eslint-disable-next-line no-console
    console.error(`Error fetching GitHub username:\n${response.errors.map(e => e.message).join('\n')}`);
  }
  const viewer = response.data && response.data.viewer && response.data.viewer.login ?
    response.data.viewer.login : null;

  return viewer;
}
