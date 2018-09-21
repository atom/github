import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import {Disposable} from 'event-kit';

import {createItem, autobind, extractProps} from '../helpers';
import {RefHolderPropType} from '../prop-types';
import {TextEditorContext} from './atom-text-editor';
import {DecorableContext} from './marker';
import RefHolder from '../models/ref-holder';

const decorationPropTypes = {
  type: PropTypes.oneOf(['line', 'line-number', 'highlight', 'overlay', 'gutter', 'block']).isRequired,
  className: PropTypes.string,
  style: PropTypes.string,
  onlyHead: PropTypes.bool,
  onlyEmpty: PropTypes.bool,
  onlyNonEmpty: PropTypes.bool,
  omitEmptyLastRow: PropTypes.bool,
  position: PropTypes.oneOf(['head', 'tail', 'before', 'after']),
  avoidOverflow: PropTypes.bool,
  gutterName: PropTypes.string,
};

class BareDecoration extends React.Component {
  static propTypes = {
    editorHolder: RefHolderPropType.isRequired,
    markableHolder: RefHolderPropType.isRequired,
    decorateMethod: PropTypes.oneOf(['decorateMarker', 'decorateMarkerLayer']),
    itemHolder: RefHolderPropType,
    children: PropTypes.node,
    ...decorationPropTypes,
  }

  static defaultProps = {
    decorateMethod: 'decorateMarker',
  }

  constructor(props, context) {
    super(props, context);

    autobind(this, 'observeParents');

    this.decorationHolder = new RefHolder();
    this.editorSub = new Disposable();
    this.markableSub = new Disposable();

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
    this.markableSub = this.props.markableHolder.observe(this.observeParents);
  }

  componentDidUpdate(prevProps) {
    if (this.props.editorHolder !== prevProps.editorHolder) {
      this.editorSub.dispose();
      this.editorSub = this.state.editorHolder.observe(this.observeParents);
    }

    if (this.props.markableHolder !== prevProps.markableHolder) {
      this.markableSub.dispose();
      this.markableSub = this.state.markableHolder.observe(this.observeParents);
    }

    if (
      Object.keys(decorationPropTypes).some(key => this.props[key] !== prevProps[key])
    ) {
      const opts = this.getDecorationOpts(this.props);
      this.decorationHolder.map(decoration => decoration.setProperties(opts));
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
    this.decorationHolder.map(decoration => decoration.destroy());

    const editorValid = this.props.editorHolder.map(editor => !editor.isDestroyed()).getOr(false);
    const markableValid = this.props.markableHolder.map(markable => !markable.isDestroyed()).getOr(false);

    // Ensure the Marker or MarkerLayer corresponds to the context's TextEditor
    const markableMatches = this.props.markableHolder.map(markable => this.props.editorHolder.map(editor => {
      const layer = markable.layer || markable;
      const displayLayer = editor.getMarkerLayer(layer.id);
      if (!displayLayer) {
        return false;
      }
      if (displayLayer !== layer && displayLayer.bufferMarkerLayer !== layer) {
        return false;
      }
      return true;
    }).getOr(false)).getOr(false);

    if (!editorValid || !markableValid || !markableMatches) {
      return;
    }

    this.createDecoration();
  }

  createDecoration() {
    if (!this.item) {
      this.item = createItem(this.domNode, this.props.itemHolder);
    }

    const opts = this.getDecorationOpts(this.props);
    const editor = this.props.editorHolder.get();
    const markable = this.props.markableHolder.get();

    this.decorationHolder.setter(
      editor[this.props.decorateMethod](markable, opts),
    );
  }

  componentWillUnmount() {
    this.decorationHolder.map(decoration => decoration.destroy());
    this.editorSub.dispose();
    this.markableSub.dispose();
  }

  getDecorationOpts(props) {
    return {
      ...extractProps(props, decorationPropTypes, {className: 'class'}),
      item: this.item,
    };
  }
}

export default class Decoration extends React.Component {
  static propTypes = {
    editor: PropTypes.object,
    markable: PropTypes.object,
  }

  constructor(props) {
    super(props);

    this.state = {
      editorHolder: RefHolder.on(this.props.editor),
      markableHolder: RefHolder.on(this.props.markable),
    };
  }

  static getDerivedStateFromProps(props, state) {
    const editorChanged = state.editorHolder
      .map(editor => editor !== props.editor)
      .getOr(props.editor !== undefined);
    const markableChanged = state.markableHolder
      .map(markable => markable !== props.markable)
      .getOr(props.markable !== undefined);

    if (!editorChanged && !markableChanged) {
      return null;
    }

    const nextState = {};
    if (editorChanged) {
      nextState.editorHolder = RefHolder.on(props.editor);
    }
    if (markableChanged) {
      nextState.markableHolder = RefHolder.on(props.markable);
    }
    return nextState;
  }

  render() {
    if (!this.state.editorHolder.isEmpty() && !this.state.markableHolder.isEmpty()) {
      return (
        <BareDecoration
          {...this.props}
          editorHolder={this.state.editorHolder}
          markableHolder={this.state.markableHolder}
        />
      );
    }

    return (
      <TextEditorContext.Consumer>
        {editorHolder => (
          <DecorableContext.Consumer>
            {({holder, decorateMethod}) => (
              <BareDecoration
                editorHolder={editorHolder}
                markableHolder={holder}
                decorateMethod={decorateMethod}
                {...this.props}
              />
            )}
          </DecorableContext.Consumer>
        )}
      </TextEditorContext.Consumer>
    );
  }
}
