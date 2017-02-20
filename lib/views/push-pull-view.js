/** @jsx etch.dom */
/* eslint react/no-unknown-property: "off" */

import etch from 'etch';
import cx from 'classnames';

export default class PushPullView {
  constructor(props) {
    this.props = props;
    etch.initialize(this);
  }

  update(props) {
    this.props = {...this.props, ...props};
    return etch.update(this);
  }

  render() {
    const pushing = this.props.pushInProgress;
    const pulling = this.props.fetchInProgress;
    const pushClasses = cx('github-PushPull-icon', 'icon', {'icon-arrow-up': !pushing, 'icon-sync': pushing});
    const pullClasses = cx('github-PushPull-icon', 'icon', {'icon-arrow-down': !pulling, 'icon-sync': pulling});
    return (
      <div className="github-PushPull inline-block">
        <span className={pullClasses} />
        <span className="github-PushPull-label is-pull" ref="behindCount">
          {this.props.behindCount ? `${this.props.behindCount}` : ''}
        </span>
        <span className={pushClasses} />
        <span className="github-PushPull-label is-push" ref="aheadCount">
          {this.props.aheadCount ? `${this.props.aheadCount}` : ''}
        </span>
      </div>
    );
  }
}
