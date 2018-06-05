import React from 'react';
import PropTypes from 'prop-types';
import {Disposable} from 'event-kit';

import {autobind} from '../helpers';
import RefHolder from '../models/ref-holder';
import {TextEditorContext} from './atom-text-editor';

const markerLayerProps = {
  maintainHistory: PropTypes.bool,
  persistent: PropTypes.bool,
};

class WrappedMarkerLayer extends React.Component {
  static propTypes = {
    ...markerLayerProps,
    editor: PropTypes.object,
    children: PropTypes.element,
    handleID: PropTypes.func,
  };

  static defaultProps = {
    handleID: () => {},
  }

  constructor(props) {
    super(props);

    autobind(this, 'createLayer');

    this.sub = new Disposable();
    this.layer = null;
    this.state = {
      editorHolder: RefHolder.on(this.props.editor),
    };
  }

  static getDerivedStateFromProps(props, state) {
    if (state.editorHolder.map(e => e === props.editor).getOr(props.editor === undefined)) {
      return null;
    }

    return {
      editorHolder: RefHolder.on(props.editor),
    };
  }

  componentDidMount() {
    this.observeEditor();
  }

  render() {
    return this.props.children || null;
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.editorHolder !== prevState.editorHolder) {
      this.observeEditor();
    }
  }

  componentWillUnmount() {
    if (this.layer) {
      this.layer.destroy();
    }
    this.sub.dispose();
  }

  observeEditor() {
    this.sub.dispose();
    this.sub = this.state.editorHolder.observe(this.createLayer);
  }

  createLayer() {
    if (this.layer) {
      this.layer.destroy();
    }

    const options = Object.keys(markerLayerProps).reduce((opts, propName) => {
      opts[propName] = this.props[propName];
      return opts;
    }, {});

    this.layer = this.state.editorHolder.map(editor => editor.addMarkerLayer(options)).getOr(null);
    this.props.handleID(this.getID());
  }

  getID() {
    return this.layer ? this.layer.id : undefined;
  }
}

export default class MarkerLayer extends React.Component {
  render() {
    return (
      <TextEditorContext.Consumer>
        {editor => <WrappedMarkerLayer editor={editor} {...this.props} />}
      </TextEditorContext.Consumer>
    );
  }
}
