import React from 'react';
import PropTypes from 'prop-types';
import yubikiri from 'yubikiri';
import {CompositeDisposable} from 'event-kit';

import {getEndpoint} from '../models/endpoint';
import ObserveModel from '../views/observe-model';
import {GithubLoginModelPropType} from '../prop-types';
import {UNAUTHENTICATED, INSUFFICIENT} from '../shared/keytar-strategy';

export default class CommentDecorationsContainer extends React.Component {
  static propTypes = {
    workspace: PropTypes.object.isRequired,
    commandRegistry: PropTypes.object.isRequired,
    repository: PropTypes.object.isRequired,
    loginModel: GithubLoginModelPropType.isRequired,
  };

  constructor(props, context) {
    super(props, context);

    this.state = {openEditors: this.props.workspace.getTextEditors()};
    this.subscriptions = new CompositeDisposable();
  }

  componentDidMount() {
    const updateState = () => {
      this.setState({
        openEditors: this.props.workspace.getTextEditors(),
      });
    };

    this.subscriptions.add(
      this.props.workspace.observeTextEditors(updateState),
      this.props.workspace.onDidDestroyPaneItem(updateState),
    );
  }

  fetchRepositoryData = repository => {
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

  fetchToken(loginModel) {
    // todo: what's a better way to get the host here?
    // normally we are building a URI for an item, so we can grab the host
    // from the passed-in URL but this isn't an item so not sure what to do.
    const endpoint = getEndpoint('github.com');
    return yubikiri({
      token: loginModel.getToken(endpoint.getLoginAccount()),
    });
  }

  renderWithToken = tokenData => {
    if (!tokenData || tokenData.token === UNAUTHENTICATED || tokenData.token === INSUFFICIENT) {
      // we're not going to prompt users to log in to render decorations for comments
      // just let it go and move on with our lives.
      return null;
    }
    return (
      <ObserveModel model={this.props.repository} fetchData={this.fetchRepositoryData}>
        {repoData => this.renderWithData(repoData, tokenData.token)}
      </ObserveModel>
    );
  }

  render() {
    return (
      <ObserveModel model={this.props.loginModel} fetchData={this.fetchToken}>
        {this.renderWithToken}
      </ObserveModel>
    );
  }

  renderWithData(repoData) {
    const editorsWithCommentThreads = this.getEditorsWithCommentThreads(repoData);

    return null;
    // todo: we want something like
    // return (
    //   <Fragment>
    //     {editorsWithCommentThreads.map(editor => (
    //       <EditorConflictController
    //         key={editor.id}
    //         commandRegistry={this.props.commandRegistry}
    //         editor={editor}
    //         isRebase={repoData.isRebasing}
    //       />
    //     ))}
    //   </Fragment>
    // );
  }

  getEditorsWithCommentThreads(repoData) {
    // TODO: when we have fetched all the comment data, return only editors with comment threads
    return this.state.openEditors;
  }

  componentWillUnmount() {
    this.subscriptions.dispose();
  }
}
