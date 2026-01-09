/**
 * RoofSystem - Параметрическая система кровли для навесов
 * 
 * Реализует требования:
 * - Волна профнастила вдоль ската (Water flow direction)
 * - Визуализация через Normal Map
 * - Корректная обработка краев и конька
 * - Разделение геометрии для плоских зон под коньком
 * - Подконструкция (RoofSubstructure): обрешетка или сплошной настил
 */

class RoofSystem {
    constructor(scene, canopyGroup) {
        this.scene = scene;
        this.canopyGroup = canopyGroup;

        // Основная группа крыши
        this.roofGroup = new THREE.Group();
        this.roofGroup.name = 'roofSystem';

        // Подконструкция выделена в отдельную группу внутри roofGroup
        this.substructureGroup = new THREE.Group();
        this.substructureGroup.name = 'RoofSubstructure';
        this.roofGroup.add(this.substructureGroup);

        // Основное покрытие
        this.coverGroup = new THREE.Group();
        this.coverGroup.name = 'RoofCover';
        this.roofGroup.add(this.coverGroup);

        // Кэш материалов и текстур
        this.materialCache = new Map();
        this.textureCache = new Map();

        // Дефолтные параметры
        this.params = {
            length: 6.0,
            width: 4.0,
            height: 3.0,
            roofHeight: 1.0,
            roofType: 'var-2',
            roofingMaterial: 'metal-grandline',
            roofColor: 'amber',
            overhang: 0.1,
            baseHeight: 3.0
        };
    }

    /**
     * Основной метод обновления
     */
    update(params) {
        Object.assign(this.params, params);
        this.dispose();
        this.build();
    }

    /**
     * Очистка ресурсов
     */
    dispose() {
        // Очистка детей
        const clearGroup = (group) => {
            while (group.children.length > 0) {
                const child = group.children[0];
                group.remove(child);
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
        };

        clearGroup(this.substructureGroup);
        clearGroup(this.coverGroup);
        clearGroup(this.roofGroup); // Anything else directly in roofGroup

        // Re-add structure groups
        this.roofGroup.add(this.substructureGroup);
        this.roofGroup.add(this.coverGroup);
    }

    /**
     * Построение кровли
     */
    build() {
        if (this.canopyGroup && !this.canopyGroup.getObjectByName('roofSystem')) {
            this.canopyGroup.add(this.roofGroup);
        }

        const { length, width, roofHeight, roofType, roofingMaterial, roofColor, overhang, baseHeight } = this.params;

        // Габариты покрытия (с учетом свесов)
        const fullWidth = width + overhang * 2;
        const fullLength = length + overhang * 2;

        // --- 1. Подконструкция (Substructure) ---
        // Строится МЕЖДУ фермами (база) и покрытием.
        // Толщина подконструкции влияет на высоту посадки покрытия.
        const substructureHeight = this.buildSubstructure(width, length, baseHeight, roofHeight, roofType, roofingMaterial, fullWidth, fullLength);

        // --- 2. Покрытие (Cover) ---
        // Смещаем базу на толщину подконструкции
        const coverBaseHeight = baseHeight + substructureHeight;

        // Determine if material is wavy or profiled
        const isProfiled = (roofingMaterial === 'profiled-gl35r');
        const isWavy = (roofingMaterial === 'metal-grandline' || isProfiled);

        // "mode" argument for getMaterial
        const mode = isProfiled ? 'profiled' : (isWavy ? 'wavy' : (roofingMaterial === 'shinglas-sonata' ? 'shingle' : (roofingMaterial === 'polycarbonate-8mm' ? 'polycarb' : 'flat')));

        const mainMaterial = this.getMaterial(roofingMaterial, roofColor, mode, fullLength, fullWidth);
        const flatMaterial = this.getMaterial(roofingMaterial, roofColor, 'flat', fullLength, fullWidth);
        const thickness = this.getThickness(roofingMaterial);

        if (roofType === 'var-1') {
            this.buildSingleSlope(fullWidth, fullLength, coverBaseHeight, roofHeight, mainMaterial, thickness);
        } else {
            this.buildGableRoof(fullWidth, fullLength, coverBaseHeight, roofHeight, mainMaterial, flatMaterial, thickness);
        }

        // --- 3. Доборные элементы (Trims) ---
        // Они также поднимаются на уровень покрытия
        this.buildTrims(fullWidth, fullLength, coverBaseHeight, roofHeight, roofType, roofColor, roofingMaterial);
    }

    /**
     * Построение подсистемы (обрешетка/ОСП)
     * Возвращает толщину подсистемы (симитированную высоту подъема покрытия)
     */
    buildSubstructure(width, length, baseHeight, roofHeight, roofType, material, fullWidth, fullLength) {

        // Тип подсистемы
        let type = 'batten'; // обрешетка (default)
        if (material === 'shinglas-sonata') type = 'solid'; // ОСП
        if (material === 'polycarbonate-8mm') type = 'purlin'; // Частые прогоны

        const woodMat = this.getWoodMaterial();

        // Параметры
        let heightOffset = 0;

        if (type === 'solid') {
            // ОСП 12мм
            // Сплошная плоскость под покрытием.
            const thick = 0.012;
            const osbMat = new THREE.MeshStandardMaterial({ color: 0xE6C288, roughness: 0.8 }); // OSB color

            if (roofType === 'var-1') {
                this.buildSlopePlane(fullWidth, fullLength, baseHeight, roofHeight, osbMat, this.substructureGroup);
            } else {
                this.buildGablePlane(fullWidth, fullLength, baseHeight, roofHeight, osbMat, this.substructureGroup);
            }
            heightOffset = thick;

        } else if (type === 'batten' || type === 'purlin') {
            // Обрешетка (Metal/Profiled) или Лаги (Polycarb)
            // Обрешетка: брусок 50x50 или доска 100x25. Для металла шаг 350мм.
            // Перпендикулярно скату (вдоль длины навеса?? Нет.)
            // Скат - это направление, куда течет вода.
            // Обрешетка идет ПОПЕРЕК ската. (Горизонтально).

            // В нашей системе:
            // SingleSlope: Скат вдоль WIDTH (X axis).
            // Значит обрешетка вдоль LENGTH (Z axis).

            let step, barW, barH;

            if (type === 'batten') {
                // Под металлочерепицу/профнастил
                step = 0.35; // 350мм
                barW = 0.1; // 100мм доска
                barH = 0.025; // 25мм толщина
            } else {
                // Поликарбонат (Прогоны)
                // Частый шаг
                step = 0.5; // 500мм - 700мм
                barW = 0.05; // 50мм
                barH = 0.05; // 50мм (брусок) (или лаги если большие пролеты)
            }

            heightOffset = barH;

            // Генерируем планки
            // Для Односкатной (наклон вдоль X)
            // Планки параллельны Z. Идут с шагом по X.

            if (roofType === 'var-1') {
                const slopeL = Math.sqrt(width * width + roofHeight * roofHeight); // Длина ската
                // Учитываем свесы? Да, обрешетка под всем покрытием.

                // fullWidth это ширина проекции покрытия (X size).
                // fullLength это длина покрытия (Z size).

                // Скат идет вдоль fullWidth.
                // startX = -fullWidth/2. endX = +fullWidth/2.
                // Кол-во шагов
                const slopeProj = fullWidth;
                // Реальная длина ската = slopeProj / cos(alpha)
                // Кол-во рядов = Реальная длина / step.

                const angle = Math.atan2(roofHeight, width); // Угол наклона
                // Calculate max vertical extent of the rotated lath box relative to the base plane
                // Center is at barH/2 above slope. Box is rotated by angle.
                // Vertical extent above center = (w/2)*sin + (h/2)*cos
                // Total height required = barH/2 + vertical_extent + gap
                heightOffset = (barH / 2) * (1 + Math.cos(angle)) + (barW / 2) * Math.sin(angle) + 0.005;
                const count = Math.ceil(slopeProj / Math.cos(angle) / step) + 1; // +1 замыкающий

                // Создаем брусок длиной fullLength
                const geo = new THREE.BoxGeometry(barW, barH, fullLength);

                for (let i = 0; i < count; i++) {
                    // Позиция вдоль ската (local slope coord s)
                    // s идет от 0 до realSlopeLength
                    // Или проще интерполировать от start до end в 3D.
                    const t = i / (count > 1 ? count - 1 : 1);

                    // Координаты нижнего края ската и верхнего края.
                    // Low: x=-fullWidth/2, y=baseHeight
                    // High: x=+fullWidth/2, y=baseHeight + roofHeight
                    // НО! roofHeight задан для 'width' (между столбами), а мы берем fullWidth (со свесами).
                    // Надо пересчитать Y для свесов.

                    // slope ratio = roofHeight / width.
                    const k = roofHeight / width;

                    // Центр навеса x=0 -> y = baseHeight + roofHeight/2 ???
                    // Нет. baseHeight - это низ фермы? Нет, это опорная плоскость (мауэрлат).
                    // Single Slope: Low point at -width/2, High point at +width/2.
                    // Y(x) = baseHeight + (x - (-width/2)) * k ... если start at low.

                    const xStart = -fullWidth / 2;
                    const xEnd = fullWidth / 2;

                    // Интерполяция по X
                    const xPos = xStart + (xEnd - xStart) * t;

                    // Y relative to baseHeight?
                    // Если x= -width/2 -> h=0. Если x=width/2 -> h=roofHeight.
                    // Для xPos (который может быть за пределами столбов):
                    // h(x) = (x - (-width/2)) * k

                    // Ноль системы в центре. Low wall at -width/2. High wall at width/2.
                    const hAtX = (xPos - (-width / 2)) * k;

                    const yPos = baseHeight + hAtX;

                    // Создаем меш
                    const mesh = new THREE.Mesh(geo, woodMat);
                    mesh.position.set(xPos, yPos + barH / 2, 0); // barH/2 чтоб лежал НА baseHeight
                    mesh.rotation.z = angle; // Наклон
                    mesh.castShadow = true;
                    this.substructureGroup.add(mesh);
                }

            } else {
                // Gable (Двускатная)
                // Два ската.
                // Left: x от -fullWidth/2 до 0. Наклон вверх.
                // Right: x от fullWidth/2 до 0. Наклон вверх.

                const halfW = width / 2;
                const angle = Math.atan2(roofHeight, halfW);
                // Calculate max vertical extent of the rotated lath box relative to the base plane
                heightOffset = (barH / 2) * (1 + Math.cos(angle)) + (barW / 2) * Math.sin(angle) + 0.005;
                const k = roofHeight / halfW;

                const fullHalfW = fullWidth / 2;
                // Длина ската (проекция) = fullHalfW.
                // Real length = fullHalfW / cos(angle).
                const count = Math.ceil((fullHalfW / Math.cos(angle)) / step) + 1;

                const geo = new THREE.BoxGeometry(barW, barH, fullLength);

                const createSide = (sign) => {
                    // sign = -1 (left), 1 (right)
                    // x goes from sign*fullHalfW (eaves) to 0 (ridge).

                    for (let i = 1; i < count; i++) {
                        const t = i / (count > 1 ? count - 1 : 1);

                        // От карниза к коньку
                        // Добавляем технологический зазор 50мм от конька
                        const xLocal = 0.05 + (1 - t) * (fullHalfW - 0.05);
                        const xPos = sign * xLocal;

                        // Height. At center (x=0) -> roofHeight. At eaves -> ?
                        // y = baseHeight + roofHeight - (distance_from_center * k)
                        // y = baseHeight + roofHeight - xLocal * k;

                        const yPos = baseHeight + roofHeight - xLocal * k;

                        const mesh = new THREE.Mesh(geo, woodMat);
                        mesh.position.set(xPos, yPos + barH / 2, 0);

                        // Rotation.
                        // Left (x<0): As x increases, y increases. Angle +
                        // Right (x>0): As x increases, y decreases. Angle -
                        mesh.rotation.z = (sign < 0) ? angle : -angle;

                        this.substructureGroup.add(mesh);
                    }
                };

                createSide(-1); // Left
                createSide(1); // Right
            }
        }

        return heightOffset;
    }

    // Helper to build simple plane for OSB
    buildSlopePlane(width, length, baseHeight, roofHeight, material, group) {
        // Fix for Lath Protrusion (OSB Layer):
        // Calculate angle based on structural dimensions
        const structuralW = this.params.width;
        const structuralH = this.params.roofHeight;
        const angle = Math.atan2(structuralH, structuralW);

        // Calculate slope length over the FULL width (passed as 'width' argument)
        // Hypotenuse = width / cos(angle)
        const slopeLen = width / Math.cos(angle);

        // Create box (OSB sheet)
        const box = new THREE.BoxGeometry(slopeLen, 0.012, length);
        const mesh = new THREE.Mesh(box, material);

        // Center Position (X=0)
        // Midpoint of structure is at Y = baseHeight + structuralH / 2
        // Since the plane assumes center pivot at X=0, this matches.
        const centerY = baseHeight + structuralH / 2;

        mesh.position.set(0, centerY, 0);
        mesh.rotation.z = angle;
        group.add(mesh);
    }

    buildGablePlane(width, length, baseHeight, roofHeight, material, group) {
        // Two boxes
        const halfW = width / 2; // This is fullWidth/2
        // But slope geometry depends on params.width (span).
        // Recalculate slope length based on params.roofHeight/params.width.

        // Pitch k = roofHeight / (this.params.width/2)
        const k = this.params.roofHeight / (this.params.width / 2);

        const slopeLen = Math.sqrt((halfW) ** 2 + (halfW * k) ** 2); // Approx length of slope including overhang
        const angle = Math.atan(k);

        const box = new THREE.BoxGeometry(slopeLen, 0.012, length);

        // Left
        const left = new THREE.Mesh(box, material);
        // Position: Center of left slope.
        // X = -halfW/2
        // Y = baseHeight + (halfW * k) / 2?? No.

        // Ridge is at baseHeight + this.params.roofHeight.
        // Eave is at Ridge - fullWidth/2 * k.
        const ridgeY = baseHeight + this.params.roofHeight;
        const midY = ridgeY - (halfW * k) / 2;

        left.position.set(-halfW / 2, midY, 0);
        left.rotation.z = angle;
        group.add(left);

        // Right
        const right = new THREE.Mesh(box, material);
        right.position.set(halfW / 2, midY, 0);
        right.rotation.z = -angle;
        group.add(right);
    }

    getWoodMaterial() {
        if (this.materialCache.has('wood-batten')) return this.materialCache.get('wood-batten');
        const mat = new THREE.MeshStandardMaterial({ color: 0x8B5A2B, roughness: 0.9 });
        this.materialCache.set('wood-batten', mat);
        return mat;
    }

    // --- GEOMETRY BUILDERS (UPDATED TO USE COVER GROUP) ---

    buildSingleSlope(fullWidth, fullLength, baseHeight, roofHeight, material, thickness) {
        // Fix for Lath Protrusion:
        // We must calculate the slope based on the STRUCTURAL dimensions (post-to-post),
        // not the covering dimensions (which include overhangs).
        // Previously, we used 'roofHeight' over 'fullWidth', causing a shallower angle.

        const structuralWidth = this.params.width;
        const structuralRise = this.params.roofHeight;

        // Calculate the slope (tangent)
        const tanAlpha = structuralRise / structuralWidth;

        // Calculate the Y-position at the center of the canopy (x=0)
        // relative to the baseHeight (which is at the low post, x = -structuralWidth/2)
        // centerOffset = (structuralWidth / 2) * tanAlpha = structuralRise / 2
        const centerY = baseHeight + structuralRise / 2;

        // Now calculate the Y-positions at the edges of the COVERING (x = +/- fullWidth/2)
        const halfW = fullWidth / 2;
        const halfL = fullLength / 2;

        const yLow = centerY + (-halfW) * tanAlpha;
        const yHigh = centerY + (halfW) * tanAlpha;

        const geometry = new THREE.BufferGeometry();

        // Vertices
        // 0: Left-Back (Low side, -Z)
        // 1: Right-Back (High side, -Z)
        // 2: Left-Front (Low side, +Z)
        // 3: Right-Front (High side, +Z)

        // Note: Assuming Z axis is length.
        const vertices = [
            -halfW, yLow, -halfL,   // 0
            halfW, yHigh, -halfL,   // 1
            -halfW, yLow, halfL,    // 2
            halfW, yHigh, halfL     // 3
        ];

        // UVs
        // Map texture across the full width and length
        // To maintain aspect ratio or scale, we might need multipliers?
        // Standard UV mapping [0..1]
        const uvs = [
            0, 0,
            1, 0,
            0, 1,
            1, 1
        ];

        const indices = [0, 2, 1, 1, 2, 3];

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.coverGroup.add(mesh);
    }

    buildGableRoof(width, length, baseHeight, roofHeight, material, flatMaterial, thickness) {
        // ... (Same logic but add to this.coverGroup)
        const halfW = width / 2;
        const slopeLength = Math.sqrt(Math.pow(halfW, 2) + Math.pow(roofHeight, 2));
        const ridgeHeight = baseHeight + roofHeight;

        // Calculate roof angle
        const angle = Math.atan2(roofHeight, halfW);

        const flatZoneLen = 0.05;
        const mainSlopeLen = Math.max(0.1, slopeLength - flatZoneLen);
        const ratio = mainSlopeLen / slopeLength;

        const dx = halfW * ratio;
        const dy = roofHeight * ratio;

        const createPart = (isLeft, isFlatStrip) => {
            const geo = new THREE.BufferGeometry();
            const sign = isLeft ? -1 : 1;

            let xOuter = sign * halfW;
            let yOuter = baseHeight;
            let xInner = sign * (halfW - dx);
            let yInner = baseHeight + dy;
            let xRidge = 0;
            let yRidge = ridgeHeight;

            let p1, p2;

            if (!isFlatStrip) {
                p1 = { x: xOuter, y: yOuter, v: 0 };
                p2 = { x: xInner, y: yInner, v: ratio };
            } else {
                p1 = { x: xInner, y: yInner, v: ratio };
                p2 = { x: xRidge, y: yRidge, v: 1 };
            }

            const halfL = length / 2;

            const verts = [
                p1.x, p1.y, -halfL,
                p2.x, p2.y, -halfL,
                p1.x, p1.y, halfL,
                p2.x, p2.y, halfL
            ];

            const uvs = [0, p1.v, 0, p2.v, 1, p1.v, 1, p2.v];

            let inds;
            if (isLeft) {
                inds = [0, 2, 1, 1, 2, 3];
            } else {
                inds = [0, 1, 2, 1, 3, 2];
            }

            geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
            geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
            geo.setIndex(inds);
            geo.computeVertexNormals();

            return geo;
        };

        this.coverGroup.add(new THREE.Mesh(createPart(true, false), material));
        this.coverGroup.add(new THREE.Mesh(createPart(true, true), flatMaterial));
        this.coverGroup.add(new THREE.Mesh(createPart(false, false), material));
        this.coverGroup.add(new THREE.Mesh(createPart(false, true), flatMaterial));

        // Pass calculated angle and CORRECT color parameter
        // this.buildRidge(length, ridgeHeight, angle, this.params.roofColor);
    }

    // --- TRIMS & RIDGE ---

    buildRidge(length, height, angle, color) {
        // V-Shaped Ridge Cap
        const wingWidth = 0.15; // 150mm wing
        const thickness = 0.005; // 5mm thickness

        const shape = new THREE.Shape();

        // Calculate offsets based on angle to ensure it sits flat on the slope
        // Profile points relative to peak (0,0)

        const c = Math.cos(angle);
        const s = Math.sin(angle);

        // Outer wings
        const dx = wingWidth * c;
        const dy = -wingWidth * s;

        // Thickness normals
        const tx = thickness * s;
        const ty = -thickness * c;

        // Draw Shape (Clockwise)
        // Top Peak
        shape.moveTo(0, 0);
        // Right Outer Tip
        shape.lineTo(dx, dy);
        // Right Inner Tip (with thickness)
        shape.lineTo(dx - tx, dy + ty);
        // Inner Peak
        // Intersection of inner lines. 
        // Simple approx: peak moved down by thickness/cos(angle)
        shape.lineTo(0, -thickness / c);
        // Left Inner Tip
        shape.lineTo(-dx + tx, dy + ty);
        // Left Outer Tip
        shape.lineTo(-dx, dy);
        // Close to Top Peak
        shape.lineTo(0, 0);

        const extrudeSettings = {
            steps: 1,
            depth: length,
            bevelEnabled: false
        };

        const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        // Center on Z axis
        geom.translate(0, 0, -length / 2);

        const mat = this.getStandardMaterial(color);
        // Slightly shiny for metal look
        mat.roughness = 0.6;
        mat.metalness = 0.2;

        const mesh = new THREE.Mesh(geom, mat);

        // Lift slighly to avoid z-fighting with slopes
        mesh.position.set(0, height + 0.02, 0); // Lift 2cm
        mesh.castShadow = true;

        this.coverGroup.add(mesh);
    }

    buildTrims(width, length, baseHeight, roofHeight, roofType, color, materialType) {
        const mat = this.getStandardMaterial(color);
        mat.roughness = 0.6;
        mat.metalness = 0.2;
        mat.side = THREE.DoubleSide;

        const matRidge = mat.clone(); // Separate for ridge if needed

        // --- Config ---
        const trimW = 0.15; // Width (Face height)
        const trimT = 0.02; // Thickness
        const ridgeW = 0.20; // Ridge wing width

        // Dimensions (Full with overhangs)
        const halfW = width / 2;
        const halfL = length / 2;
        const ridgeH = baseHeight + roofHeight;
        const eaveH = baseHeight;

        // --- Helpers ---

        // Plane: { p: Vector3, n: Vector3 }
        const intersectLinePlane = (p1, p2, plane) => {
            const dir = new THREE.Vector3().subVectors(p2, p1);
            const denom = plane.n.dot(dir);
            if (Math.abs(denom) < 1e-9) return p1; // Parallel
            const t = plane.p.clone().sub(p1).dot(plane.n) / denom;
            return p1.clone().add(dir.multiplyScalar(t));
        };

        const createTrimMesh = (pStart, pEnd, w, t, upVec, planeStart, planeEnd, isRidge = false) => {
            const fwd = new THREE.Vector3().subVectors(pEnd, pStart).normalize();
            const right = new THREE.Vector3().crossVectors(fwd, upVec).normalize();
            const localUp = new THREE.Vector3().crossVectors(right, fwd).normalize();

            // Offsets relative to Anchor Point (Top-Outer edge)
            // Anchor is P. 
            // 0: Top-Outer (0,0)
            // 1: Top-Inner (-t * right)
            // 2: Bottom-Inner (-t * right - w * localUp)
            // 3: Bottom-Outer (- w * localUp)

            // For Ridge (V-shape wing), anchor is Ridge Peak.
            // If isRidge=true, we might need different offsets logic.
            // Let's assume standard board logic:
            // "Up" is Roof Normal. "Right" is Inward. 
            // So board is flat on roof.

            const offsets = [
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3().addScaledVector(right, -t),
                new THREE.Vector3().addScaledVector(right, -t).addScaledVector(localUp, -w),
                new THREE.Vector3().addScaledVector(localUp, -w)
            ];

            const vertices = [];
            // Start
            for (let i = 0; i < 4; i++) {
                const globalOff = pStart.clone().add(offsets[i]);
                vertices.push(intersectLinePlane(globalOff, globalOff.clone().add(fwd), planeStart));
            }
            // End
            for (let i = 0; i < 4; i++) {
                const globalOff = pEnd.clone().add(offsets[i]);
                vertices.push(intersectLinePlane(globalOff, globalOff.clone().add(fwd), planeEnd));
            }

            return this.createBoxFromCorners(vertices, isRidge ? matRidge : mat);
        };

        // --- Geometry Logic ---

        if (roofType === 'var-1') {
            // === SINGLE SLOPE ===
            // 4 Corners: BL, FL, BR, FR.

            // Fix for Lath Protrusion (Trims):
            // Use structural params for angle
            const structuralW = this.params.width;
            const structuralH = this.params.roofHeight;
            const angle = Math.atan2(structuralH, structuralW);

            // Slope Length over FULL width (passed as 'width')
            const slopeL = width / Math.cos(angle);
            const sideTrimLength = length - trimW * 2;

            // Center Y (Midpoint of structure at X=0)
            const centerY = baseHeight + structuralH / 2;

            const createBox = (w, h, l, x, y, z, rx, rz) => {
                const g = new THREE.BoxGeometry(w, h, l);
                const m = new THREE.Mesh(g, mat);
                m.position.set(x, y, z);
                m.rotation.x = rx; m.rotation.z = rz;
                m.castShadow = true;
                this.coverGroup.add(m);
            };

            // Rake (Side Trims) - Rotated by slope angle
            createBox(slopeL, 0.05, trimW, 0, centerY, -halfL + trimW / 2, 0, angle);
            createBox(slopeL, 0.05, trimW, 0, centerY, halfL - trimW / 2, 0, angle);

            // Eave (Low Side) - x = -halfW
            // Calculate height at -halfW
            const heightLow = centerY + (-halfW) * Math.tan(angle);
            createBox(trimW, 0.05, length, -halfW, heightLow, 0, 0, 0);

            // Eave (High Side) - x = halfW
            // Calculate height at halfW
            const heightHigh = centerY + (halfW) * Math.tan(angle);
            createBox(trimW, 0.05, length, halfW, heightHigh, 0, 0, 0);

        } else {
            // === GABLE ROOF (PROMPT LOGIC) ===

            // 1. Define Key Points based on Edge Lines
            // Coordinates: X (Width), Y (Height), Z (Length)
            // Front is +Z (halfL), Back is -Z (-halfL)

            const Z_F = halfL;
            const Z_B = -halfL;
            const X_L = -halfW;
            const X_R = halfW;
            const Y_Base = baseHeight;
            const Y_Ridge = ridgeH;

            // Corners
            const P_LF = new THREE.Vector3(X_L, Y_Base, Z_F); // Left Front
            const P_LB = new THREE.Vector3(X_L, Y_Base, Z_B); // Left Back
            const P_RF = new THREE.Vector3(X_R, Y_Base, Z_F); // Right Front
            const P_RB = new THREE.Vector3(X_R, Y_Base, Z_B); // Right Back

            // Ridge Ends
            const P_RidgeF = new THREE.Vector3(0, Y_Ridge, Z_F);
            const P_RidgeB = new THREE.Vector3(0, Y_Ridge, Z_B);

            // 2. Define Cut Planes
            // Vertical Plane at Front Gable: Normal (0,0,1) passing through P_RidgeF
            // Vertical Plane at Back Gable: Normal (0,0,-1) passing through P_RidgeB
            const planeGableF = { p: P_RidgeF, n: new THREE.Vector3(0, 0, 1) };
            const planeGableB = { p: P_RidgeB, n: new THREE.Vector3(0, 0, -1) };

            // Corner 45-deg Planes (Miter)
            // Left Front Corner: Bisector of Z axis and Rake Vector?
            // "45 deg in plan" -> Plane cuts (1,0,1).
            // Normal points OUTWARD from the corner? Or defines the cut surface?
            // Cut Plane keeps the "Inside".
            // Corner is at (X_L, Z_F). We want to keep Z < Z_F and X > X_L (for trim inside).
            // Miter plane normal should point roughly (-1, 0, 1) ?
            // Let's use specific bisector plane.
            // Eave Vector: (0,0,1). Rake projected: (1,0,0).
            // Bisector Normal: (-1, 0, 1).normalize().
            // Point: P_LF.
            const nLF = new THREE.Vector3(-1, 0, 1).normalize();
            const planeLF = { p: P_LF, n: nLF };

            const nLB = new THREE.Vector3(-1, 0, -1).normalize();
            const planeLB = { p: P_LB, n: nLB };

            const nRF = new THREE.Vector3(1, 0, 1).normalize();
            const planeRF = { p: P_RF, n: nRF };

            const nRB = new THREE.Vector3(1, 0, -1).normalize();
            const planeRB = { p: P_RB, n: nRB };

            // 3. Build Meshes

            // --- FASCIA (End Trims) ---
            // Left Fascia: P_LB to P_LF.
            // "Up" is vertical (0,1,0).
            // "Right" is Inward (1,0,0).
            // Cut Start: PlaneLB (keeps forward). Cut End: PlaneLF.
            // Adjust Cut Normals:
            // Intersect uses Plane Point & Normal. Ray intersects plane.
            // We need the plane that passes through the Corner Point.
            // For P_LB (Start), we want to cut 'shorter' or 'longer'?
            // We want the Miter. The plane passes exactly through corner.

            // Fascia Left
            const fasciaUp = new THREE.Vector3(0, 1, 0); // Vertical board
            this.coverGroup.add(createTrimMesh(P_LB, P_LF, trimW, trimT, fasciaUp, planeLB, planeLF));

            // Fascia Right (Back to Front)
            // P_RB to P_RF.
            // Up (0,1,0). Right (-1,0,0).
            const fasciaUpR = new THREE.Vector3(0, 1, 0);
            this.coverGroup.add(createTrimMesh(P_RB, P_RF, trimW, trimT, fasciaUpR, planeRB, planeRF));


            // --- WIND TRIMS (Rake) ---
            // Left Slope Front
            // From P_LF to P_RidgeF.
            // Up: Perpendicular to Slope.
            // Slope Vector: (Width/2, Height, 0).
            // Normal: (-Height, Width/2, 0).
            const slopeL = new THREE.Vector3(halfW, roofHeight, 0).normalize(); // from Left to Ridge
            const normalL = new THREE.Vector3(-roofHeight, halfW, 0).normalize();

            // "Up" for the trim board:
            // Often Wind Trim is a board standing 90deg to roof surface.
            // So Up = NormalL.
            // This matches visual logic.

            // Cut Start: Plane LF (Miter with Fascia).
            // Cut End: Vertical Plane at Ridge?
            // At Apex: Left Rake and Right Rake meet.
            // They meet at X=0. Cut Plane is X=0 Normal(1,0,0)?
            // OR Vertical Cut at Apex?
            // "Standard: Vertical Cut (Plumb Cut)".
            // Plane: {p: P_RidgeF, n: (1, 0, 0)} for Left side (keeps x < 0).
            const planeApex = { p: P_RidgeF, n: new THREE.Vector3(1, 0, 0) }; // Cuts Right side off
            const planeApexR = { p: P_RidgeF, n: new THREE.Vector3(-1, 0, 0) }; // Cuts Left side off

            // Wind Left Front (P_LF -> P_RidgeF)
            // Note: P_LF is at Eave. P_RidgeF is at Ridge.
            // This segment is at Z = +L/2.
            // The board generally faces OUT (+Z). 
            // So "Right" vector (thickness) should point -Z?
            // createTrimMesh calculates Right = Fwd x Up.
            // Fwd = Slope (X+, Y+). Up = Normal (X-, Y+).
            // Right = (Z+).
            // So Thickness goes towards +Z (Outside).
            // We want thickness INWARD (-Z).
            // So we need Up to be reversed? Or swap start/end?
            // Let's Flip Up Vector: normalL.negate().
            // Or just P_RidgeF -> P_LF?

            // Let's use P_RidgeF -> P_LF (Downwards).
            // Fwd: (-X, -Y). Up: Normal (X-, Y+).
            // Right = Fwd x Up = (-Z). Correct (Inward).

            // Cut Start (Ridge): Plane Apex.
            // Cut End (Eave): Plane LF.

            this.coverGroup.add(createTrimMesh(P_RidgeF, P_LF, trimW, trimT, normalL, planeApex, planeLF));

            // Wind Left Back (P_RidgeB -> P_LB)
            // Fwd: (-X, -Y). Up: Normal. Right: (+Z).
            // We want Inward (-Z)? No, Back is at -L/2. Inward is +Z.
            // So Right (+Z) is correct.
            this.coverGroup.add(createTrimMesh(P_RidgeB, P_LB, trimW, trimT, normalL, planeApex, planeLB));


            // Wind Right Front (P_RidgeF -> P_RF)
            // Slope Right: (-X, -Y) from Ridge.
            // Normal Right: (Height, Width/2, 0).
            const normalR = new THREE.Vector3(roofHeight, halfW, 0).normalize();
            // Fwd: (X+, -Y). Up: NormalR.
            // Right: Fwd x Up.
            // Fwd=(1, -1, 0). Up=(1, 1, 0). Cross = (0, 0, 1) -> +Z (Outward).
            // We want Inward (-Z).
            // So use Up = normalR.negate(). OR Fwd = P_RF -> P_RidgeF (Upwards).

            // Use Upwards: P_RF -> P_RidgeF.
            // Fwd: (-X, +Y). Up: NormalR.
            // Cross: -Z (Inward). Correct.

            this.coverGroup.add(createTrimMesh(P_RF, P_RidgeF, trimW, trimT, normalR, planeRF, planeApexR));

            // Wind Right Back (P_RB -> P_RidgeB)
            // Inward is +Z.
            // P_RB -> P_RidgeB. Cross: +Z. Correct.
            // Lift slightly to match L-profile logic if needed, but side board usually flushes with end.
            this.coverGroup.add(createTrimMesh(P_RB, P_RidgeB, trimW, trimT, normalR, planeRB, planeApexR));





            // --- RIDGE CAP (INDEPENDENT ELEMENT) ---
            // Implements Logic: "Ridge covers the gap between slopes".
            // Geometry: V-shape profile along the Ridge Line.
            // Vertices:
            // Ridge Line P_RidgeB -> P_RidgeF.
            // Left Wing End: Adjusted by slope angle.
            // Right Wing End: Adjusted by slope angle.

            const ridgeWingW = 0.15; // 150mm wing
            const ridgeLift = 0.03; // Lift above roof surface (30mm)

            // Calculate Wing Offsets based on Slope Logic
            // Left Slope Vector (Down): (-halfW, -roofHeight, 0)
            // Left Slope Vector normalized:
            const vecSlopeL = new THREE.Vector3(-halfW, -roofHeight, 0).normalize();
            // Right Slope Vector (Down): (halfW, -roofHeight, 0)
            const vecSlopeR = new THREE.Vector3(halfW, -roofHeight, 0).normalize();

            // Wing Edge Vectors (extension from Ridge)
            const wingVecL = vecSlopeL.multiplyScalar(ridgeWingW);
            const wingVecR = vecSlopeR.multiplyScalar(ridgeWingW);

            // Ridge Apex Line (lifted)
            const PA = P_RidgeB.clone(); PA.y += ridgeLift;
            const PB = P_RidgeF.clone(); PB.y += ridgeLift;

            // Build Profile Shape? Or simple quads.
            // Simple Quads for Left and Right Wings.

            // Left Wing Quad:
            // 1. PA
            // 2. PB
            // 3. PB + wingVecL
            // 4. PA + wingVecL
            const pL1 = PA;
            const pL2 = PB;
            const pL3 = PB.clone().add(wingVecL);
            const pL4 = PA.clone().add(wingVecL);

            // Right Wing Quad:
            // 1. PA
            // 2. PB
            // 3. PB + wingVecR
            // 4. PA + wingVecR
            const pR1 = PA;
            const pR2 = PB;
            const pR3 = PB.clone().add(wingVecR);
            const pR4 = PA.clone().add(wingVecR);

            // Create Geometry with thickness?
            // User requested "Independent Mesh". A simple thin plate with double side is best for "Sheet Metal".
            // But we can add thickness for realism (Box).

            const createWingMesh = (p1, p2, p3, p4) => {
                const center = new THREE.Vector3().addVectors(p1, p3).multiplyScalar(0.5);
                // Length is Z distance. Width is Wing Width. Thickness 3mm.
                const len = p1.distanceTo(p2);
                const wid = p1.distanceTo(p4); // Approx

                // Orient geometry?
                // Easier: Use BufferGeometry with exact vertices and small thickness extrude?
                // Or just simple Plane for visual correctness as "Sheet".
                // Let's use Plane for cleanliness and performance, 2-sided.
                const geo = new THREE.BufferGeometry();
                const verts = [
                    p1.x, p1.y, p1.z,
                    p2.x, p2.y, p2.z,
                    p4.x, p4.y, p4.z,
                    p2.x, p2.y, p2.z,
                    p3.x, p3.y, p3.z,
                    p4.x, p4.y, p4.z
                ];
                // UVs
                const uvs = [
                    0, 1, 0, 0, 1, 1,
                    0, 0, 1, 0, 1, 1
                ];

                geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
                geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
                geo.computeVertexNormals();

                const m = new THREE.Mesh(geo, matRidge);
                m.castShadow = true;
                return m;
            };

            this.coverGroup.add(createWingMesh(pL1, pL2, pL3, pL4));
            this.coverGroup.add(createWingMesh(pR1, pR2, pR3, pR4));


        }
    }

    createBoxFromCorners(verts, material) {
        // verts: [0..7]
        // 0-3: Start Ring (TopOut, TopIn, BotIn, BotOut)
        // 4-7: End Ring

        // Ensure we have 8 vertices
        if (verts.length !== 8) return null;

        const indices = [
            0, 1, 2, 0, 2, 3, // Start
            4, 7, 6, 4, 6, 5, // End
            0, 4, 5, 0, 5, 1, // High (Top)
            2, 6, 7, 2, 7, 3, // Low (Bottom)
            3, 7, 4, 3, 4, 0, // Out (Face)
            1, 5, 6, 1, 6, 2  // In (Back)
        ];

        const pos = [];
        verts.forEach(v => pos.push(v.x, v.y, v.z));

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setIndex(indices);
        geo.computeVertexNormals();

        const mesh = new THREE.Mesh(geo, material);
        mesh.castShadow = true;
        return mesh;
    }

    // --- MATERIALS ---

    getThickness(type) {
        switch (type) {
            case 'shinglas-sonata': return 0.003;
            case 'polycarbonate-8mm': return 0.008;
            case 'metal-grandline':
            case 'profiled-gl35r':
            default: return 0.001;
        }
    }

    getStandardMaterial(colorName) {
        const colors = {
            'amber': 0x5B3A29, // RAL 8017 Chocolate Brown (Adjusted for gamma)
            'blue': 0x1B2F4B,  // RAL 5005 Signal Blue (Deep)
            'green': 0x0F3B2C, // RAL 6005 Moss Green
            'red': 0x742028,   // RAL 3005 Wine Red
            'gray': 0x3E4246   // RAL 7024 Graphite Grey
        };
        return new THREE.MeshStandardMaterial({
            color: colors[colorName] || 0x888888,
            roughness: 0.5
        });
    }

    getMaterial(type, colorName, mode, roofLength, roofWidth) {
        const color = (this.getStandardMaterial(colorName)).color;
        const key = `${type}-${colorName}-${mode}-${roofLength}`;
        if (this.materialCache.has(key)) return this.materialCache.get(key);

        let mat;
        if (mode === 'polycarb') {
            // ПРЕМИУМ МАТЕРИАЛ ДЛЯ ПОЛИКАРБОНАТА (Стекло/Пластик)
            mat = new THREE.MeshPhysicalMaterial({
                color: color, // Базовый оттенок
                metalness: 0.1,
                roughness: 0.05, // Гладкий
                transmission: 0.90, // Пропускает 90% света (прозрачность)
                opacity: 1.0, // Сам объект существует (не альфа-блендинг, а преломление)
                transparent: true, // Нужно для корректного рендера теней/просветов
                thickness: 0.01, // 10мм толщина для рефракции
                ior: 1.586, // Коэффициент преломления поликарбоната
                clearcoat: 1.0, // Лаковое покрытие
                clearcoatRoughness: 0.0,
                side: THREE.DoubleSide
            });
        } else if (mode === 'shingle') {
            const tex = this.getShingleTexture();
            const norm = this.getShingleNormalMap();
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            norm.wrapS = THREE.RepeatWrapping;
            norm.wrapT = THREE.RepeatWrapping;
            const repU = roofLength / 2.0;
            const repV = (roofWidth || 4.0) / 2.0;
            tex.repeat.set(repU, repV);
            norm.repeat.set(repU, repV);

            // ГИБКАЯ ЧЕРЕПИЦА (Камень/Битум)
            mat = new THREE.MeshStandardMaterial({
                color: color,
                map: tex,
                normalMap: norm,
                roughness: 0.95, // Почти матовая
                metalness: 0.0, // Не металл
                side: THREE.DoubleSide
            });
        } else if (mode === 'wavy') {
            // МЕТАЛЛОЧЕРЕПИЦА (Глянцевый металл) - Monterrey
            const normalMap = this.getWaveNormalMap();
            normalMap.wrapS = THREE.RepeatWrapping;
            normalMap.wrapT = THREE.RepeatWrapping;

            // X (U) -> Length -> Step (350mm)
            // Y (V) -> Width -> Wave (183mm)
            // Ensure inputs are valid
            const len = roofLength || 1.0;
            const wid = roofWidth || 1.0;

            normalMap.repeat.set(len / 0.183, wid / 0.35);

            mat = new THREE.MeshStandardMaterial({
                color: color,
                normalMap: normalMap,
                normalScale: new THREE.Vector2(2, 2), // Выраженный рельеф
                roughness: 0.4, // Реалистичный полуглянец
                metalness: 0.6, // Крашеный металл
                envMapIntensity: 0.9,
                side: THREE.DoubleSide,
                flatShading: false
            });
        } else if (mode === 'profiled') {
            // ПРОФНАСТИЛ (Полуматовый металл)
            const normalMap = this.getProfiledNormalMap();
            normalMap.wrapS = THREE.RepeatWrapping;
            normalMap.wrapT = THREE.RepeatWrapping;
            // GL-35 pitch approx 200mm ?? Let's use 0.15m (150mm) for more dense look or 0.2m.
            // User wants "more relieved".
            normalMap.repeat.set(roofLength / 0.2, 1);

            mat = new THREE.MeshStandardMaterial({
                color: color,
                normalMap: normalMap,
                normalScale: new THREE.Vector2(3, 3), // Strong relief
                roughness: 0.35, // Чуть более шершавый чем черепица
                metalness: 0.6,
                envMapIntensity: 1.0,
                side: THREE.DoubleSide
            });
        } else {
            mat = new THREE.MeshStandardMaterial({
                color: color,
                roughness: 0.5,
                metalness: 0.3,
                side: THREE.DoubleSide
            });
        }
        this.materialCache.set(key, mat);
        return mat;
    }

    getShingleTexture() {
        if (this.textureCache.has('shingle-diff')) return this.textureCache.get('shingle-diff');
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#cccccc';
        ctx.fillRect(0, 0, size, size);
        const rows = 8;
        const cols = 4;
        const h = size / rows;
        const w = size / cols;
        for (let y = 0; y < rows; y++) {
            const off = (y % 2) * w / 2;
            for (let x = -1; x <= cols; x++) {
                ctx.fillStyle = (Math.random() > 0.5) ? '#eec' : '#dde';
                ctx.globalAlpha = 0.1 + Math.random() * 0.1;
                ctx.fillStyle = '#000000';
                ctx.fillRect(x * w + off + 2, y * h + 2, w - 4, h - 4);
            }
        }
        ctx.globalAlpha = 1.0;
        const tex = new THREE.CanvasTexture(canvas);
        this.textureCache.set('shingle-diff', tex);
        return tex;
    }

    getShingleNormalMap() {
        if (this.textureCache.has('shingle-norm')) return this.textureCache.get('shingle-norm');
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#8080ff';
        ctx.fillRect(0, 0, size, size);
        const rows = 8;
        const h = size / rows;
        for (let y = 1; y < rows; y++) {
            ctx.fillStyle = '#8040ff';
            ctx.fillRect(0, y * h - 4, size, 4);
        }
        const tex = new THREE.CanvasTexture(canvas);
        this.textureCache.set('shingle-norm', tex);
        return tex;
    }

    // УЛУЧШЕННАЯ КАРТА НОРМАЛЕЙ ДЛЯ МЕТАЛЛОЧЕРЕПИЦЫ (MONTERREY)
    getMetalTileNormalMap() {
        if (this.textureCache.has('tile-normal')) return this.textureCache.get('tile-normal');

        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        const imgData = ctx.createImageData(size, size);

        // Генерируем нормали для одной "ячейки" или тайлим паттерн.
        // Чтобы текстура была бесшовной, мы генерируем паттерн так, 
        // чтобы он повторялся. Лучше генерировать процедурный паттерн на лету.
        // Здесь мы создаем базовый тайл и будем его повторять через texture.repeat.
        // Но так как repeat.set задает кол-во повторений, текстура должна содержать 1 период волны и 1 период шага?
        // Или лучше генерировать процедурный шум.
        // Давайте сгенерируем 1 период волны (X) и 1 период шага (Y).

        for (let y = 0; y < size; y++) {
            // Y is V (Slope Direction) -> Needs STEPS
            const v = y / size;

            // STEP PROFILE (Along Slope)
            let dy = 0;
            if (v > 0.85) {
                // Sharp drop
                dy = 15.0 * (v - 0.85) / 0.15;
            } else {
                dy = -0.5; // Slight ramp
            }

            for (let x = 0; x < size; x++) {
                // X is U (Horizontal Direction) -> Needs WAVES
                const u = x / size;

                // WAVE PROFILE (Sine)
                const dx = -Math.sin(u * Math.PI * 2) * 5.0;

                // Normal Packing
                const nx = dx;
                const ny = dy;
                const nz = 1.0;

                const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

                const r = Math.floor(((nx / len) + 1) * 127.5);
                const g = Math.floor(((ny / len) + 1) * 127.5);
                const b = Math.floor(((nz / len) + 1) * 127.5);

                const idx = (y * size + x) * 4;
                imgData.data[idx] = r;
                imgData.data[idx + 1] = g;
                imgData.data[idx + 2] = b;
                imgData.data[idx + 3] = 255;
            }
        }






        ctx.putImageData(imgData, 0, 0);
        const tex = new THREE.CanvasTexture(canvas);
        this.textureCache.set('tile-normal', tex);
        return tex;
    }

    getWaveNormalMap() {
        return this.getMetalTileNormalMap();
    }

    /**
     * Процедурная normal map для профнастила GL-35 (трапециевидный профиль)
     */
    getProfiledNormalMap() {
        if (this.textureCache.has('profiled-normal')) return this.textureCache.get('profiled-normal');
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        const imgData = ctx.createImageData(size, size);

        for (let x = 0; x < size; x++) {
            const u = x / size;
            let slope;

            const phase = (u * 2 * Math.PI) % (2 * Math.PI);
            if (phase < Math.PI * 0.15) {
                slope = 12;
            } else if (phase < Math.PI * 0.4) {
                slope = 0;
            } else if (phase < Math.PI * 0.55) {
                slope = -12;
            } else {
                slope = 0;
            }

            const len = Math.sqrt(slope * slope + 1);
            const nx = -slope / len;
            const nz = 1 / len;
            const r = Math.floor((nx + 1) * 127.5);
            // Green channel is neutral (flat Y) because profiled sheet has no steps along Y
            const g = 128;
            const b = Math.floor((nz + 1) * 127.5);

            for (let y = 0; y < size; y++) {
                const idx = (y * size + x) * 4;
                imgData.data[idx] = r;
                imgData.data[idx + 1] = g;
                imgData.data[idx + 2] = b;
                imgData.data[idx + 3] = 255;
            }
        }
        ctx.putImageData(imgData, 0, 0);
        const tex = new THREE.CanvasTexture(canvas);
        this.textureCache.set('profiled-normal', tex);
        return tex;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = RoofSystem;
}
