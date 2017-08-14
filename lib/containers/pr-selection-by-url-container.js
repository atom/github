import React from 'react';
import {graphql, createFragmentContainer} from 'react-relay';
import PropTypes from 'prop-types';

import PrInfoContainer from './pr-info-container';
import PrUrlInputBox from '../views/pr-url-input-box';

export class PrSelectionByUrl extends React.Component {
  static propTypes = {
    resource: PropTypes.object,
    prUrl: PropTypes.string,
    onSelectPr: PropTypes.func.isRequired,
    onUnpinPr: PropTypes.func.isRequired,
    variables: PropTypes.shape({
      prUrl: PropTypes.string.isRequired,
    }),
  }

  render() {
    const resource = this.props.resource;
    if (!resource || resource.__typename !== 'PullRequest') {
      return (
        <div className="github-PrUrlInputBox-Container">
          <PrUrlInputBox onSubmit={this.props.onSelectPr}>
            <p>
              <span style={{display: 'block'}}>This branch is pinned to the pull request
              at this URL:</span>
              <input value={this.props.variables.prUrl} style={{width: '100%'}} readOnly />
              <span style={{display: 'block'}}>but we couldn't find a pull request at that URL.</span>
            </p>
            <p>
              You can manually pin another GitHub pull request to the current branch by entering its URL:
            </p>
          </PrUrlInputBox>
        </div>
      );
    }
    return (
      <PrInfoContainer
        pullRequest={resource}
        pinnedByUrl={true}
        onUnpinPr={this.props.onUnpinPr}
      />
    );
  }

  setPr(prLink) {
    this.props.onSelectPr(prLink);
  }
}

export default createFragmentContainer(PrSelectionByUrl, {
  resource: graphql`
    fragment PrSelectionByUrlContainer_resource on UniformResourceLocatable {
      __typename
      ... on PullRequest {
        ...PrInfoContainer_pullRequest
      }
    }
  `,
});
