import * as THREE from 'three';
import { RoomEnvironment } from 'three/addon/environments/RoomEnvironment.js';
import { Octree } from '../Octree.js';

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

        const start = Date.now();
        // const geometry = new THREE.BoxGeometry(10, 10, 10);
        const geometry = new THREE.TorusKnotGeometry(10, 2, 100, 100, 3, 5).toNonIndexed();
        this.mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 'green' }));
        scene.add(this.mesh);
        console.log('created geometry', Date.now() - start, 'with vertices', geometry.attributes.position.count);

        this.compareIndices(this.weldByOctree(geometry), this.weldByHashtable(geometry));

        function animate() {
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
        };

        animate();

        return this;
    }

    weldByOctree(geometry, threshold = 1e-4) {
        const sphere = new THREE.Sphere(undefined, threshold);
        const verticesToIndices = []

        console.log('Starting octree');
        const start = Date.now();

        const octree = new Octree(geometry);
        console.log('created octree', Date.now() - start);

        for (let i = 0; i < geometry.attributes.position.count; ++i) {
            if (verticesToIndices[i] === undefined) {
                sphere.center.fromBufferAttribute(geometry.attributes.position, i);
                const found = octree.search(sphere);
                const newIndex = Math.min(...found);
                found.forEach(ind => verticesToIndices[ind] = newIndex);
            }
        }

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
        const wrongs = Array.from({ length: num }).filter((_, i) => indices1[i] !== indices2[i]);
        if (wrongs.length) {
            console.log('found wrong indexing', wrongs);
        } else {
            console.log('all good');
        }
    }
}

window.app = new App().go();