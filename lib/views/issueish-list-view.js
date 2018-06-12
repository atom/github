import React from 'react';
import PropTypes from 'prop-types';

export default class IssueishListView extends React.Component {
  static propTypes = {
    isLoading: PropTypes.bool.isRequired,
    total: PropTypes.number.isRequired,
    issueishes: PropTypes.arrayOf(PropTypes.any).isRequired,
  }

  render() {
    return null;
  }
}
