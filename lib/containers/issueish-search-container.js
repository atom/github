import React from 'react';
import PropTypes from 'prop-types';
import {QueryRenderer, graphql} from 'react-relay';
import {Disposable} from 'event-kit';

import {autobind} from '../helpers';
import {SearchPropType, OperationStateObserverPropType} from '../prop-types';
import IssueishListController, {BareIssueishListController} from '../controllers/issueish-list-controller';
import RelayNetworkLayerManager from '../relay-network-layer-manager';

export default class IssueishSearchContainer extends React.Component {
  static propTypes = {
    token: PropTypes.string.isRequired,
    host: PropTypes.string.isRequired,
    limit: PropTypes.number,
    search: SearchPropType.isRequired,
    remoteOperationObserver: OperationStateObserverPropType.isRequired,

    onOpenIssueish: PropTypes.func.isRequired,
    onOpenSearch: PropTypes.func.isRequired,
  }

  static defaultProps = {
    limit: 20,
  }

  constructor(props) {
    super(props);
    autobind(this, 'renderQueryResult');

    this.sub = new Disposable();
  }

  render() {
    const environment = RelayNetworkLayerManager.getEnvironmentForHost(this.props.host, this.props.token);

    if (this.props.search.isNull()) {
      return (
        <BareIssueishListController
          isLoading={false}
          {...this.controllerProps()}
        />
      );
    }

    const query = graphql`
      query issueishSearchContainerQuery($query: String!, $first: Int!) {
        search(first: $first, query: $query, type: ISSUE) {
          issueCount
          nodes {
            ...issueishListController_results
          }
        }
      }
    `;
    const variables = {
      query: this.props.search.createQuery(),
      first: this.props.limit,
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

  renderQueryResult({error, props, retry}) {
    if (retry) {
      this.sub.dispose();
      this.sub = this.props.remoteOperationObserver.onDidComplete(retry);
    }

    if (error) {
      return (
        <BareIssueishListController
          isLoading={false}
          error={error}
          {...this.controllerProps()}
        />
      );
    }

    if (props === null) {
      return (
        <BareIssueishListController
          isLoading={true}
          {...this.controllerProps()}
        />
      );
    }

    return (
      <IssueishListController
        total={props.search.issueCount}
        results={props.search.nodes}
        isLoading={false}
        {...this.controllerProps()}
      />
    );
  }

  componentWillUnmount() {
    this.sub.dispose();
  }

  controllerProps() {
    return {
      title: this.props.search.getName(),

      onOpenIssueish: this.props.onOpenIssueish,
      onOpenMore: () => this.props.onOpenSearch(this.props.search),
    };
  }
}
