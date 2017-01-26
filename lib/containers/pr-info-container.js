import React from 'react';
import Relay from 'react-relay';

export class PrInfo extends React.Component {
  static propTypes = {
    pullRequest: React.PropTypes.shape({
      title: React.PropTypes.string,
      bodyHTML: React.PropTypes.string,
      number: React.PropTypes.number,
    }),
  }

  render() {
    const pr = this.props.pullRequest;
    return (
      <div className="github-PrInfo">
        <h3>#{pr.number}: {pr.title}</h3>
        <div dangerouslySetInnerHTML={{__html: pr.bodyHTML}} />
      </div>
    );
  }
}

export default Relay.createContainer(PrInfo, {
  fragments: {
    pullRequest: () => Relay.QL`
      fragment on PullRequest {
        number title bodyHTML
      }
    `,
  },
});
