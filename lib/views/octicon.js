import React from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';

export default function Octicon({icon, ...others}) {
  const classes = cx('icon', `icon-${icon}`, others.className);
  return <span {...others} className={classes} />;
}

Octicon.propTypes = {
  icon: PropTypes.string.isRequired,
};
