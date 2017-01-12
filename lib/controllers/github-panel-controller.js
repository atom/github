import React from 'react';
import Relay from 'react-relay';

import PrInfoContainer from '../containers/pr-info-container';
import ModelObserver from '../models/model-observer';

class IndexRoute extends Relay.Route {
  static routeName = 'Index'

  static queries = {
    query: (Component, variables) => Relay.QL`
      query {
        relay {
          ${Component.getFragment('query', variables)}
        }
      }
    `,
  }

  static paramDefinitions = {
    repoOwner: {required: true},
    repoName: {required: true},
    branchName: {required: true},
  }
}

function getGHRemoteInfo(remote) {
  const match = remote.match(/github.com:([^/]*)\/(.*)\.git/);
  if (!match) {
    return {isGHRemote: false};
  }

  return {
    isGHRemote: true,
    repoOwner: match[1],
    repoName: match[2],
  };
}

export default class GithubPanelController extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.state = {
      repoOwner: null,
      repoName: null,
      branchName: null,
    };

    this.repositoryObserver = new ModelObserver({
      fetchData: async repo => {
        const remotes = await repo.getRemotes();
        const ghRemotes = remotes.map(getGHRemoteInfo).filter(r => r.isGHRemote);
        if (!ghRemotes.length) { return null; }

        return {
          repoOwner: ghRemotes[0].repoOwner,
          repoName: ghRemotes[0].repoName,
          branchName: await repo.getCurrentBranch(), // TODO: we actually want the remote tracking branch
        };
      },
      didUpdate: () => {
        const data = this.repositoryObserver.getActiveModelData();
        if (!data) { return; }
        this.setState(data);
      },
    });
    this.repositoryObserver.setActiveModel(props.repository);
  }

  componentWillReceiveProps(nextProps) {
    this.repositoryObserver.setActiveModel(nextProps.repository);
  }

  render() {
    if (!this.state.repoOwner || !this.state.repoName || !this.state.branchName) {
      return <div>Loading...</div>;
    }

    const route = new IndexRoute({
      repoOwner: this.state.repoOwner,
      repoName: this.state.repoName,
      branchName: this.state.branchName,
    });
    return (
      <Relay.RootContainer
        Component={PrInfoContainer}
        route={route}
      />
    );
  }
}
