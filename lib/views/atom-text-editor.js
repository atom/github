import React from 'react';
import PropTypes from 'prop-types';

import {CompositeDisposable} from 'event-kit';

const editorProps = {
  autoIndent: PropTypes.bool,
  autoIndentOnPaste: PropTypes.bool,
  undoGroupingInterval: PropTypes.number,
  scrollSensitivity: PropTypes.number,
  encoding: PropTypes.string,
  softTabs: PropTypes.bool,
  atomicSoftTabs: PropTypes.bool,
  tabLength: PropTypes.number,
  softWrapped: PropTypes.bool,
  softWrapHangingIndentLenth: PropTypes.number,
  softWrapAtPreferredLineLength: PropTypes.bool,
  preferredLineLength: PropTypes.number,
  maxScreenLineLength: PropTypes.number,
  mini: PropTypes.bool,
  readOnly: PropTypes.bool,
  placeholderText: PropTypes.string,
  lineNumberGutterVisible: PropTypes.bool,
  showIndentGuide: PropTypes.bool,
  showLineNumbers: PropTypes.bool,
  showInvisibles: PropTypes.bool,
  invisibles: PropTypes.string,
  editorWidthInChars: PropTypes.number,
  width: PropTypes.number,
  scrollPastEnd: PropTypes.bool,
  autoHeight: PropTypes.bool,
  autoWidth: PropTypes.bool,
  showCursorOnSelection: PropTypes.bool,
};

const nullDisposable = {
  dispose() {},
};

export default class AtomTextEditor extends React.PureComponent {
  static propTypes = {
    ...editorProps,
    text: PropTypes.string,
    didChange: PropTypes.func,
    didChangeCursorPosition: PropTypes.func,
  }

  constructor(props, context) {
    super(props, context);

    this.subs = new CompositeDisposable();
    this.didChangeSub = nullDisposable;
    this.didChangeCursorPositionSub = nullDisposable;
  }

  render() {
    return (
      <atom-text-editor ref={c => { this.refElement = c; }} />
    );
  }

  componentDidMount() {
    this.setAttributesOnElement(this.props);
  }

  componentDidUpdate(nextProps) {
    this.setAttributesOnElement(nextProps);
  }

  componentWillUnmount() {
    this.subs.dispose();
  }

  setAttributesOnElement(theProps) {
    const modelProps = Object.keys(editorProps).reduce((ps, key) => {
      if (theProps[key] !== undefined) {
        ps[key] = theProps[key];
      }
      return ps;
    }, {});

    const editor = this.getModel();
    editor.update(modelProps);

    if (theProps.text && editor.getText() !== theProps.text) {
      editor.setText(theProps.text);
    }

    if (theProps.didChange &&
        (theProps === this.props || theProps.didChange !== this.props.didChange)) {
      this.didChangeSub.dispose();
      this.subs.remove(this.didChangeSub);
      this.didChangeSub = editor.onDidChange(() => {
        console.log('onDidChange handler...');
        if (!this.props.text || this.getModel().getText() !== this.props.text) {
          console.log(`${this.getModel().getText()} vs. ${this.props.text}`);
          theProps.didChange(this.getModel());
        }
      });
      this.subs.add(this.didChangeSub);
    }

    if (theProps.didChangeCursorPosition &&
        (theProps === this.props || theProps.didChangeCursorPosition !== this.props.didChangeCursorPosition)) {
      this.didChangeCursorPositionSub.dispose();
      this.subs.remove(this.didChangeCursorPositionSub);
      this.didChangeCursorPositionSub = editor.onDidChangeCursorPosition(() => {
        theProps.didChangeCursorPosition(this.getModel());
      });
      this.subs.add(this.didChangeCursorPositionSub);
    }
  }

  contains(element) {
    return this.refElement.contains(element);
  }

  focus() {
    this.refElement.focus();
  }

  getModel() {
    return this.refElement.getModel();
  }
}
