import React from 'react';
import PropTypes from 'prop-types';
import Octicon from '../atom/octicon';

import RefHolder from '../models/ref-holder';
import Tooltip from '../atom/tooltip';
import {addEvent} from '../reporter-proxy';

export const tooltipMessage = 'Click to view open GitHub pull requests';

export default class GithubTileView extends React.Component {
  static propTypes = {
    didClick: PropTypes.func.isRequired,
    tooltips: PropTypes.object.isRequired,
  }

  constructor(props) {
    super(props);
    this.refTileNode = new RefHolder();
  }

  handleClick = () => {
    addEvent('click', {package: 'github', component: 'GithubTileView'});
    this.props.didClick();
  }

  render() {
    return (
      <span ref={this.refTileNode.setter}>
        <button
          className="github-StatusBarTile inline-block"
          onClick={this.handleClick}>
          <Octicon icon="mark-github" />
          GitHub
        </button>
        <Tooltip
          key="tooltip"
          manager={this.props.tooltips}
          target={this.refTileNode}
          title={`<div style="text-align: left; line-height: 1.2em;">${tooltipMessage}</div>`}
          showDelay={atom.tooltips.hoverDefaults.delay.show}
          hideDelay={atom.tooltips.hoverDefaults.delay.hide}
        />
      </span>
    );
  }
}
