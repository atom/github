import React from 'react';
import PropTypes from 'prop-types';
import Octicon from '../atom/octicon';

import {addEvent} from '../reporter-proxy';

export default class GithubTileView extends React.Component {
  static propTypes = {
    didClick: PropTypes.func.isRequired,
  }

  handleClick = () => {
    addEvent('click', {package: 'github', component: 'GithubTileView'});
    this.props.didClick();
  }

  render() {
    return (
      <button
        className="github-StatusBarTile inline-block"
        onClick={this.handleClick}>
        <Octicon icon="mark-github" />
        GitHub
      </button>
    );
  }
}
