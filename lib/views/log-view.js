import React from 'react';
import * as Three from 'three';

import ThreeScene from './three-scene';
import {autobind} from '../helpers';

export default class LogView extends React.Component {
  constructor(props) {
    super(props);
    autobind(this, 'setUp', 'animate');

    this.cube = null;
    this.wireframe = null;
  }

  render() {
    return <ThreeScene setUp={this.setUp} animate={this.animate} />;
  }

  setUp({scene, camera}) {
    const geometry = new Three.BoxGeometry(1, 1, 1);
    const faceMaterial = new Three.MeshBasicMaterial({color: 0x339999});
    this.cube = new Three.Mesh(geometry, faceMaterial);

    const lineMaterial = new Three.MeshBasicMaterial({color: 0xffffff, wireframe: true});
    this.wireframe = new Three.Mesh(geometry, lineMaterial);

    scene.add(this.cube);
    scene.add(this.wireframe);

    camera.position.z = 5;
  }

  animate({scene}) {
    this.cube.rotation.x += 0.01;
    this.cube.rotation.y += 0.01;

    this.wireframe.rotation.x += 0.01;
    this.wireframe.rotation.y += 0.01;
  }
}
