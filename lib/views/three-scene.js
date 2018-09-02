import React from 'react';
import PropTypes from 'prop-types';
import * as Three from 'three';
import {CompositeDisposable, Disposable} from 'event-kit';

import RefHolder from '../models/ref-holder';
import {ItemAdded} from '../atom/pane-item';
import {autobind} from '../helpers';

export default class ThreeScene extends React.Component {
  static propTypes = {
    fieldOfView: PropTypes.number,
    nearClippingPlane: PropTypes.number,
    farClippingPlane: PropTypes.number,

    setUp: PropTypes.func,
    animate: PropTypes.func,
  }

  static defaultProps = {
    fieldOfView: 75,
    nearClippingPlane: 0.1,
    farClippingPlane: 1000,

    setUp: () => {},
    animate: () => {},
  }

  constructor(props) {
    super(props);
    autobind(this, 'setUpScene', 'animateScene');

    this.subs = new CompositeDisposable();

    this.refRoot = new RefHolder();

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.active = false;

    this.subs.add(
      this.refRoot.observe(this.setUpScene),
      new Disposable(() => { this.active = false; }),
    );
  }

  render() {
    return (
      <ItemAdded>
        {() => <div className="github-ThreeScene" ref={this.refRoot.setter} />}
      </ItemAdded>
    );
  }

  componentWillUnmount() {
    this.subs.dispose();
  }

  setUpScene(rootElement) {
    if (!rootElement) {
      this.active = false;
      return;
    }
    this.active = true;

    const {width, height} = rootElement.getBoundingClientRect();

    this.scene = new Three.Scene();

    this.camera = new Three.PerspectiveCamera(
      this.props.fieldOfView,
      width / height,
      this.props.nearClippingPlane,
      this.props.farClippingPlane,
    );

    this.renderer = new Three.WebGLRenderer();
    this.renderer.setSize(width, height);
    rootElement.appendChild(this.renderer.domElement);

    this.props.setUp({scene: this.scene, camera: this.camera});

    this.animateScene();
  }

  animateScene() {
    this.refRoot.map(rootElement => {
      if (!this.active) {
        return null;
      }

      requestAnimationFrame(this.animateScene);
      this.props.animate({scene: this.scene, camera: this.camera});
      this.renderer.render(this.scene, this.camera);

      return null;
    });
  }
}
