import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import {Disposable} from 'event-kit';

import {createItem, autobind} from '../helpers';
import {RefHolderPropType} from '../prop-types';
import {TextEditorContext} from './atom-text-editor';
import {MarkerContext} from './marker';
import RefHolder from '../models/ref-holder';

class WrappedDecoration extends React.Component {
  static propTypes = {
    editorHolder: RefHolderPropType.isRequired,
    markerHolder: RefHolderPropType.isRequired,
    type: PropTypes.oneOf(['line', 'line-number', 'highlight', 'overlay', 'gutter', 'block']).isRequired,
    position: PropTypes.oneOf(['head', 'tail', 'before', 'after']),
    className: PropTypes.string,
    children: PropTypes.element,
    itemHolder: RefHolderPropType,
    options: PropTypes.object,
  }

  static defaultProps = {
    options: {},
    position: 'head',
  }

  constructor(props, context) {
    super(props, context);

    autobind(this, 'observeParents');

    this.decorationHolder = new RefHolder();
    this.editorSub = new Disposable();
    this.markerSub = new Disposable();

    this.domNode = null;
    this.item = null;
    if (['gutter', 'overlay', 'block'].includes(this.props.type)) {
      this.domNode = document.createElement('div');
      this.domNode.className = 'react-atom-decoration';
    }
  }

  usesItem() {
    return this.domNode !== null;
  }

  componentDidMount() {
    this.editorSub = this.props.editorHolder.observe(this.observeParents);
    this.markerSub = this.props.markerHolder.observe(this.observeParents);
  }

  componentDidUpdate(prevProps) {
    if (this.props.editorHolder !== prevProps.editorHolder) {
      this.editorSub.dispose();
      this.editorSub = this.state.editorHolder.observe(this.observeParents);
    }

    if (this.props.markerHolder !== prevProps.markerHolder) {
      this.markerSub.dispose();
      this.markerSub = this.state.markerHolder.observe(this.observeParents);
    }
  }

  render() {
    if (this.usesItem()) {
      return ReactDOM.createPortal(
        this.props.children,
        this.domNode,
      );
    } else {
      return null;
    }
  }

  observeParents() {
    if (this.props.editorHolder.isEmpty() || this.props.markerHolder.isEmpty()) {
      return;
    }

    this.createDecoration();
  }

  createDecoration() {
    this.decorationHolder.map(decoration => decoration.destroy());

    if (!this.item) {
      this.item = createItem(this.domNode, this.props.itemHolder);
    }

    const options = {
      ...this.props.options,
      type: this.props.type,
      position: this.props.position,
      class: this.props.className,
      item: this.item,
    };

    const editor = this.props.editorHolder.get();
    const marker = this.props.markerHolder.get();

    this.decorationHolder.setter(
      editor.decorateMarker(marker, options),
    );
  }

  componentWillUnmount() {
    this.decorationHolder.map(decoration => decoration.destroy());
    this.editorSub.dispose();
    this.markerSub.dispose();
  }
}

export default class Decoration extends React.Component {
  static propTypes = {
    editor: PropTypes.object,
    marker: PropTypes.object,
  }

  constructor(props) {
    super(props);

    this.state = {
      editorHolder: RefHolder.on(this.props.editor),
      markerHolder: RefHolder.on(this.props.marker),
    };
  }

  static getDerivedStateFromProps(props, state) {
    const editorChanged = state.editorHolder.map(editor => editor !== props.editor).getOr(props.editor !== undefined);
    const markerChanged = state.markerHolder.map(marker => marker !== props.marker).getOr(props.marker !== undefined);

    if (!editorChanged && !markerChanged) {
      return null;
    }

    const nextState = {};
    if (editorChanged) {
      nextState.editorHolder = RefHolder.on(props.editor);
    }
    if (markerChanged) {
      nextState.markerHolder = RefHolder.on(props.marker);
    }
    return nextState;
  }

  render() {
    if (!this.state.editorHolder.isEmpty() && !this.state.markerHolder.isEmpty()) {
      return (
        <WrappedDecoration
          {...this.props}
          editorHolder={this.state.editorHolder}
          markerHolder={this.state.markerHolder}
        />
      );
    }

    return (
      <TextEditorContext.Consumer>
        {editorHolder => (
          <MarkerContext.Consumer>
            {markerHolder => (
              <WrappedDecoration {...this.props} editorHolder={editorHolder} markerHolder={markerHolder} />
            )}
          </MarkerContext.Consumer>
        )}
      </TextEditorContext.Consumer>
    );
  }
}
