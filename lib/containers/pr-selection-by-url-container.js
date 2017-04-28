import React from 'react';
import Relay from 'react-relay';
import PropTypes from 'prop-types';

import PrInfoContainer from './pr-info-container';
import PrUrlInputBox from '../views/pr-url-input-box';

export class PrSelectionByUrl extends React.Component {
  static propTypes = {
    query: PropTypes.shape({
      resource: PropTypes.object,
    }),
    onSelectPr: PropTypes.func.isRequired,
    onUnpinPr: PropTypes.func.isRequired,
  }

  render() {
    // TODO: render a selector if multiple PRs
    const resource = this.props.query.resource;
    if (!resource || resource.__typename !== 'PullRequest') {
      // return <div>PR not found</div>;
      return (
        <PrUrlInputBox onSubmit={this.props.onSelectPr} />
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
