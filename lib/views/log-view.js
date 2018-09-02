import React from 'react';
import * as Three from 'three';

import ThreeScene from './three-scene';
import {autobind} from '../helpers';

export default class LogView extends React.Component {
  constructor(props) {
    super(props);
    autobind(this, 'setUp', 'animate');
  }

  render() {
    return <ThreeScene setUp={this.setUp} animate={this.animate} />;
  }

  setUp({scene, camera}) {
    const geometry = new Three.BoxGeometry(1, 1, 1);
    const material = new Three.MeshBasicMaterial({color: 0x00ff00});
    const cube = new Three.Mesh(geometry, material);

    scene.add(cube);
    camera.position.z = 5;
  }

  animate({scene}) {
    //
  }
}
