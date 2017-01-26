import React from 'react';
import Relay from 'react-relay';
import cx from 'classnames';

export class PrInfo extends React.Component {
  static propTypes = {
    repository: React.PropTypes.shape({
      name: React.PropTypes.string.isRequired,
      owner: React.PropTypes.shape({
        login: React.PropTypes.string,
      }),
    }),
    pullRequest: React.PropTypes.shape({
      title: React.PropTypes.string,
      bodyHTML: React.PropTypes.string,
      number: React.PropTypes.number,
      state: React.PropTypes.oneOf([
        'OPEN', 'CLOSED', 'MERGED',
      ]).isRequired,
    }).isRequired,
  }

  render() {
    const repo = this.props.repository;
    const pr = this.props.pullRequest;
    return (
      <div className="github-PrInfo">
        <div className="pr-badge-and-link">
          <span className={cx('pr-badge', 'badge', pr.state.toLowerCase())}>
            {pr.state.toLowerCase()}
          </span>
          <span className="pr-link">
            <a href={pr.url}>{repo.owner.login}/{repo.name}#{pr.number}</a>
          </span>
        </div>
        <h3 className="pr-title">{pr.title}</h3>
        <div className="pr-body" dangerouslySetInnerHTML={{__html: pr.bodyHTML}} />
      </div>
    );
  }
}

export default Relay.createContainer(PrInfo, {
  fragments: {
    repository: () => Relay.QL`
      fragment on Repository {
        name owner { login }
      }
    `,

    pullRequest: () => Relay.QL`
      fragment on PullRequest {
        url number title state bodyHTML
      }
    `,
  },
});
