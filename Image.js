import Expo, { AR } from 'expo';
import { TweenMax } from 'gsap';
import ExpoTHREE, { THREE, AR as ThreeAR } from 'expo-three';
import React from 'react';
import { View, Linking, TouchableOpacity, Text, Image } from 'react-native';
// import Assets from '../../Assets';
import { View as GraphicsView } from 'expo-graphics';

const DISK_SIZE = 0.127;

console.ignoredYellowBox = ['Module', 'Class'];
class ImageExample extends React.Component {
  static url = 'screens/AR/Image.js';

  state = { ready: false };

  recentMagneticPositions = [];
  updateTransform = position => {
    // add to list of recent positions
    this.recentMagneticPositions.push(position);

    // remove anything older than the last 8
    while (this.recentMagneticPositions.length > 8) {
      this.recentMagneticPositions.shift();
    }

    // move to average of recent positions to avoid jitter

    if (this.recentMagneticPositions.length > 4) {
      const { length } = this.recentMagneticPositions;
      let average = new THREE.Vector3();

      for (let position of this.recentMagneticPositions) {
        average.add(position);
      }
      average.divide(new THREE.Vector3(length, length, length));
      return average;
    }
    return position;
  };

  async componentDidMount() {
    Expo.ScreenOrientation.allow(Expo.ScreenOrientation.Orientation.LANDSCAPE);
    this.image = Expo.Asset.fromModule(require('./yandhi.jpeg'));
    await this.image.downloadAsync();
    this.setState({ ready: true });

    this._anchorsDidUpdate = AR.onAnchorsDidUpdate(({ anchors, eventType }) => {
      for (const anchor of anchors) {
        if (anchor.type === AR.AnchorTypes.Image) {
          console.log('Found image', anchor);
          this.handleImage(anchor, eventType);
        }
      }
    });
  }

  componentWillUnmount() {
    this._anchorsDidUpdate.remove();
  }

  // When the provided image is found in real life, it'll be shown here.
  handleImage = (anchor, eventType) => {
    const { transform } = anchor;
    if (!this.mesh) {
      return;
    }

    // // let nextPosition = new THREE.Vector3();
    // let matrix = new THREE.Matrix4();
    // matrix.fromArray(transform);
    // matrix.decompose(nextPosition, this.mesh.quaternion, this.mesh.scale);
    // this.mesh.matrix.fromArray(transform);
    // this.mesh.matrix.decompose(
    //   this.mesh.position,
    //   this.mesh.quaternion,
    //   this.mesh.scale,
    // );
    // this.mesh.position = this.updateTransform(nextPosition);

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
      // TweenMax.to(this.mesh.position, 0.2, {
      //   x: nextScale.x,
      //   y: nextScale.y,
      //   z: nextScale.z,
      // });
      // matrix.decompose(
      //   this.mesh.position,
      //   new THREE.Quaternion(),
      //   new THREE.Vector3(),
      // );
    }
  };

  addDetectionImageAsync = async (width = DISK_SIZE) => {
    await AR.setDetectionImagesAsync({
      icon: {
        uri: this.image.localUri,
        name: 'yandhi',
        width,
      },
    });
  };

  openLink = () => {
    Linking.openURL(
      'https://github.com/expo/expo-three/blob/master/example/assets/marker.jpg',
    );
  };

  render() {
    if (!this.state.ready) return <View />;

    return (
      <View style={{ flex: 1 }}>
        <GraphicsView
          style={{ flex: 1 }}
          onContextCreate={this.onContextCreate}
          onRender={this.onRender}
          onResize={this.onResize}
          arTrackingConfiguration={AR.TrackingConfigurations.World}
          isArEnabled
          isArRunningStateEnabled
          isArCameraStateEnabled
        />
        {false && (
          <View
            style={{
              position: 'absolute',
              alignItems: 'stretch',
              justifyContent: 'flex-end',
              bottom: 12,
              right: 12,
              opacity: 0.5,
              width: '30%',
            }}
          >
            <Text>Point the camera at this image.</Text>
            <TouchableOpacity onPress={this.openLink}>
              <Image
                source={Assets['marker.jpg']}
                style={{ maxWidth: '100%', height: 100, resizeMode: 'contain' }}
              />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  onContextCreate = async ({ gl, scale: pixelRatio, width, height }) => {
    AR.setPlaneDetection(AR.PlaneDetectionTypes.Horizontal);

    await this.addDetectionImageAsync();

    this.renderer = new ExpoTHREE.Renderer({ gl, pixelRatio, width, height });
    // this.renderer.gammaInput = this.renderer.gammaOutput = true;
    // this.renderer.shadowMap.enabled = true;

    this.scene = new THREE.Scene();
    this.scene.background = new ThreeAR.BackgroundTexture(this.renderer);

    this.camera = new ThreeAR.Camera(width, height, 0.01, 1000);

    await this.loadModel();

    // this.ambient = new ThreeAR.Light();
    this.mesh.add(new THREE.AmbientLight(0xffffff));
    // this.mesh.add(this.shadow);
    // this.mesh.add(this.point);
  };

  loadModel = async () => {
    const texture = await ExpoTHREE.loadTextureAsync({ asset: this.image });

    const size = DISK_SIZE;
    const geometry = new THREE.BoxGeometry(size, size, size * 0.05);
    const material = new THREE.MeshPhongMaterial({
      // NOTE: How to create an Expo-compatible THREE texture
      map: texture,
    });
    this.cube = new THREE.Mesh(geometry, material);
    // this.cube.castShadow = true;
    // this.cube.receiveShadow = true;
    this.cube.position.y = size / 2;
    // // const model = Assets.models.collada.stormtrooper;
    // const collada = await ExpoTHREE.loadDaeAsync({
    //   asset: model['stormtrooper.dae'],
    //   onAssetRequested: model,
    // });
    // const { scene: mesh, animations } = collada;
    // mesh.traverse(child => {
    //   if (child instanceof THREE.Mesh) {
    //     child.castShadow = true;
    //     child.receiveShadow = true;
    //   }
    // });

    // mesh.castShadow = true;

    // ExpoTHREE.utils.scaleLongestSideToSize(mesh, 0.1);

    // this.mixer = new THREE.AnimationMixer(mesh);
    // this.mixer.clipAction(animations[0]).play();

    // const geometry = new THREE.PlaneBufferGeometry(1, 1, 32, 32);
    // const material = new THREE.ShadowMaterial();
    // material.opacity = 0.7;
    // const plane = new THREE.Mesh(geometry, material);
    // plane.receiveShadow = true;
    // plane.rotation.x = -Math.PI / 2;

    // let _mesh = new THREE.Object3D();

    // _mesh.add(mesh);
    // _mesh.add(plane);
    this.mesh = new THREE.Group();
    this.mesh.add(this.cube); // Save reference for rotation

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
    if (this.cube && this.cube.visible) {
      this.cube.rotation.y += 0.6 * delta;
    }
    // this.ambient.update();
    this.renderer.render(this.scene, this.camera);
  };

  get point() {
    const light = new THREE.PointLight(0xffffff);
    light.position.set(0, 1, 0);
    return light;
  }

  get shadow() {
    let light = new THREE.DirectionalLight(0xffffff, 0.6);

    light.position.set(0, 0.5, 0.1);
    light.castShadow = true;

    const shadowSize = 0.05;
    light.shadow.camera.left *= shadowSize;
    light.shadow.camera.right *= shadowSize;
    light.shadow.camera.top *= shadowSize;
    light.shadow.camera.bottom *= shadowSize;
    light.shadow.camera.near = 0.01;
    light.shadow.camera.far = 100;

    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;

    return light;
  }
}

export default ImageExample;
