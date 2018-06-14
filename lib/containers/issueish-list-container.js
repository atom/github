import React from 'react';
import PropTypes from 'prop-types';
import {QueryRenderer, graphql} from 'react-relay';

import {autobind} from '../helpers';
import {SearchPropType, RemotePropType, BranchSetPropType} from '../prop-types';
import IssueishListController, {BareIssueishListController} from '../controllers/issueish-list-controller';
import RelayNetworkLayerManager from '../relay-network-layer-manager';

export default class IssueishListContainer extends React.Component {
  static propTypes = {
    token: PropTypes.string.isRequired,
    host: PropTypes.string.isRequired,

    repository: PropTypes.shape({
      defaultBranchRef: PropTypes.shape({
        prefix: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
      }),
    }),

    search: SearchPropType.isRequired,
    remote: RemotePropType.isRequired,
    branches: BranchSetPropType.isRequired,
    aheadCount: PropTypes.number.isRequired,
    pushInProgress: PropTypes.bool.isRequired,

    onCreatePr: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props);

    autobind(this, 'renderQueryResult');
  }

  render() {
    const environment = RelayNetworkLayerManager.getEnvironmentForHost(this.props.host, this.props.token);

    if (this.props.search.isNull()) {
      return (
        <BareIssueishListController
          repository={this.props.repository}

          search={this.props.search}
          remote={this.props.remote}
          branches={this.props.branches}
          aheadCount={this.props.aheadCount}
          pushInProgress={this.props.pushInProgress}
          isLoading={false}

          onCreatePr={this.props.onCreatePr}
        />
      );
    }

    const query = graphql`
      query issueishListContainerQuery($query: String!) {
        search(first: 20, query: $query, type: ISSUE) {
          ...issueishListController_results
        }
      }
    `;
    const variables = {
      query: this.props.search.createQuery(),
    };

    return (
      <QueryRenderer
        environment={environment}
        variables={variables}
        query={query}
        render={this.renderQueryResult}
      />
    );
  }

  renderQueryResult({error, props}) {
    if (error) {
      return null;
    }

    if (props === null) {
      return (
        <BareIssueishListController
          repository={this.props.repository}

          search={this.props.search}
          remote={this.props.remote}
          branches={this.props.branches}
          aheadCount={this.props.aheadCount}
          pushInProgress={this.props.pushInProgress}
          isLoading={true}

          onCreatePr={this.props.onCreatePr}
        />
      );
    }

    return (
      <IssueishListController
        results={props.search}
        repository={this.props.repository}

        search={this.props.search}
        remote={this.props.remote}
        branches={this.props.branches}
        aheadCount={this.props.aheadCount}
        pushInProgress={this.props.pushInProgress}
        isLoading={false}

        onCreatePr={this.props.onCreatePr}
      />
    );
  }
}
