/**
 * OrbitControls Wrapper для Three.js
 * Простая обертка для управления камерой мышью
 */

THREE.OrbitControls = function (camera, domElement) {
    this.camera = camera;
    this.domElement = domElement || document;
    
    this.enabled = true;
    this.target = new THREE.Vector3();
    
    // Event listeners
    this._listeners = {};
    
    this.minDistance = 0;
    this.maxDistance = Infinity;
    
    this.minPolarAngle = 0;
    this.maxPolarAngle = Math.PI;
    
    this.enableDamping = false;
    this.dampingFactor = 0.05;
    
    this.enableZoom = true;
    this.zoomSpeed = 1.0;
    
    this.enableRotate = true;
    this.rotateSpeed = 1.0;
    
    this.enablePan = true;
    this.panSpeed = 1.0;
    
    this.autoRotate = false;
    this.autoRotateSpeed = 2.0;
    
    this.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN
    };
    
    // Внутренние переменные
    var scope = this;
    var spherical = new THREE.Spherical();
    var sphericalDelta = new THREE.Spherical();
    var scale = 1;
    var panOffset = new THREE.Vector3();
    var zoomChanged = false;
    
    var rotateStart = new THREE.Vector2();
    var rotateEnd = new THREE.Vector2();
    var rotateDelta = new THREE.Vector2();
    
    var panStart = new THREE.Vector2();
    var panEnd = new THREE.Vector2();
    var panDelta = new THREE.Vector2();
    
    var dollyStart = new THREE.Vector2();
    var dollyEnd = new THREE.Vector2();
    var dollyDelta = new THREE.Vector2();
    
    var STATE = {
        NONE: -1,
        ROTATE: 0,
        DOLLY: 1,
        PAN: 2,
        TOUCH_ROTATE: 3,
        TOUCH_PAN: 4,
        TOUCH_DOLLY_PAN: 5
    };
    
    var state = STATE.NONE;
    
    // API
    
    this.update = function () {
        var offset = new THREE.Vector3();
        var quat = new THREE.Quaternion().setFromUnitVectors(camera.up, new THREE.Vector3(0, 1, 0));
        var quatInverse = quat.clone().invert();
        var lastPosition = new THREE.Vector3();
        var lastQuaternion = new THREE.Quaternion();
        
        return function update() {
            var position = scope.camera.position;
            
            offset.copy(position).sub(scope.target);
            offset.applyQuaternion(quat);
            
            spherical.setFromVector3(offset);
            
            if (scope.autoRotate && state === STATE.NONE) {
                rotateLeft(getAutoRotationAngle());
            }
            
            if (scope.enableDamping) {
                spherical.theta += sphericalDelta.theta * scope.dampingFactor;
                spherical.phi += sphericalDelta.phi * scope.dampingFactor;
            } else {
                spherical.theta += sphericalDelta.theta;
                spherical.phi += sphericalDelta.phi;
            }
            
            spherical.phi = Math.max(scope.minPolarAngle, Math.min(scope.maxPolarAngle, spherical.phi));
            spherical.makeSafe();
            
            spherical.radius *= scale;
            spherical.radius = Math.max(scope.minDistance, Math.min(scope.maxDistance, spherical.radius));
            
            if (scope.enableDamping === true) {
                scope.target.addScaledVector(panOffset, scope.dampingFactor);
            } else {
                scope.target.add(panOffset);
            }
            
            offset.setFromSpherical(spherical);
            offset.applyQuaternion(quatInverse);
            
            position.copy(scope.target).add(offset);
            scope.camera.lookAt(scope.target);
            
            if (scope.enableDamping === true) {
                sphericalDelta.theta *= (1 - scope.dampingFactor);
                sphericalDelta.phi *= (1 - scope.dampingFactor);
                panOffset.multiplyScalar(1 - scope.dampingFactor);
            } else {
                sphericalDelta.set(0, 0, 0);
                panOffset.set(0, 0, 0);
            }
            
            scale = 1;
            
            if (zoomChanged ||
                lastPosition.distanceToSquared(scope.camera.position) > 0.0001 ||
                8 * (1 - lastQuaternion.dot(scope.camera.quaternion)) > 0.0001) {
                
                lastPosition.copy(scope.camera.position);
                lastQuaternion.copy(scope.camera.quaternion);
                zoomChanged = false;
                
                return true;
            }
            
            return false;
        };
    }();
    
    this.dispose = function () {
        scope.domElement.removeEventListener('contextmenu', onContextMenu, false);
        scope.domElement.removeEventListener('mousedown', onMouseDown, false);
        scope.domElement.removeEventListener('wheel', onMouseWheel, false);
        scope.domElement.removeEventListener('touchstart', onTouchStart, false);
        scope.domElement.removeEventListener('touchend', onTouchEnd, false);
        scope.domElement.removeEventListener('touchmove', onTouchMove, false);
        document.removeEventListener('mousemove', onMouseMove, false);
        document.removeEventListener('mouseup', onMouseUp, false);
    };
    
    // Event dispatcher methods
    this.addEventListener = function (type, listener) {
        if (this._listeners[type] === undefined) {
            this._listeners[type] = [];
        }
        
        if (this._listeners[type].indexOf(listener) === -1) {
            this._listeners[type].push(listener);
        }
    };
    
    this.hasEventListener = function (type, listener) {
        if (this._listeners[type] === undefined) return false;
        return this._listeners[type].indexOf(listener) !== -1;
    };
    
    this.removeEventListener = function (type, listener) {
        if (this._listeners[type] === undefined) return;
        
        var index = this._listeners[type].indexOf(listener);
        
        if (index !== -1) {
            this._listeners[type].splice(index, 1);
        }
    };
    
    this.dispatchEvent = function (event) {
        if (this._listeners[event.type] === undefined) return;
        
        var array = this._listeners[event.type].slice(0);
        
        for (var i = 0, l = array.length; i < l; i++) {
            array[i].call(this, event);
        }
    };
    
    // Внутренние функции
    
    function getAutoRotationAngle() {
        return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;
    }
    
    function getZoomScale() {
        return Math.pow(0.95, scope.zoomSpeed);
    }
    
    function rotateLeft(angle) {
        sphericalDelta.theta -= angle;
    }
    
    function rotateUp(angle) {
        sphericalDelta.phi -= angle;
    }
    
    var panLeft = function () {
        var v = new THREE.Vector3();
        
        return function panLeft(distance, objectMatrix) {
            v.setFromMatrixColumn(objectMatrix, 0);
            v.multiplyScalar(-distance);
            panOffset.add(v);
        };
    }();
    
    var panUp = function () {
        var v = new THREE.Vector3();
        
        return function panUp(distance, objectMatrix) {
            v.setFromMatrixColumn(objectMatrix, 1);
            v.multiplyScalar(distance);
            panOffset.add(v);
        };
    }();
    
    var pan = function () {
        var offset = new THREE.Vector3();
        
        return function pan(deltaX, deltaY) {
            var element = scope.domElement;
            
            if (scope.camera.isPerspectiveCamera) {
                var position = scope.camera.position;
                offset.copy(position).sub(scope.target);
                var targetDistance = offset.length();
                
                targetDistance *= Math.tan((scope.camera.fov / 2) * Math.PI / 180.0);
                
                panLeft(2 * deltaX * targetDistance / element.clientHeight, scope.camera.matrix);
                panUp(2 * deltaY * targetDistance / element.clientHeight, scope.camera.matrix);
            }
        };
    }();
    
    function dollyOut(dollyScale) {
        scale /= dollyScale;
    }
    
    function dollyIn(dollyScale) {
        scale *= dollyScale;
    }
    
    function handleMouseDownRotate(event) {
        rotateStart.set(event.clientX, event.clientY);
    }
    
    function handleMouseDownDolly(event) {
        dollyStart.set(event.clientX, event.clientY);
    }
    
    function handleMouseDownPan(event) {
        panStart.set(event.clientX, event.clientY);
    }
    
    function handleMouseMoveRotate(event) {
        rotateEnd.set(event.clientX, event.clientY);
        rotateDelta.subVectors(rotateEnd, rotateStart).multiplyScalar(scope.rotateSpeed);
        
        var element = scope.domElement;
        
        rotateLeft(2 * Math.PI * rotateDelta.x / element.clientHeight);
        rotateUp(2 * Math.PI * rotateDelta.y / element.clientHeight);
        
        rotateStart.copy(rotateEnd);
        
        scope.update();
    }
    
    function handleMouseMoveDolly(event) {
        dollyEnd.set(event.clientX, event.clientY);
        dollyDelta.subVectors(dollyEnd, dollyStart);
        
        if (dollyDelta.y > 0) {
            dollyOut(getZoomScale());
        } else if (dollyDelta.y < 0) {
            dollyIn(getZoomScale());
        }
        
        dollyStart.copy(dollyEnd);
        
        scope.update();
    }
    
    function handleMouseMovePan(event) {
        panEnd.set(event.clientX, event.clientY);
        panDelta.subVectors(panEnd, panStart).multiplyScalar(scope.panSpeed);
        
        pan(panDelta.x, panDelta.y);
        
        panStart.copy(panEnd);
        
        scope.update();
    }
    
    function handleMouseWheel(event) {
        if (event.deltaY < 0) {
            dollyIn(getZoomScale());
        } else if (event.deltaY > 0) {
            dollyOut(getZoomScale());
        }
        
        scope.update();
        scope.dispatchEvent({ type: 'change' });
    }
    
    function handleTouchStartRotate(event) {
        if (event.touches.length == 1) {
            rotateStart.set(event.touches[0].pageX, event.touches[0].pageY);
        } else {
            var x = 0.5 * (event.touches[0].pageX + event.touches[1].pageX);
            var y = 0.5 * (event.touches[0].pageY + event.touches[1].pageY);
            rotateStart.set(x, y);
        }
    }
    
    function handleTouchStartPan(event) {
        if (event.touches.length == 1) {
            panStart.set(event.touches[0].pageX, event.touches[0].pageY);
        } else {
            var x = 0.5 * (event.touches[0].pageX + event.touches[1].pageX);
            var y = 0.5 * (event.touches[0].pageY + event.touches[1].pageY);
            panStart.set(x, y);
        }
    }
    
    function handleTouchStartDollyPan(event) {
        if (scope.enableZoom) {
            var dx = event.touches[0].pageX - event.touches[1].pageX;
            var dy = event.touches[0].pageY - event.touches[1].pageY;
            var distance = Math.sqrt(dx * dx + dy * dy);
            dollyStart.set(0, distance);
        }
        
        if (scope.enablePan) {
            var x = 0.5 * (event.touches[0].pageX + event.touches[1].pageX);
            var y = 0.5 * (event.touches[0].pageY + event.touches[1].pageY);
            panStart.set(x, y);
        }
    }
    
    function handleTouchMoveRotate(event) {
        if (event.touches.length == 1) {
            rotateEnd.set(event.touches[0].pageX, event.touches[0].pageY);
        } else {
            var x = 0.5 * (event.touches[0].pageX + event.touches[1].pageX);
            var y = 0.5 * (event.touches[0].pageY + event.touches[1].pageY);
            rotateEnd.set(x, y);
        }
        
        rotateDelta.subVectors(rotateEnd, rotateStart).multiplyScalar(scope.rotateSpeed);
        
        var element = scope.domElement;
        
        rotateLeft(2 * Math.PI * rotateDelta.x / element.clientHeight);
        rotateUp(2 * Math.PI * rotateDelta.y / element.clientHeight);
        
        rotateStart.copy(rotateEnd);
    }
    
    function handleTouchMovePan(event) {
        if (event.touches.length == 1) {
            panEnd.set(event.touches[0].pageX, event.touches[0].pageY);
        } else {
            var x = 0.5 * (event.touches[0].pageX + event.touches[1].pageX);
            var y = 0.5 * (event.touches[0].pageY + event.touches[1].pageY);
            panEnd.set(x, y);
        }
        
        panDelta.subVectors(panEnd, panStart).multiplyScalar(scope.panSpeed);
        
        pan(panDelta.x, panDelta.y);
        
        panStart.copy(panEnd);
    }
    
    function handleTouchMoveDollyPan(event) {
        if (scope.enableZoom) {
            var dx = event.touches[0].pageX - event.touches[1].pageX;
            var dy = event.touches[0].pageY - event.touches[1].pageY;
            var distance = Math.sqrt(dx * dx + dy * dy);
            
            dollyEnd.set(0, distance);
            dollyDelta.set(0, Math.pow(dollyEnd.y / dollyStart.y, scope.zoomSpeed));
            
            dollyOut(dollyDelta.y);
            
            dollyStart.copy(dollyEnd);
        }
        
        if (scope.enablePan) {
            var x = 0.5 * (event.touches[0].pageX + event.touches[1].pageX);
            var y = 0.5 * (event.touches[0].pageY + event.touches[1].pageY);
            
            panEnd.set(x, y);
            panDelta.subVectors(panEnd, panStart).multiplyScalar(scope.panSpeed);
            
            pan(panDelta.x, panDelta.y);
            
            panStart.copy(panEnd);
        }
    }
    
    // Event handlers
    
    function onMouseDown(event) {
        if (scope.enabled === false) return;
        
        event.preventDefault();
        
        scope.dispatchEvent({ type: 'start' });
        
        switch (event.button) {
            case 0:
                if (scope.mouseButtons.LEFT === THREE.MOUSE.ROTATE) {
                    handleMouseDownRotate(event);
                    state = STATE.ROTATE;
                } else if (scope.mouseButtons.LEFT === THREE.MOUSE.PAN) {
                    handleMouseDownPan(event);
                    state = STATE.PAN;
                }
                break;
            
            case 1:
                if (scope.mouseButtons.MIDDLE === THREE.MOUSE.DOLLY) {
                    handleMouseDownDolly(event);
                    state = STATE.DOLLY;
                }
                break;
            
            case 2:
                if (scope.mouseButtons.RIGHT === THREE.MOUSE.PAN) {
                    handleMouseDownPan(event);
                    state = STATE.PAN;
                } else if (scope.mouseButtons.RIGHT === THREE.MOUSE.ROTATE) {
                    handleMouseDownRotate(event);
                    state = STATE.ROTATE;
                }
                break;
        }
        
        if (state !== STATE.NONE) {
            document.addEventListener('mousemove', onMouseMove, false);
            document.addEventListener('mouseup', onMouseUp, false);
        }
    }
    
    function onMouseMove(event) {
        if (scope.enabled === false) return;
        
        event.preventDefault();
        
        switch (state) {
            case STATE.ROTATE:
                handleMouseMoveRotate(event);
                scope.dispatchEvent({ type: 'change' });
                break;
            
            case STATE.DOLLY:
                handleMouseMoveDolly(event);
                scope.dispatchEvent({ type: 'change' });
                break;
            
            case STATE.PAN:
                handleMouseMovePan(event);
                scope.dispatchEvent({ type: 'change' });
                break;
        }
    }
    
    function onMouseUp(event) {
        if (scope.enabled === false) return;
        
        scope.dispatchEvent({ type: 'end' });
        
        document.removeEventListener('mousemove', onMouseMove, false);
        document.removeEventListener('mouseup', onMouseUp, false);
        
        state = STATE.NONE;
    }
    
    function onMouseWheel(event) {
        if (scope.enabled === false || scope.enableZoom === false || state !== STATE.NONE) return;
        
        event.preventDefault();
        event.stopPropagation();
        
        handleMouseWheel(event);
    }
    
    function onTouchStart(event) {
        if (scope.enabled === false) return;
        
        event.preventDefault();
        
        scope.dispatchEvent({ type: 'start' });
        
        switch (event.touches.length) {
            case 1:
                handleTouchStartRotate(event);
                state = STATE.TOUCH_ROTATE;
                break;
            
            case 2:
                handleTouchStartDollyPan(event);
                state = STATE.TOUCH_DOLLY_PAN;
                break;
            
            default:
                state = STATE.NONE;
        }
    }
    
    function onTouchMove(event) {
        if (scope.enabled === false) return;
        
        event.preventDefault();
        event.stopPropagation();
        
        switch (event.touches.length) {
            case 1:
                handleTouchMoveRotate(event);
                scope.dispatchEvent({ type: 'change' });
                break;
            
            case 2:
                handleTouchMoveDollyPan(event);
                scope.dispatchEvent({ type: 'change' });
                break;
            
            default:
                state = STATE.NONE;
        }
    }
    
    function onTouchEnd(event) {
        if (scope.enabled === false) return;
        
        scope.dispatchEvent({ type: 'end' });
        
        state = STATE.NONE;
    }
    
    function onContextMenu(event) {
        if (scope.enabled === false) return;
        
        event.preventDefault();
    }
    
    // Добавляем обработчики событий
    scope.domElement.addEventListener('contextmenu', onContextMenu, false);
    scope.domElement.addEventListener('mousedown', onMouseDown, false);
    scope.domElement.addEventListener('wheel', onMouseWheel, false);
    
    scope.domElement.addEventListener('touchstart', onTouchStart, false);
    scope.domElement.addEventListener('touchend', onTouchEnd, false);
    scope.domElement.addEventListener('touchmove', onTouchMove, false);
    
    // Инициализация
    this.update();
};

