import React from 'react';
import cx from 'classnames';
import {autobind} from 'core-decorators';

function getClasses(staticClasses, active) {
  return cx(...staticClasses, {
    inactive: !active,
    active,
  });
}

class TabsNavigationItem extends React.Component {
  static propTypes = {
    title: React.PropTypes.node,
    tabIndex: React.PropTypes.number.isRequired,
    active: React.PropTypes.bool,
    onClick: React.PropTypes.func,
  }

  render() {
    const classes = getClasses(['github-Tabs-NavigationItem'], this.props.active);
    return (
      <div className={classes} onClick={this.handleClick}>
        {this.props.title}
      </div>
    );
  }

  @autobind
  handleClick() {
    this.props.onClick(this.props.tabIndex);
  }
}

export default class Tabs extends React.Component {
  static propTypes = {
    className: React.PropTypes.string,
    activeIndex: React.PropTypes.number.isRequired,
    children: React.PropTypes.node,
    onChange: React.PropTypes.func,
  }

  static defaultProps = {
    className: '',
    onChange: () => {},
  }

  render() {
    const children = React.Children.toArray(this.props.children).filter(v => !!v);
    return (
      <div className={cx('github-Tabs', this.props.className)} data-tabs-count={children.length}>
        <nav className="github-Tabs-NavigationContainer">
          {children.map((child, i) => (
            child && <TabsNavigationItem
              key={i}
              title={child.props.title}
              active={this.props.activeIndex === i}
              tabIndex={i}
              onClick={this.props.onChange}
                     />
          ))}
        </nav>
        <section className="github-Tabs-PanelContainer">
          {children.map((child, i) => (
            child && React.cloneElement(child, {active: i === this.props.activeIndex})
          ))}
        </section>
      </div>
    );
  }
}

Tabs.Panel = class TabPanel extends React.Component {
  static propTypes = {
    className: React.PropTypes.string,
    active: React.PropTypes.bool,
    children: React.PropTypes.node,
  }

  static defaultProps = {
    className: '',
    active: false,
  }

  render() {
    // eslint-disable-next-line no-unused-vars
    const {active, children, className, ...others} = this.props;
    return (
      <div className={getClasses(['github-Tabs-Panel', className], this.props.active)} {...others}>
        {this.props.children}
      </div>
    );
  }
};
