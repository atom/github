import React from 'react';
import Relay from 'react-relay/classic';
import PropTypes from 'prop-types';

import PrInfoContainer from './pr-info-container';
import PrUrlInputBox from '../views/pr-url-input-box';

export class PrSelectionByUrl extends React.Component {
  static propTypes = {
    query: PropTypes.shape({
      resource: PropTypes.object,
    }),
    prUrl: PropTypes.string,
    onSelectPr: PropTypes.func.isRequired,
    onUnpinPr: PropTypes.func.isRequired,
  }

  render() {
    // TODO: render a selector if multiple PRs
    const resource = this.props.query && this.props.query.resource;
    if (!resource || resource.__typename !== 'PullRequest') {
      // return <div>PR not found</div>;
      return (
        <div className="github-PrUrlInputBox-Container">
          <PrUrlInputBox onSubmit={this.props.onSelectPr}>
            <p>
              <span style={{display: 'block'}}>This branch is pinned to the pull request
              at this URL:</span>
              <input value={this.props.prUrl} style={{width: '100%'}} readOnly />
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

export default Relay.createContainer(PrSelectionByUrl, {
  initialVariables: {
    prUrl: null,
  },

  fragments: {
    query: () => Relay.QL`
      fragment on Query {
        resource(url: $prUrl) {
          __typename
          ... on PullRequest {
            ${PrInfoContainer.getFragment('pullRequest')}
          }
        }
      }
    `,
  },
});
