import React from 'react';
import PropTypes from 'prop-types';
import {QueryRenderer, graphql} from 'react-relay';

import {autobind} from '../helpers';
import {SearchPropType} from '../prop-types';
import IssueishListController from '../controllers/issueish-list-controller';
import RelayNetworkLayerManager from '../relay-network-layer-manager';

export default class IssueishListContainer extends React.Component {
  static propTypes = {
    token: PropTypes.string.isRequired,
    host: PropTypes.string.isRequired,

    search: SearchPropType.isRequired,
  }

  constructor(props) {
    super(props);

    autobind(this, 'renderQueryResult');
  }

  render() {
    if (this.props.search.isNull()) {
      return this.renderQueryResult({error: null, props: null, nullSearch: true});
    }

    const environment = RelayNetworkLayerManager.getEnvironmentForHost(this.props.host, this.props.token);
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

  renderQueryResult({error, props, nullSearch}) {
    if (error) {
      return null;
    }

    if (props === null || nullSearch) {
      return (
        <IssueishListController
          isLoading={!nullSearch}
          results={null}
          search={this.props.search}
        />
      );
    }

    return (
      <IssueishListController
        isLoading={false}
        results={props.search}
        search={this.props.search}
      />
    );
  }
}
