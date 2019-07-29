import React from 'react';
import PropTypes from 'prop-types';
import {createPaginationContainer, graphql} from 'react-relay';
import Select from 'react-select';

import AtomTextEditor from '../atom/atom-text-editor';

export class BareRepositoryHomeSelectionView extends React.Component {
  static propTypes = {
    // Relay
    relay: PropTypes.shape({
      loadMore: PropTypes.func.isRequired,
    }),
    user: PropTypes.shape({
      id: PropTypes.string.isRequired,
      login: PropTypes.string.isRequired,
      avatarUrl: PropTypes.string.isRequired,
      organizations: PropTypes.shape({
        edges: PropTypes.arrayOf(PropTypes.shape({
          node: PropTypes.shape({
            id: PropTypes.string.isRequired,
            login: PropTypes.string.isRequired,
            avatarUrl: PropTypes.string.isRequired,
            viewerCanCreateRepositories: PropTypes.bool.isRequired,
          }),
        })),
      }).isRequired,
    }),

    // Model
    nameBuffer: PropTypes.object.isRequired,
    isLoading: PropTypes.bool.isRequired,
    selectedOwnerID: PropTypes.string.isRequired,
    autofocus: PropTypes.shape({
      target: PropTypes.func.isRequired,
    }).isRequired,

    // Selection callback
    didChangeOwnerID: PropTypes.func.isRequired,
  }

  render() {
    const owners = this.getOwners();
    const currentOwner = owners.find(o => o.id === this.props.selectedOwnerID) || owners[0];

    return (
      <div className="github-RepositoryHome">
        <Select
          className="github-RepositoryHome-owner"
          clearable={false}
          disabled={this.props.isLoading}
          options={owners}
          optionRenderer={this.renderOwner}
          value={currentOwner}
          valueRenderer={this.renderOwner}
          onChange={this.didChangeOwner}
        />
        <span className="github-RepositoryHome-separator">/</span>
        <AtomTextEditor
          ref={this.props.autofocus.target}
          mini={true}
          readOnly={this.props.isLoading}
          buffer={this.props.nameBuffer}
        />
      </div>
    );
  }

  renderOwner = owner => (
    <div className="github-RepositoryHome-owner">
      <img alt="" src={owner.avatarURL} className="github-RepositoryHome-ownerAvatar" />
      <span className="github-RepositoryHome-ownerName">{owner.login}</span>
      {owner.disabled && (
        <div className="github-RepositoryHome-ownerUnwritable">
          (insufficient permissions)
        </div>
      )}
    </div>
  );

  getOwners() {
    if (!this.props.user) {
      return [{
        id: '',
        login: '',
        avatarURL: '',
        disabled: true,
      }];
    }

    const owners = [{
      id: this.props.user.id,
      login: this.props.user.login,
      avatarURL: this.props.user.avatarUrl,
      disabled: false,
    }];

    if (!this.props.user.organizations.edges) {
      return owners;
    }

    for (const {node} of this.props.user.organizations.edges) {
      if (!node) {
        continue;
      }

      owners.push({
        id: node.id,
        login: node.login,
        avatarURL: node.avatarUrl,
        disabled: !node.viewerCanCreateRepositories,
      });
    }

    return owners;
  }

  didChangeOwner = owner => this.props.didChangeOwnerID(owner.id);
}

export default createPaginationContainer(BareRepositoryHomeSelectionView, {
  user: graphql`
    fragment repositoryHomeSelectionView_user on User
    @argumentDefinitions(
      organizationCount: {type: "Int!"}
      organizationCursor: {type: "String"}
    ) {
      id
      login
      avatarUrl(size: 24)
      organizations(
        first: $organizationCount
        after: $organizationCursor
      ) @connection(key: "RepositoryHomeSelectionView_organizations") {
        pageInfo {
          hasNextPage
          endCursor
        }

        edges {
          cursor
          node {
            id
            login
            avatarUrl(size: 24)
            viewerCanCreateRepositories
          }
        }
      }
    }
  `,
}, {
  direction: 'forward',
  /* istanbul ignore next */
  getConnectionFromProps(props) {
    return props.user.organizations;
  },
  /* istanbul ignore next */
  getFragmentVariables(prevVars, totalCount) {
    return {...prevVars, totalCount};
  },
  /* istanbul ignore next */
  getVariables(props, {count, cursor}) {
    return {
      id: props.user.id,
      organizationCount: count,
      organizationCursor: cursor,
    };
  },
  query: graphql`
    query repositoryHomeSelectionViewQuery(
      $id: ID!
      $organizationCount: Int!
      $organizationCursor: String
    ) {
      node(id: $id) {
        ... on User {
          ...repositoryHomeSelectionView_user @arguments(
            organizationCount: $organizationCount
            organizationCursor: $organizationCursor
          )
        }
      }
    }
  `,
});
