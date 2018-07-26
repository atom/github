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

export const MarkerContext = React.createContext();

export const DecorableContext = React.createContext();

// Compare Range or Point compatible props
function changed(Constructor, from, to) {
  if (from == null && to == null) {
    return false;
  } else if (from == null || to == null) {
    return true;
  } else {
    return !Constructor.fromObject(from).isEqual(to);
  }
}

class BareMarker extends React.Component {
  static propTypes = {
    ...markerProps,
    bufferRange: RangePropType,
    bufferPosition: PointPropType,
    screenRange: RangePropType,
    screenPosition: PointPropType,
    markableHolder: RefHolderPropType,
    children: PropTypes.node,
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

    this.decorable = {
      holder: this.markerHolder,
      decorateMethod: 'decorateMarker',
    };
  }

  componentDidMount() {
    this.observeMarkable();
  }

  render() {
    return (
      <MarkerContext.Provider value={this.markerHolder}>
        <DecorableContext.Provider value={this.decorable}>
          {this.props.children}
        </DecorableContext.Provider>
      </MarkerContext.Provider>
    );
  }

  componentDidUpdate(prevProps) {
    if (prevProps.markableHolder !== this.props.markableHolder) {
      this.observeMarkable();
    } else if (
      changed(Range, prevProps.bufferRange, this.props.bufferRange) ||
      changed(Point, prevProps.bufferPosition, this.props.bufferPosition) ||
      changed(Range, prevProps.screenRange, this.props.screenRange) ||
      changed(Point, prevProps.screenPosition, this.props.screenPosition)
    ) {
      this.updateMarkerPosition();
    }

    if (Object.keys(markerProps).some(key => prevProps[key] !== this.props[key])) {
      this.markerHolder.map(marker => marker.setProperties(extractProps(this.props, markerProps)));
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

  updateMarkerPosition() {
    this.markerHolder.map(marker => {
      if (this.props.bufferRange) {
        return marker.setBufferRange(this.props.bufferRange);
      }

      if (this.props.screenRange) {
        return marker.setScreenRange(this.props.screenRange);
      }

      if (this.props.bufferPosition) {
        return marker.setBufferRange(new Range(this.props.bufferPosition, this.props.bufferPosition));
      }

      if (this.props.screenPosition) {
        return marker.setScreenRange(new Range(this.props.screenPosition, this.props.screenPosition));
      }

      throw new Error('Expected one of bufferRange, screenRange, bufferPosition, or screenPosition to be set');
    });
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
      return <BareMarker {...this.props} markableHolder={this.state.markableHolder} />;
    }

    return (
      <MarkerLayerContext.Consumer>
        {layerHolder => {
          if (layerHolder) {
            return <BareMarker {...this.props} markableHolder={layerHolder} />;
          } else {
            return (
              <TextEditorContext.Consumer>
                {editorHolder => <BareMarker {...this.props} markableHolder={editorHolder} />}
              </TextEditorContext.Consumer>
            );
          }
        }}
      </MarkerLayerContext.Consumer>
    );
  }
}
