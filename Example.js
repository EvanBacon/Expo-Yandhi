import { AR, Asset } from 'expo';
import { GraphicsView } from 'expo-graphics';
import ExpoTHREE, { AR as ThreeAR, THREE } from 'expo-three';
import { TweenMax } from 'gsap';
import React from 'react';

const DISK_SIZE = 0.127;

class Example extends React.Component {
  async componentDidMount() {
    this._anchorsDidUpdate = AR.onAnchorsDidUpdate(({ anchors, eventType }) => {
      for (const anchor of anchors) {
        if (anchor.type === AR.AnchorTypes.Image) {
          console.log('Anchor', anchor);
          this.handleImage(anchor, eventType);
        }
      }
    });
  }

  componentWillUnmount() {
    this._anchorsDidUpdate.remove();
  }

  handleImage = (anchor, eventType) => {
    const { transform } = anchor;
    if (!this.mesh) {
      return;
    }

    let matrix = new THREE.Matrix4();
    matrix.fromArray(transform);

    let nextPosition = new THREE.Vector3();
    let nextScale = new THREE.Vector3();

    matrix.decompose(nextPosition, this.mesh.quaternion, this.mesh.scale);

    const minScale = 0.00001;
    if (eventType === AR.AnchorEventTypes.Add) {
      this.mesh.position.set(nextPosition.x, nextPosition.y, nextPosition.z);

      // this.mesh.position.set(nextPosition);
      // this.mesh.scale.set(nextScale);
      this.mesh.visible = true;
      this.cube.scale.set(minScale, minScale, minScale);
      TweenMax.to(this.cube.scale, 0.5, {
        x: 1,
        y: 1,
        z: 1,
      });
    } else if (eventType === AR.AnchorEventTypes.Remove) {
      TweenMax.to(this.cube.scale, 0.5, {
        x: minScale,
        y: minScale,
        z: minScale,
        onComplete: () => (this.cube.visible = false),
      });
    } else {
      TweenMax.to(this.mesh.position, 0.05, {
        x: nextPosition.x,
        y: nextPosition.y,
        z: nextPosition.z,
      });
    }
  };

  addDetectionImageAsync = async (width = DISK_SIZE) => {
    this.image = Asset.fromModule(require('./yandhi.jpeg'));
    await this.image.downloadAsync();

    await AR.setDetectionImagesAsync({
      icon: {
        uri: this.image.localUri,
        name: 'yandhi',
        width,
      },
    });
  };

  render() {
    return (
      <GraphicsView
        style={{ flex: 1 }}
        onContextCreate={this.onContextCreate}
        onRender={this.onRender}
        onResize={this.onResize}
        arTrackingConfiguration={AR.TrackingConfigurations.World}
        isArEnabled
        isArCameraStateEnabled
      />
    );
  }

  onContextCreate = async ({ gl, scale: pixelRatio, width, height }) => {
    AR.setPlaneDetection(AR.PlaneDetectionTypes.Horizontal);
    await this.addDetectionImageAsync();

    this.renderer = new ExpoTHREE.Renderer({ gl, pixelRatio, width, height });
    this.scene = new THREE.Scene();
    this.scene.background = new ThreeAR.BackgroundTexture(this.renderer);
    this.camera = new ThreeAR.Camera(width, height, 0.01, 1000);

    await this.loadModel();

    this.scene.add(new THREE.AmbientLight(0xffffff));
  };

  loadModel = async () => {
    const texture = await ExpoTHREE.loadTextureAsync({ asset: this.image });

    const size = DISK_SIZE;
    const geometry = new THREE.BoxGeometry(size, size, size * 0.05);
    const material = new THREE.MeshPhongMaterial({
      map: texture,
    });
    this.cube = new THREE.Mesh(geometry, material);
    this.cube.position.y = size / 2;

    this.mesh = new THREE.Group();
    this.mesh.add(this.cube);
    this.scene.add(this.mesh);
    this.mesh.visible = false;
  };

  onResize = ({ x, y, scale, width, height }) => {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(scale);
    this.renderer.setSize(width, height);
  };

  onRender = delta => {
    if (this.cube && this.cube.visible) this.cube.rotation.y += 0.6 * delta;

    this.renderer.render(this.scene, this.camera);
  };
}

export default Example;
