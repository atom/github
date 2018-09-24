import React from 'react';
import PropTypes from 'prop-types';
import {emojify} from 'node-emoji';
import moment from 'moment';
import {graphql, createFragmentContainer} from 'react-relay';

import {autobind} from '../helpers';

const avatarAltText = 'committer avatar';

export class PrCommitView extends React.Component {
  static propTypes = {
    item: PropTypes.shape({
      committer: PropTypes.shape({
        avatarUrl: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        date: PropTypes.string.isRequired,
      }).isRequired,
      messageBody: PropTypes.string,
      messageHeadline: PropTypes.string.isRequired,
      abbreviatedOid: PropTypes.string.isRequired,
      url: PropTypes.string.isRequired,
    }).isRequired,
  }

  constructor(props) {
    super(props);
    this.state = {showMessageBody: false};
    autobind(this, 'toggleShowCommitMessageBody', 'humanizeTimeSince');
  }

  toggleShowCommitMessageBody() {
    this.setState({showMessageBody: !this.state.showMessageBody});
  }

  humanizeTimeSince(date) {
    return moment(date).fromNow();
  }

  render() {
    const {messageHeadline, messageBody, abbreviatedOid, url} = this.props.item;
    const {avatarUrl, name, date} = this.props.item.committer;
    return (
      <div className="github-PrCommitView-container">
        <div className="github-PrCommitView-commit">
          <h3 className="github-PrCommitView-title">
            {emojify(messageHeadline)}
            {messageBody ?
              <button
                className="github-PrCommitView-moreButton"
                onClick={this.toggleShowCommitMessageBody}>
                {this.state.showMessageBody ? 'hide' : 'show'} more...
              </button>
              : null}
          </h3>
          <div className="github-PrCommitView-meta">
            <img className="github-PrCommitView-avatar"
              src={avatarUrl}
              alt={avatarAltText} title={avatarAltText}
            />
            <span className="github-PrCommitView-metaText">
              {name} committed {this.humanizeTimeSince(date)}
            </span>
          </div>
          {this.state.showMessageBody ? <pre className="github-PrCommitView-moreText">
            {emojify(messageBody)}</pre> : null}
        </div>
        <div className="github-PrCommitView-sha">
          <a href={url}
            title={`open commit ${abbreviatedOid} on GitHub.com`}>
            {abbreviatedOid}
          </a>
        </div>
      </div>
    );
  }
}

export default createFragmentContainer(PrCommitView, {
  item: graphql`
    fragment prCommitView_item on Commit {
      committer {
        avatarUrl
        name
        date
      }
      messageHeadline
      messageBody
      abbreviatedOid
      url
    }`,
});
