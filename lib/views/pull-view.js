import React from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';

export default class PushPullView extends React.Component {
  static propTypes = {
    pull: PropTypes.func.isRequired,
    fetch: PropTypes.func.isRequired,
    fetchInProgress: PropTypes.bool,
    behindCount: PropTypes.number,
  }

  static defaultProps = {
    fetchInProgress: false,
    behindCount: 0,
  }

  onClick = clickEvent => {
    if (clickEvent.ctrlKey || clickEvent.shiftKey || clickEvent.altKey || clickEvent.metaKey) {
      this.props.fetch();
    } else {
      this.props.pull();
    }
  }

  render() {
    const pulling = this.props.fetchInProgress;
    const pullClasses = cx('github-PushPull-icon', 'icon', {'icon-arrow-down': !pulling, 'icon-sync': pulling});
    return (
      <div
        className="github-PushPull github-Pull inline-block"
        ref={e => { this.element = e; }}
        onClick={this.onClick}
        // TODO: This should be a blue Atom tooltip
        title="Click to pull, Cmd + Click to fetch">
        <span className={pullClasses} />
        {this.props.behindCount > 0 && <span className="github-PushPull-label is-pull">
          `${this.props.behindCount}`
        </span>}
      </div>
    );
  }
}
