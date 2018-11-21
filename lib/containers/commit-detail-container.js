import React from 'react';
import PropTypes from 'prop-types';
import yubikiri from 'yubikiri';

import ObserveModel from '../views/observe-model';
import LoadingView from '../views/loading-view';
import CommitDetailController from '../controllers/commit-detail-controller';

export default class CommitDetailContainer extends React.Component {
  static propTypes = {
    repository: PropTypes.object.isRequired,
    sha: PropTypes.string.isRequired,
  }

  fetchData = repository => {
    return yubikiri({
      commit: repository.getCommit(this.props.sha),
    });
  }

  render() {
    console.log('container');
    return (
      <ObserveModel model={this.props.repository} fetchData={this.fetchData}>
        {this.renderResult}
      </ObserveModel>
    );
  }

  renderResult = data => {
    if (this.props.repository.isLoading() || data === null || !data.commit.isPresent()) {
      return <LoadingView />;
    }

    return (
      <CommitDetailController
        {...data}
        {...this.props}
      />
    );
  }
}
