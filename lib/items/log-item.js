import React from 'react';

import LogView from '../views/log-view';

export default class LogItem extends React.Component {
  static uriPattern = 'atom-github://log'

  static buildURI() {
    return this.uriPattern;
  }

  render() {
    return <LogView />;
  }

  getTitle() {
    return 'Git Log';
  }

  getIconName() {
    return 'git-commit';
  }

  getURI() {
    return this.constructor.uriPattern;
  }
}
