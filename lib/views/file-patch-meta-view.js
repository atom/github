import React from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';

export default class FilePatchMetaView extends React.Component {
  static propTypes = {
    title: PropTypes.string.isRequired,
    actionIcon: PropTypes.string.isRequired,
    actionText: PropTypes.string.isRequired,

    action: PropTypes.func.isRequired,

    children: PropTypes.element.isRequired,
  };

  render() {
    return (
      <div className="github-FilePatchView-meta">
        <div className="github-FilePatchView-metaContainer">
          <header className="github-FilePatchView-metaHeader">
            <h3 className="github-FilePatchView-metaTitle">{this.props.title}</h3>
            <div className="github-FilePatchView-metaControls">
              <button
                className={cx('btn', 'icon', this.props.actionIcon)}
                onClick={this.props.action}>
                {this.props.actionText}
              </button>
            </div>
          </header>
          <div className="github-FilePatchView-metaDetails">
            {this.props.children}
          </div>
        </div>
      </div>
    );
  }
}
