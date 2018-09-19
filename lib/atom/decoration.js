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
    markerHolder: RefHolderPropType.isRequired,
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
    const markerValid = this.props.markerHolder.map(marker => !marker.isDestroyed()).getOr(false);

    if (!editorValid || !markerValid) {
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
    const marker = this.props.markerHolder.get();

    this.decorationHolder.setter(
      editor[this.props.decorateMethod](marker, opts),
    );
  }

  componentWillUnmount() {
    this.decorationHolder.map(decoration => decoration.destroy());
    this.editorSub.dispose();
    this.markerSub.dispose();
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
        <BareDecoration
          {...this.props}
          editorHolder={this.state.editorHolder}
          markerHolder={this.state.markerHolder}
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
                markerHolder={holder}
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
