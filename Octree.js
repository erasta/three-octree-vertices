import * as THREE from 'three';

export class Octree {
    constructor(geometry, maxVerticesPerNode = 8) {
        const vertices = geometry.attributes.position;
        this.bounds = new THREE.Box3().setFromBufferAttribute(vertices);
        this.subtree = new SubTree(this.bounds, vertices, Array.from({ length: vertices.count }).map((_, i) => i));

        const trees = [this.subtree];
        while (trees.length) {
            const curr = trees.at(-1);
            trees.pop();
            if (curr.indices.length > maxVerticesPerNode) {
                curr.split();
                for (const t of trees) {
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
                if (curr.indices.length) {
                    for (const i of curr.indices) {
                        if (sphere.containsPoint(SubTree._v.fromBufferAttribute(curr.vertices, i))) {
                            ret.push(i);
                        }
                    }
                } else {
                    for (const t of trees) {
                        trees.push(t);
                    }
                }
            }
        }
        return ret;
    }
}

class SubTree {
    static _v = new THREE.Vector3();
    constructor(box, vertices, indices) {
        this.box = box;
        this.vertices = vertices;
        this.subtrees = [];
        this.indices = indices.filter(i => {
            return box.containsPoint(SubTree._v.fromBufferAttribute(this.vertices, i));
        })
    }

    split() {
        const boxes = SubTree.boxSplit(this.box);
        for (const b of boxes) {
            this.subtrees.push(new SubTree(curr, this.vertices, this.indices));
        }
        this.indices = [];
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
                }
            }
        }
        return boxes;
    }
}
