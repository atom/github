import React from 'react';
import PropTypes from 'prop-types';

import ModelObserver from '../models/model-observer';
import {autobind} from '../helpers';

export default class ObserveModel extends React.Component {
  static propTypes = {
    model: PropTypes.shape({
      onDidUpdate: PropTypes.func.isRequired,
    }),
    fetchData: PropTypes.func.isRequired,
    children: PropTypes.func.isRequired,
  }

  constructor(props, context) {
    super(props, context);
    autobind(this, 'fetchData', 'didUpdate');
    this.state = {data: null};
    this.modelObserver = new ModelObserver({fetchData: this.fetchData, didUpdate: this.didUpdate});
  }

  componentWillMount() {
    this.mounted = true;
    this.modelObserver.setActiveModel(this.props.model);
  }

  componentWillReceiveProps(nextProps) {
    this.modelObserver.setActiveModel(nextProps.model);
  }

  fetchData(model) {
    return this.props.fetchData(model);
  }

  didUpdate(model) {
    if (this.mounted) {
      const data = this.modelObserver.getActiveModelData();
      this.setState({data});
    }
  }

  render() {
    return this.props.children(this.state.data);
  }

  componentWillUnmount() {
    this.mounted = false;
    this.modelObserver.destroy();
  }
}
