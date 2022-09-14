import * as THREE from 'three';
import { RoomEnvironment } from 'three/addon/environments/RoomEnvironment.js';
// import { OctreeHelper } from 'three/addon/helpers/OctreeHelper.js';
import { OctreeHelper } from '../libs/OctreeHelper.js'; // added an update() method
import { OrbitControls } from 'three/addon/controls/OrbitControls.js';
import { Octree } from '../Octree.js';
import { GUI } from 'three/addon/libs/lil-gui.module.min.js';

class App {
    go() {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 5, 35);

        const renderer = new THREE.WebGLRenderer();
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);
        scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment()).texture;
        scene.background = new THREE.Color(0x888888);
        const controls = new OrbitControls(camera, renderer.domElement);

        const start = Date.now();
        // const geometry = new THREE.BoxGeometry(10, 10, 10);
        const geometry = new THREE.TorusKnotGeometry(10, 2, 100, 100, 3, 5).toNonIndexed();
        this.mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 'green', side: THREE.DoubleSide, transparent: true, opacity: 0.5 }));
        scene.add(this.mesh);
        console.log('created geometry', Date.now() - start, 'with vertices', geometry.attributes.position.count);

        this.compareIndices(this.weldByOctree(geometry), this.weldByHashtable(geometry));

        let octree = new Octree(geometry);
        const octreeHelper = new OctreeHelper(octree);
        scene.add(octreeHelper);

        geometry.computeBoundingBox();
        const size = geometry.boundingBox.getSize(new THREE.Vector3());
        const points = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 'red', sizeAttenuation: true, size: 0.2 }));
        scene.add(points);
        const newVertices = [];
        const interval = setInterval(() => {
            for (let i = 0; i < 100; ++i) {
                const v = new THREE.Vector3().random().multiply(size).add(geometry.boundingBox.min);
                octree.addVertex(v);
                newVertices.push(v);
            }
            octreeHelper.update();
            points.geometry.dispose();
            points.geometry.setFromPoints(newVertices);
        }, 500);

        const gui = new GUI();
        this.stopCreatingPoints = () => { clearInterval(interval); gui.controllers[0].disable(); };
        gui.add(this, 'stopCreatingPoints');

        function animate() {
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
        };

        animate();

        return this;
    }

    weldByOctree(geometry, threshold = 1e-4) {
        console.log('Starting octree');
        const start = Date.now();
        const octree = new Octree(geometry);
        console.log('created octree', Date.now() - start);
        const verticesToIndices = octree.mergeVertices(threshold);
        console.log('searched octree', Date.now() - start);
        return verticesToIndices;
    }

    weldByHashtable(geometry, threshold = 1e-4) {
        const verticesToIndices = []

        console.log('Starting hashtable');
        const start = Date.now();

        const hashToVertex = {}
        const v = new THREE.Vector3();
        for (let i = 0; i < geometry.attributes.position.count; ++i) {
            v.fromBufferAttribute(geometry.attributes.position, i);
            const hash = `${~~(v.x / threshold)},${~~(v.y / threshold)},${~~(v.z / threshold)}`;
            if (hash in hashToVertex) {
                verticesToIndices.push(hashToVertex[hash]);
            } else {
                hashToVertex[hash] = i;
                verticesToIndices.push(i);
            }
        }

        console.log('searched hashtable', Date.now() - start);
        return verticesToIndices;
    }

    compareIndices(indices1, indices2) {
        const num = Math.max(indices1.length, indices2.length);
        console.log('wrong indices:', Array(num).fill().map((_, i) => i).filter(i => indices1[i] !== indices2[i]));
    }
}

window.app = new App().go();