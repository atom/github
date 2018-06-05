import React from 'react';
import PropTypes from 'prop-types';
import {Disposable} from 'event-kit';
import {Range, Point} from 'atom';

import {autobind, extractProps} from '../helpers';
import {RefHolderPropType} from '../prop-types';
import RefHolder from '../models/ref-holder';
import {TextEditorContext} from './atom-text-editor';
import {MarkerLayerContext} from './marker-layer';

const MarkablePropType = PropTypes.shape({
  markBufferRange: PropTypes.func.isRequired,
  markScreenRange: PropTypes.func.isRequired,
  markBufferPosition: PropTypes.func.isRequired,
  markScreenPosition: PropTypes.func.isRequired,
});

const RangePropType = PropTypes.oneOfType([
  PropTypes.array,
  PropTypes.instanceOf(Range),
]);

const PointPropType = PropTypes.oneOfType([
  PropTypes.array,
  PropTypes.instanceOf(Point),
]);

const markerProps = {
  reversed: PropTypes.bool,
  invalidate: PropTypes.oneOf(['never', 'surround', 'overlap', 'inside', 'touch']),
};

class WrappedMarker extends React.Component {
  static propTypes = {
    ...markerProps,
    bufferRange: RangePropType,
    bufferPosition: PointPropType,
    screenRange: RangePropType,
    screenPosition: PointPropType,
    markableHolder: RefHolderPropType,
    children: PropTypes.element,
    handleID: PropTypes.func,
  }

  static defaultProps = {
    handleID: () => {},
  }

  constructor(props) {
    super(props);

    autobind(this, 'createMarker');

    this.sub = new Disposable();
    this.markerHolder = new RefHolder();
  }

  componentDidMount() {
    this.observeMarkable();
  }

  render() {
    return this.props.children || null;
  }

  componentDidUpdate(prevProps) {
    if (this.props.markableHolder !== prevProps.markableHolder) {
      this.observeMarkable();
    }
  }

  componentWillUnmount() {
    this.markerHolder.map(marker => marker.destroy());
    this.sub.dispose();
  }

  observeMarkable() {
    this.sub.dispose();
    this.sub = this.props.markableHolder.observe(this.createMarker);
  }

  createMarker() {
    this.markerHolder.map(marker => marker.destroy());

    const options = extractProps(this.props, markerProps);

    this.markerHolder.setter(
      this.props.markableHolder.map(markable => {
        if (this.props.bufferRange) {
          return markable.markBufferRange(this.props.bufferRange, options);
        }

        if (this.props.screenRange) {
          return markable.markScreenRange(this.props.screenRange, options);
        }

        if (this.props.bufferPosition) {
          return markable.markBufferPosition(this.props.bufferPosition, options);
        }

        if (this.props.screenPosition) {
          return markable.markScreenPosition(this.props.screenPosition, options);
        }

        throw new Error('Expected one of bufferRange, screenRange, bufferPosition, or screenPosition to be set');
      }).getOr(null),
    );

    this.markerHolder.map(marker => this.props.handleID(marker.id));
  }
}

export default class Marker extends React.Component {
  static propTypes = {
    editor: MarkablePropType,
    layer: MarkablePropType,
  }

  constructor(props) {
    super(props);

    this.state = {
      markableHolder: RefHolder.on(props.layer || props.editor),
    };
  }

  static getDerivedStateFromProps(props, state) {
    const markable = props.layer || props.editor;

    if (state.markableHolder.map(m => m === markable).getOr(markable === undefined)) {
      return {};
    }

    return {
      markableHolder: RefHolder.on(markable),
    };
  }

  render() {
    if (!this.state.markableHolder.isEmpty()) {
      return <WrappedMarker {...this.props} markableHolder={this.state.markableHolder} />;
    }

    /* eslint-disable react/jsx-key */
    return (
      <MarkerLayerContext.Consumer>
        {layerHolder => {
          if (layerHolder) {
            return <WrappedMarker {...this.props} markableHolder={layerHolder} />;
          } else {
            return (
              <TextEditorContext.Consumer>
                {editorHolder => <WrappedMarker {...this.props} markableHolder={editorHolder} />}
              </TextEditorContext.Consumer>
            );
          }
        }}
      </MarkerLayerContext.Consumer>
    );
    /* eslint-enable react/jsx-key */
  }
}
