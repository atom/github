import React from 'react';
import PropTypes from 'prop-types';

import {RemoteSetPropType, BranchSetPropType, EndpointPropType} from '../prop-types';
import ReviewsView from '../views/reviews-view';
import PullRequestCheckoutController from '../controllers/pr-checkout-controller';
import IssueishDetailItem from '../items/issueish-detail-item';

export default class ReviewsController extends React.Component {
  static propTypes = {
    // GraphQL results
    repository: PropTypes.shape({
      pullRequest: PropTypes.object.isRequired,
    }).isRequired,

    // Package models
    localRepository: PropTypes.object.isRequired,
    isAbsent: PropTypes.bool.isRequired,
    isLoading: PropTypes.bool.isRequired,
    isPresent: PropTypes.bool.isRequired,
    isMerging: PropTypes.bool.isRequired,
    isRebasing: PropTypes.bool.isRequired,
    branches: BranchSetPropType.isRequired,
    remotes: RemoteSetPropType.isRequired,
    multiFilePatch: PropTypes.object.isRequired,

    // Connection properties
    endpoint: EndpointPropType.isRequired,

    // URL parameters
    owner: PropTypes.string.isRequired,
    repo: PropTypes.string.isRequired,
    number: PropTypes.number.isRequired,
    workdir: PropTypes.string.isRequired,

    // Atom environment
    workspace: PropTypes.object.isRequired,
    config: PropTypes.object.isRequired,
    commands: PropTypes.object.isRequired,
    tooltips: PropTypes.object.isRequired,
  }

  state = {
    contextLines: 4,
  }

  render() {
    return (
      <PullRequestCheckoutController
        repository={this.props.repository}
        pullRequest={this.props.repository.pullRequest}

        localRepository={this.props.localRepository}
        isAbsent={this.props.isAbsent}
        isLoading={this.props.isLoading}
        isPresent={this.props.isPresent}
        isMerging={this.props.isMerging}
        isRebasing={this.props.isRebasing}
        branches={this.props.branches}
        remotes={this.props.remotes}>

        {checkoutOp => (
          <ReviewsView
            checkoutOp={checkoutOp}
            contextLines={this.state.contextLines}

            moreContext={this.moreContext}
            lessContext={this.lessContext}
            openFile={this.openFile}
            openDiff={this.openDiff}
            openPR={this.openPR}

            {...this.props}
          />
        )}

      </PullRequestCheckoutController>
    );
  }

  openFile = (filePath, lineNumber) => {
    this.props.workspace.open(
      filePath, {
        initialLine: lineNumber,
        initialColumn: 0,
        pending: true,
      });
  }

  openDiff = async (filePath, lineNumber) => {
    const item = await this.getPRDetailItem();
    item.openFilesTab({
      changedFilePath: filePath,
      changedFilePosition: lineNumber,
    });
  }

  openPR = async () => {
    const item = await this.getPRDetailItem();
    item.onTabSelected(IssueishDetailItem.tabs.OVERVIEW);
  }

  getPRDetailItem = () => {
    return this.props.workspace.open(
      IssueishDetailItem.buildURI(
        this.props.endpoint.getHost(),
        this.props.owner,
        this.props.repo,
        this.props.number,
        this.props.workdir,
      ), {
        pending: true,
        searchAllPanes: true,
      },
    );
  }

  moreContext = () => this.setState(prev => ({contextLines: prev.contextLines + 1}));

  lessContext = () => this.setState(prev => ({contextLines: Math.max(prev.contextLines - 1, 1)}));
}
