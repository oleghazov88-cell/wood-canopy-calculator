// Braces Geometry - All 4 Types
// Programmatic copies of GLB models without runtime loading
// Используем глобальный THREE (загружается через three.min.js)

export { createBraceR1 } from './partGeometry_r1.js';
export { createBraceR2 } from './partGeometry_r2.js';
export { createBraceR3 } from './partGeometry_r3.js';
export { createBraceR4 } from './partGeometry_r4.js';

/**
 * Create a brace mesh by type (async version with dynamic import)
 * @param {number} type - Brace type (1, 2, 3, or 4)
 * @returns {Promise<THREE.Mesh>} - Ready to use Three.js mesh
 * 
 * @example
 * import { createBrace } from './braceGeometry.js';
 * 
 * const brace = await createBrace(2); // Creates R2 type brace
 * scene.add(brace);
 */
export async function createBrace(type) {
    switch(type) {
        case 1:
            return (await import('./partGeometry_r1.js')).createBraceR1();
        case 2:
            return (await import('./partGeometry_r2.js')).createBraceR2();
        case 3:
            return (await import('./partGeometry_r3.js')).createBraceR3();
        case 4:
            return (await import('./partGeometry_r4.js')).createBraceR4();
        default:
            throw new Error(`Invalid brace type: ${type}. Must be 1, 2, 3, or 4.`);
    }
}

/**
 * Brace specifications
 */
export const BRACE_SPECS = {
    R1: {
        type: 1,
        name: 'Раскос тип 1 (простой)',
        vertices: 24,
        triangles: 36,
        size: '~2KB',
        glbSource: 'raskos/r1.glb'
    },
    R2: {
        type: 2,
        name: 'Раскос тип 2 (крестообразный)',
        vertices: 162,
        triangles: 100,
        size: '~16KB',
        glbSource: 'raskos/r2.glb'
    },
    R3: {
        type: 3,
        name: 'Раскос тип 3 (двойной)',
        vertices: 186,
        triangles: 108,
        size: '~19KB',
        glbSource: 'raskos/r3.glb'
    },
    R4: {
        type: 4,
        name: 'Раскос тип 4 (угловой)',
        vertices: 471,
        triangles: 252,
        size: '~49KB',
        glbSource: 'raskos/r4.glb'
    }
};

/**
 * Get all brace types info
 * @returns {Array} - Array of brace specifications
 */
export function getAllBraceSpecs() {
    return Object.values(BRACE_SPECS);
}

/**
 * Usage examples:
 * 
 * // Import specific brace
 * import { createBraceR2 } from './braceGeometry.js';
 * const brace = createBraceR2();
 * scene.add(brace);
 * 
 * // Import by type number
 * import { createBrace } from './braceGeometry.js';
 * const brace = await createBrace(3);
 * scene.add(brace);
 * 
 * // Get specifications
 * import { BRACE_SPECS } from './braceGeometry.js';
 * console.log(BRACE_SPECS.R2.vertices); // 162
 */

