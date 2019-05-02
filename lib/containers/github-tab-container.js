import React from 'react';
import PropTypes from 'prop-types';
import yubikiri from 'yubikiri';
import {CompositeDisposable} from 'event-kit';

import {GithubLoginModelPropType, RefHolderPropType} from '../prop-types';
import {autobind} from '../helpers';
import OperationStateObserver, {PUSH, PULL, FETCH} from '../models/operation-state-observer';
import GitHubTabController from '../controllers/github-tab-controller';
import ObserveModel from '../views/observe-model';
import RemoteSet from '../models/remote-set';
import BranchSet from '../models/branch-set';

import NoLocalRepo from '../proto/no-local-repo';
import LocalUninitialized from '../proto/local-uninitialized';
import LocalInitializedNoRemotes from '../proto/local-initialized-noremotes';

export default class GitHubTabContainer extends React.Component {
  static propTypes = {
    workspace: PropTypes.object.isRequired,
    repository: PropTypes.object,
    loginModel: GithubLoginModelPropType.isRequired,
    rootHolder: RefHolderPropType.isRequired,
  }

  constructor(props) {
    super(props);
    autobind(this, 'fetchRepositoryData', 'renderRepositoryData');

    this.state = {};
    this.subs = new CompositeDisposable();
  }

  componentDidMount() {
    this.subs.add(
      atom.config.onDidChange('github.scenario', () => this.forceUpdate()),
    );
  }

  componentWillUnmount() {
    this.subs.dispose();
  }

  static getDerivedStateFromProps(props, state) {
    if (props.repository !== state.lastRepository) {
      return {
        lastRepository: props.repository,
        remoteOperationObserver: new OperationStateObserver(props.repository, PUSH, PULL, FETCH),
      };
    }

    return null;
  }

  fetchRepositoryData(repository) {
    return yubikiri({
      workingDirectory: repository.getWorkingDirectoryPath(),
      allRemotes: repository.getRemotes(),
      branches: repository.getBranches(),
      selectedRemoteName: repository.getConfig('atomGithub.currentRemote'),
      aheadCount: async query => {
        const branches = await query.branches;
        const currentBranch = branches.getHeadBranch();
        return repository.getAheadCount(currentBranch.getName());
      },
      pushInProgress: repository.getOperationStates().isPushInProgress(),
    });
  }

  render() {
    return (
      <ObserveModel model={this.props.repository} fetchData={this.fetchRepositoryData}>
        {this.renderRepositoryData}
      </ObserveModel>
    );
  }

  renderRepositoryData(data) {
    const scenario = atom.config.get('github.scenario');
    if (scenario === 'nolocal') {
      return <NoLocalRepo />;
    } else if (scenario === 'local-uninitialized') {
      return <LocalUninitialized />;
    } else if (scenario === 'local-initialized-noremotes') {
      return <LocalInitializedNoRemotes />;
    }

    if (!data || this.props.repository.isLoading()) {
      return (
        <GitHubTabController
          {...this.props}
          remoteOperationObserver={this.state.remoteOperationObserver}

          allRemotes={new RemoteSet()}
          branches={new BranchSet()}
          aheadCount={0}
          pushInProgress={false}
          isLoading={true}
        />
      );
    }

    if (!this.props.repository.isPresent()) {
      // TODO include a better message here.
      return null;
    }

    return (
      <GitHubTabController
        {...data}
        {...this.props}
        remoteOperationObserver={this.state.remoteOperationObserver}
        isLoading={false}
      />
    );
  }
}
