import React from 'react';
import PropTypes from 'prop-types';
import yubikiri from 'yubikiri';
import {graphql} from 'react-relay';

import {autobind} from '../helpers';
import RelayNetworkLayerManager from '../relay-network-layer-manager';
import {GithubLoginModelPropType, ItemTypePropType, EndpointPropType} from '../prop-types';
import {UNAUTHENTICATED, INSUFFICIENT} from '../shared/keytar-strategy';
import GithubLoginView from '../views/github-login-view';
import LoadingView from '../views/loading-view';
import QueryErrorView from '../views/query-error-view';
import ObserveModel from '../views/observe-model';
import RelayEnvironment from '../relay-environment-context';
import IssueishDetailController from '../controllers/issueish-detail-controller';
import QueryRenderer from '../controllers/query-renderer';

export default class IssueishDetailContainer extends React.Component {
  static propTypes = {
    // Connection
    endpoint: EndpointPropType.isRequired,

    // Issueish selection criteria
    owner: PropTypes.string.isRequired,
    repo: PropTypes.string.isRequired,
    issueishNumber: PropTypes.number.isRequired,

    // Package models
    repository: PropTypes.object.isRequired,
    loginModel: GithubLoginModelPropType.isRequired,

    // Atom environment
    workspace: PropTypes.object.isRequired,
    commands: PropTypes.object.isRequired,
    keymaps: PropTypes.object.isRequired,
    tooltips: PropTypes.object.isRequired,
    config: PropTypes.object.isRequired,

    // Action methods
    switchToIssueish: PropTypes.func.isRequired,
    onTitleChange: PropTypes.func.isRequired,
    destroy: PropTypes.func.isRequired,

    // Item context
    itemType: ItemTypePropType.isRequired,
  }

  constructor(props) {
    super(props);
    autobind(this,
      'fetchToken', 'renderWithToken',
      'fetchRepositoryData', 'renderWithRepositoryData',
      'renderWithResult',
      'handleLogin', 'handleLogout',
    );
  }

  fetchToken(loginModel) {
    return yubikiri({
      token: loginModel.getToken(this.props.endpoint.getLoginAccount()),
    });
  }

  render() {
    return (
      <ObserveModel model={this.props.loginModel} fetchData={this.fetchToken}>
        {this.renderWithToken}
      </ObserveModel>
    );
  }

  fetchRepositoryData(repository) {
    return yubikiri({
      branches: repository.getBranches(),
      remotes: repository.getRemotes(),
      isMerging: repository.isMerging(),
      isRebasing: repository.isRebasing(),
      isAbsent: repository.isAbsent(),
      isLoading: repository.isLoading(),
      isPresent: repository.isPresent(),
    });
  }

  renderWithToken(tokenData) {
    console.log('tokenData', tokenData);
    if (!tokenData) {
      return <LoadingView />;
    }

    // if (tokenData.token === UNAUTHENTICATED) {
    //   console.log()
    //   return <GithubLoginView onLogin={this.handleLogin} />;
    // }
    //
    // if (tokenData.token === INSUFFICIENT) {
    //   return (
    //     <GithubLoginView onLogin={this.handleLogin}>
    //       <p>
    //         Your token no longer has sufficient authorizations. Please re-authenticate and generate a new one.
    //       </p>
    //     </GithubLoginView>
    //   );
    // }

    return (
      <ObserveModel model={this.props.repository} fetchData={this.fetchRepositoryData}>
        {repoData => this.renderWithRepositoryData(repoData, tokenData.token)}
      </ObserveModel>
    );
  }

  renderWithRepositoryData(repoData, token) {
    if (!repoData) {
      return <LoadingView />;
    }

    const query = graphql`
      query issueishDetailContainerQuery
      (
        $repoOwner: String!
        $repoName: String!
        $issueishNumber: Int!
        $timelineCount: Int!
        $timelineCursor: String
        $commitCount: Int!
        $commitCursor: String
      ) {
        repository(owner: $repoOwner, name: $repoName) {
          ...issueishDetailController_repository @arguments(
            issueishNumber: $issueishNumber,
            timelineCount: $timelineCount,
            timelineCursor: $timelineCursor,
            commitCount: $commitCount,
            commitCursor: $commitCursor,
          )
        }
      }
    `;
    const variables = {
      repoOwner: this.props.owner,
      repoName: this.props.repo,
      issueishNumber: this.props.issueishNumber,
      timelineCount: 100,
      timelineCursor: null,
      commitCount: 100,
      commitCursor: null,
    };

    return (
      <QueryRenderer
        query={query}
        variables={variables}
        render={queryResult => this.renderWithResult(queryResult, repoData, token)}
      />
    );
  }

  renderWithResult({error, props, retry}, repoData, token) {
    if (error) {
      return (
        <QueryErrorView
          error={error}
          login={this.handleLogin}
          retry={retry}
          logout={this.handleLogout}
        />
      );
    }

    if (!props) {
      return <LoadingView />;
    }

    const {repository} = this.props;

    return (
      <IssueishDetailController
        {...props}
        {...repoData}
        localRepository={this.props.repository}
        issueishNumber={this.props.issueishNumber}
        fetch={repository.fetch.bind(repository)}
        checkout={repository.checkout.bind(repository)}
        pull={repository.pull.bind(repository)}
        addRemote={repository.addRemote.bind(repository)}
        onTitleChange={this.props.onTitleChange}
        switchToIssueish={this.props.switchToIssueish}
        workdirPath={repository.getWorkingDirectoryPath()}

        endpoint={this.props.endpoint}
        token={token}

        workspace={this.props.workspace}
        commands={this.props.commands}
        keymaps={this.props.keymaps}
        tooltips={this.props.tooltips}
        config={this.props.config}

        itemType={this.props.itemType}
        destroy={this.props.destroy}
      />
    );
  }

  handleLogin(token) {
    return this.props.loginModel.setToken(this.props.endpoint.getLoginAccount(), token);
  }

  handleLogout() {
    return this.props.loginModel.removeToken(this.props.endpoint.getLoginAccount());
  }
}
