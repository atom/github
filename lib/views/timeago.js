import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import cx from 'classnames';

moment.updateLocale('en', {
  relativeTime: {
    future: 'in %s',
    past: '%s ago',
    s: 'Now',
    ss: '<1m',
    m: '1m',
    mm: '%dm',
    h: '1h',
    hh: '%dh',
    d: '1d',
    dd: '%dd',
    M: '1M',
    MM: '%dM',
    y: '1y',
    yy: '%d y',
  },
});

export default class Timeago extends React.Component {
  static propTypes = {
    time: PropTypes.any.isRequired,
    type: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.func,
    ]),
  }

  static defaultProps = {
    type: 'span',
  }

  static getTimeDisplay(time, now = moment()) {
    const m = moment(time);
    return m.from(now, true);
  }

  componentDidMount() {
    this.timer = setInterval(() => this.forceUpdate(), 60000);
  }

  componentWillUnmount() {
    clearInterval(this.timer);
  }

  render() {
    const {type, time, ...others} = this.props;
    const display = Timeago.getTimeDisplay(time);
    const Type = type;
    const className = cx('timeago', others.className);
    return (
      <Type {...others} className={className}>{display}</Type>
    );
  }
}
