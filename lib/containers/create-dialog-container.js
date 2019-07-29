import React from 'react';
import PropTypes from 'prop-types';
import {QueryRenderer, graphql} from 'react-relay';

import CreateDialogController, {BareCreateDialogController} from '../controllers/create-dialog-controller';
import ObserveModel from '../views/observe-model';
import RelayNetworkLayerManager from '../relay-network-layer-manager';
import {getEndpoint} from '../models/endpoint';
import {GithubLoginModelPropType} from '../prop-types';

const DOTCOM = getEndpoint('github.com');

export default class CreateDialogContainer extends React.Component {
  static propTypes = {
    // Model
    loginModel: GithubLoginModelPropType.isRequired,
    request: PropTypes.object.isRequired,
    autofocus: PropTypes.object.isRequired,
    inProgress: PropTypes.bool.isRequired,

    // Atom environment
    currentWindow: PropTypes.object.isRequired,
    workspace: PropTypes.object.isRequired,
    commands: PropTypes.object.isRequired,
    config: PropTypes.object.isRequired,
  }

  render() {
    return (
      <ObserveModel model={this.props.loginModel} fetchData={this.fetchToken}>
        {this.renderWithToken}
      </ObserveModel>
    );
  }

  renderWithToken = token => {
    if (!token) {
      return this.renderLoading();
    }

    const environment = RelayNetworkLayerManager.getEnvironmentForHost(DOTCOM, token);
    const query = graphql`
      query createDialogContainerQuery(
        $organizationCount: Int!
        $organizationCursor: String
      ) {
        viewer {
          ...createDialogController_user @arguments(
            organizationCount: $organizationCount
            organizationCursor: $organizationCursor
          )
        }
      }
    `;
    const variables = {
      organizationCount: 100,
      organizationCursor: null,
    };

    return (
      <QueryRenderer
        environment={environment}
        query={query}
        variables={variables}
        render={this.renderWithResult}
      />
    );
  }

  renderWithResult = ({error, props}) => {
    if (error) {
      return this.renderError(error);
    }

    if (!props) {
      return this.renderLoading();
    }

    return (
      <CreateDialogController
        user={props.viewer}
        error={null}
        isLoading={false}
        {...this.props}
      />
    );
  }

  renderError(error) {
    return (
      <BareCreateDialogController
        user={null}
        error={error}
        isLoading={false}
        {...this.props}
      />
    );
  }

  renderLoading() {
    return (
      <BareCreateDialogController
        user={null}
        error={null}
        isLoading={true}
        {...this.props}
      />
    );
  }

  fetchToken = loginModel => loginModel.getToken(DOTCOM.getLoginAccount())
}
