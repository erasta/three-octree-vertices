import * as THREE from 'three';

export class Octree {
    static _v = new THREE.Vector3();

    constructor(vertices, maxVerticesPerNode = 8) {
        if (vertices instanceof THREE.BufferGeometry) {
            vertices = vertices.attributes.position.array;
        }
        this.maxVerticesPerNode = maxVerticesPerNode;
        this.vertices = vertices;
        const num = vertices.length / 3;
        this.bounds = new THREE.Box3().setFromArray(vertices);
        this.subTrees = [{ box: this.bounds, subTrees: [], indices: [] }];
        if (num <= maxVerticesPerNode) {
            this.subTrees[0].indices = Array(num).fill().map((_, i) => i);
            return;
        }

        const boxes = Octree.boxSplit(this.bounds);
        for (const b of boxes) {
            const t = { box: b, subTrees: [], indices: [] };
            for (let i = 0; i < num; ++i) {
                if (b.containsPoint(Octree._v.fromArray(vertices, i * 3))) {
                    t.indices.push(i);
                }
            }
            this.subTrees[0].subTrees.push(t);
        }

        const trees = this.subTrees[0].subTrees.slice();
        while (trees.length) {
            const curr = trees.at(-1);
            trees.pop();
            if (curr.indices.length > maxVerticesPerNode) {
                this.splitCell(curr);
                trees.push(...curr.subTrees);
            }
        }
    }

    addVertex(v) {
        const newIndex = this.vertices.length / 3;
        if (!this.vertices.push){
            this.vertices = Array.from(this.vertices);
        }
        this.vertices.push(v.x, v.y, v.z);
        let curr = this.subTrees[0];
        const found = false;
        while (curr.subTrees.length) {
            for (const t of curr.subTrees) {
                if (t.box.containsPoint(v)) {
                    curr = t;
                    break;
                }
            }
        }
        curr.indices.push(newIndex);
        if (curr.indices.length > this.maxVerticesPerNode) {
            this.splitCell(curr);
        }
    }

    search(position, radius) {
        const sphere = (position instanceof THREE.Sphere) ? position : new THREE.Sphere(position, radius);
        const ret = [];
        const trees = this.subTrees.slice();
        while (trees.length) {
            const curr = trees.at(-1);
            trees.pop();
            if (curr.box.intersectsSphere(sphere)) {
                if (curr.subTrees.length) {
                    for (const t of curr.subTrees) {
                        trees.push(t);
                    }
                } else {
                    for (const i of curr.indices) {
                        if (sphere.containsPoint(Octree._v.fromArray(this.vertices, i * 3))) {
                            ret.push(i);
                        }
                    }
                }
            }
        }
        return ret;
    }

    mergeVertices(threshold = 1e-4) {
        const sphere = new THREE.Sphere(undefined, threshold);
        const verticesToIndices = []
        for (let i = 0, il = this.vertices.length / 3; i < il; ++i) {
            if (verticesToIndices[i] === undefined) {
                sphere.center.fromArray(this.vertices, i * 3);
                const found = this.search(sphere);
                const newIndex = Math.min(...found);
                found.forEach(ind => verticesToIndices[ind] = newIndex);
            }
        }
        return verticesToIndices;
    }

    splitCell(cell) {
        const boxes = Octree.boxSplit(cell.box);
        for (const b of boxes) {
            const t = { box: b, subTrees: [], indices: [] };
            for (const i of cell.indices) {
                if (b.containsPoint(Octree._v.fromArray(this.vertices, i * 3))) {
                    t.indices.push(i);
                }
            }

            cell.subTrees.push(t);
        }
        cell.indices = [];
    }

    static boxSplit(box) {
        const boxes = [];
        const halfsize = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
        for (let x = 0; x < 2; x++) {
            for (let y = 0; y < 2; y++) {
                for (let z = 0; z < 2; z++) {
                    const curr = new THREE.Box3();
                    curr.min.set(x, y, z).multiply(halfsize).add(box.min);
                    curr.max.copy(curr.min).add(halfsize);
                    boxes.push(curr);
                }
            }
        }
        return boxes;
    }
}
