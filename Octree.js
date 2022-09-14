import * as THREE from 'three';

export class Octree {
    static _v = new THREE.Vector3();

    constructor(geometry, maxVerticesPerNode = 8) {
        const vertices = geometry.attributes.position;
        this.vertices = vertices;
        const num = vertices.count;
        this.bounds = new THREE.Box3().setFromBufferAttribute(vertices);
        this.subtree = { box: this.bounds, subtrees: [], indices: [] };
        if (vertices.count <= maxVerticesPerNode) {
            this.subtree.indices = Array(num).fill().map((_, i) => i);
            return;
        }

        const boxes = Octree.boxSplit(this.bounds);
        for (const b of boxes) {
            const t = { box: b, subtrees: [], indices: [] };
            for (let i = 0; i < num; ++i) {
                if (b.containsPoint(Octree._v.fromBufferAttribute(vertices, i))) {
                    t.indices.push(i);
                }
            }
            this.subtree.subtrees.push(t);
        }

        const trees = this.subtree.subtrees.slice();
        while (trees.length) {
            const curr = trees.at(-1);
            trees.pop();
            if (curr.indices.length > maxVerticesPerNode) {
                const boxes = Octree.boxSplit(curr.box);
                for (const b of boxes) {
                    const t = { box: b, subtrees: [], indices: [] };
                    for (const i of curr.indices) {
                        if (b.containsPoint(Octree._v.fromBufferAttribute(vertices, i))) {
                            t.indices.push(i);
                        }
                    }

                    curr.subtrees.push(t);
                    trees.push(t);
                }
            }
        }
    }

    search(position, radius) {
        const sphere = (position instanceof THREE.Sphere) ? position : new THREE.Sphere(position, radius);
        const ret = [];
        const trees = [this.subtree];
        while (trees.length) {
            const curr = trees.at(-1);
            trees.pop();
            if (curr.box.intersectsSphere(sphere)) {
                if (curr.subtrees.length) {
                    for (const t of curr.subtrees) {
                        trees.push(t);
                    }
                } else {
                    for (const i of curr.indices) {
                        if (sphere.containsPoint(Octree._v.fromBufferAttribute(this.vertices, i))) {
                            ret.push(i);
                        }
                    }
                }
            }
        }
        return ret;
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
