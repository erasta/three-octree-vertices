import * as THREE from 'three';
import { RoomEnvironment } from 'three/addon/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addon/controls/OrbitControls.js';

class App {
    go() {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(2.5, 5, 35);

        const renderer = new THREE.WebGLRenderer();
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enabled = false;
        scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment()).texture;
        scene.background = new THREE.Color(0x888888);

        // let geometry = new THREE.BoxGeometry(10, 10, 10);
        let geometry = new THREE.TorusKnotGeometry(10, 2, 1000, 1000, 3, 5);
        this.mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 'green' }));
        scene.add(this.mesh);

        function animate() {
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
        };

        animate();

        return this;
    }
}

window.app = new App().go();