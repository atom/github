import React from 'react';
import PropTypes from 'prop-types';
import {CompositeDisposable} from 'event-kit';

import {autobind, extractProps} from '../helpers';
import {RefHolderPropType, MarkerPositionPropType} from '../prop-types';
import RefHolder from '../models/ref-holder';
import {fromChangeEvent} from '../models/marker-position';
import {TextEditorContext} from './atom-text-editor';
import {MarkerLayerContext} from './marker-layer';

const MarkablePropType = PropTypes.shape({
  markBufferRange: PropTypes.func.isRequired,
  markScreenRange: PropTypes.func.isRequired,
  markBufferPosition: PropTypes.func.isRequired,
  markScreenPosition: PropTypes.func.isRequired,
});

const markerProps = {
  reversed: PropTypes.bool,
  invalidate: PropTypes.oneOf(['never', 'surround', 'overlap', 'inside', 'touch']),
};

export const MarkerContext = React.createContext();

export const DecorableContext = React.createContext();

class BareMarker extends React.Component {
  static propTypes = {
    ...markerProps,
    position: MarkerPositionPropType.isRequired,
    markableHolder: RefHolderPropType,
    children: PropTypes.node,
    onDidChange: PropTypes.func,
    handleID: PropTypes.func,
  }

  static defaultProps = {
    onDidChange: () => {},
    handleID: () => {},
  }

  constructor(props) {
    super(props);

    autobind(this, 'createMarker', 'didChange');

    this.subs = new CompositeDisposable();
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
    this.updateMarkerPosition();
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
    }

    if (Object.keys(markerProps).some(key => prevProps[key] !== this.props[key])) {
      this.markerHolder.map(marker => marker.setProperties(extractProps(this.props, markerProps)));
    }
  }

  componentWillUnmount() {
    this.markerHolder.map(marker => marker.destroy());
    this.subs.dispose();
  }

  observeMarkable() {
    this.subs.dispose();
    this.subs = new CompositeDisposable(
      this.props.markableHolder.observe(this.createMarker),
    );
  }

  createMarker() {
    this.markerHolder.map(marker => marker.destroy());

    const options = extractProps(this.props, markerProps);

    this.props.markableHolder.map(markable => {
      const marker = this.props.position.markOn(markable, options);

      this.subs.add(marker.onDidChange(this.didChange));
      this.markerHolder.setter(marker);
      this.props.handleID(marker.id);
      return null;
    });
  }

  updateMarkerPosition() {
    this.markerHolder.map(marker => this.props.position.setIn(marker));
  }

  didChange(event) {
    this.props.onDidChange({
      ...fromChangeEvent(event),
      ...event,
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
