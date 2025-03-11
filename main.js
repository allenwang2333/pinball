import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { RapierPhysics } from 'three/addons/physics/RapierPhysics.js';
import Stats from 'three/addons/libs/stats.module.js';

let scene, camera, renderer, ball;
let leftFlipper, rightFlipper;
let ballVelocity = new THREE.Vector3(0, 0, 0);
let controls;
let gui, stats;
let settings = {
    difficulty: 1
}

const GRAVITY = -0.001;
const FLIPPER_SPEED = Math.PI/18;
const FLIPPER_DEFAULT_ANGLE = -Math.PI/4;
const BOUNCE_FACTOR = 0.8;
const DEFAULT_TILT = Math.PI / 3;
const MAX_FLIPER_ANGLE = 0;
let leftFlipperAngle = FLIPPER_DEFAULT_ANGLE;
let rightFlipperAngle = FLIPPER_DEFAULT_ANGLE;

let leftFlipperAxis = new THREE.Vector4(0, 0, 0, 1);
let curLeftFlipperAngle = FLIPPER_DEFAULT_ANGLE;
const INITIAL_LEFT_FLIPPER_POSITION = new THREE.Vector3();
let isLeftFlipper = false;

let rightFlipperAxis = new THREE.Vector4(0, 0, 0, 1);
let curRightFlipperAngle = FLIPPER_DEFAULT_ANGLE;
const INITIAL_RIGHT_FLIPPER_POSITION = new THREE.Vector3();
let isRightFlipper = false;

// Objects for collision detection
let bumpers = [];
let walls = [];
let speedBumps = [];

// AABB helper functions
function createAABB(object) {
    const box = new THREE.Box3().setFromObject(object);
    return box;
}

function checkAABBCollision(box1, box2) {
    return box1.intersectsBox(box2);
}

class BoardShader {
    vertexShader() {
        return `
        uniform sampler2D uTexture;
        varying vec2 vUv;
        varying vec3 vPosition;
        void main() {
            vUv = uv;
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
        `;
    }

    fragmentShader() {
        return `
        uniform sampler2D uTexture;
        varying vec2 vUv;
        varying vec3 vPosition;
        void main() {    
            vec2 newUv = vUv * 10.0;
            vec4 tex_color = texture2D(uTexture, newUv);
            gl_FragColor = tex_color;
        }
        `;
    }
}

function init() {
    // Scene setup
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    controls = new OrbitControls(camera, renderer.domElement);

    stats = new Stats();
    document.body.appendChild( stats.dom );

    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 10, 0);
    scene.add(directionalLight);

    // Camera position
    camera.position.set(0, 30, 15);
    camera.lookAt(0, 0, 0);

    createPlayField();
    createFlippers();
    createBumpers();
    createSpeedBump();
    createBall();
    createButtons();

    // Event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
}

function createButtons() {
    gui = new GUI();
    const folder = gui.addFolder('Game Settings');
    folder.add(settings, 'difficulty', 1, 5).onChange((value) => {
        settings.difficulty = value;
        console.log('Difficulty set to: ', value);
    });

    folder.open();


}

function rotationMatrixX(angle) {
    return new THREE.Matrix4().set(
        1, 0, 0, 0,
        0, Math.cos(angle), -Math.sin(angle), 0,
        0, Math.sin(angle), Math.cos(angle), 0,
        0, 0, 0, 1
    );
}

function rotationMatrixY(theta) {
	return new THREE.Matrix4().set(
     Math.cos(theta), 0, Math.sin(theta), 0,
                   0, 1,               0, 0,
    -Math.sin(theta), 0, Math.cos(theta), 0,
                   0, 0,               0, 1
	);
}

function rotationMatrixZ(theta) {
	return new THREE.Matrix4().set(
    Math.cos(theta), -Math.sin(theta), 0, 0,
    Math.sin(theta),  Math.cos(theta), 0, 0,
                  0,               0,  1, 0,
                  0,               0,  0, 1
	);
}

function translationMatrix(tx, ty, tz) {
	return new THREE.Matrix4().set(
		1, 0, 0, tx,
		0, 1, 0, ty,
		0, 0, 1, tz,
		0, 0, 0, 1
	);
}

function createPlayField() {
    // Main table
    const tableGeometry = new THREE.PlaneGeometry(20, 30);
    // snooker table texture find it online
    const tableTexture = new THREE.TextureLoader().load('assets/board.jpg');
    tableTexture.wrapS = THREE.RepeatWrapping;
    tableTexture.wrapT = THREE.RepeatWrapping;
    tableTexture.repeat.set( 2, 3 );
    const tableMaterial = new THREE.MeshPhongMaterial( {map: tableTexture } );

    const table = new THREE.Mesh(tableGeometry, tableMaterial);
    table.applyMatrix4(rotationMatrixX(-DEFAULT_TILT));
    scene.add(table);

    // Walls
    const wallGeometry = new THREE.BoxGeometry(1, 2, 30);
    const wallTexture = new THREE.TextureLoader().load('assets/wood.jpg');
    wallTexture.wrapS = THREE.RepeatWrapping;
    wallTexture.wrapT = THREE.RepeatWrapping;
    const wallMaterial = new THREE.MeshPhongMaterial({ map: wallTexture });

    const leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
    leftWall.applyMatrix4(rotationMatrixX(Math.PI/2 - DEFAULT_TILT));
    leftWall.position.set(-10, 0, 0);
    scene.add(leftWall);
    walls.push(leftWall);

    const rightWall = new THREE.Mesh(wallGeometry, wallMaterial);
    rightWall.applyMatrix4(rotationMatrixX(Math.PI/2 - DEFAULT_TILT));
    rightWall.position.set(10, 0, 0);
    scene.add(rightWall);
    walls.push(rightWall);

    const topWall = new THREE.Mesh(new THREE.BoxGeometry(20, 2, 1), wallMaterial);
    topWall.position.set(0, 0, -14.5);
    topWall.applyMatrix4(rotationMatrixX(Math.PI/2 - DEFAULT_TILT));
    scene.add(topWall);
    walls.push(topWall);
}

function createFlippers() {
    const flipperGeometry = new THREE.BoxGeometry(5, 0.2, 0.3);
    const flipperMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    
    // Left flipper
    leftFlipper = new THREE.Mesh(flipperGeometry, flipperMaterial);
    leftFlipper.position.set(-4, 0.25, 8);
    leftFlipper.applyMatrix4(rotationMatrixX((Math.PI/2 - DEFAULT_TILT)));
    
    let initLeft = leftFlipper.position.clone();
    INITIAL_LEFT_FLIPPER_POSITION.set(initLeft.x, initLeft.y, initLeft.z);
    scene.add(leftFlipper);
    
    leftFlipperAxis.set(initLeft.x-2.5, initLeft.y, initLeft.z, 1);
    leftFlipperAxis.applyMatrix4(rotationMatrixX(Math.PI/2 - DEFAULT_TILT));
    
    resetLeftFlipper();

    // Right flipper
    rightFlipper = new THREE.Mesh(flipperGeometry, flipperMaterial);
    rightFlipper.position.set(4, 0.25, 8);
    rightFlipper.applyMatrix4(rotationMatrixX((Math.PI/2 - DEFAULT_TILT)));

    let initRight = rightFlipper.position.clone();
    INITIAL_RIGHT_FLIPPER_POSITION.set(initRight.x, initRight.y, initRight.z);
    scene.add(rightFlipper);

    rightFlipperAxis.set(initRight.x+2.5, initRight.y, initRight.z, 1);
    rightFlipperAxis.applyMatrix4(rotationMatrixX(Math.PI/2 - DEFAULT_TILT));
    
    resetRightFlipper();
}

function createBumpers() {
    const bumperGeometry = new THREE.CylinderGeometry(1, 1, 2);
    const bumperMaterial = new THREE.MeshPhongMaterial({ color: 0x0000ff });
    
    // Create bumpers
    const bumper1 = new THREE.Mesh(bumperGeometry, bumperMaterial);
    bumper1.position.set(0, 0.5, -5);
    bumper1.applyMatrix4(rotationMatrixX((Math.PI/2 - DEFAULT_TILT)));
    scene.add(bumper1);
    bumpers.push(bumper1);

    const bumper2 = new THREE.Mesh(bumperGeometry, bumperMaterial);
    bumper2.position.set(-3, 0.5, -8);
    bumper2.applyMatrix4(rotationMatrixX((Math.PI/2 - DEFAULT_TILT)));
    scene.add(bumper2);
    bumpers.push(bumper2);

    const bumper3 = new THREE.Mesh(bumperGeometry, bumperMaterial);
    bumper3.position.set(3, 0.5, -8);
    bumper3.applyMatrix4(rotationMatrixX((Math.PI/2 - DEFAULT_TILT)));
    scene.add(bumper3);
    bumpers.push(bumper3);
}

function createSpeedBump() {
    const speedBumpGeometry = new THREE.PlaneGeometry(4.5, 1.2);
    const speedBumpMaterial = new THREE.MeshPhongMaterial({ color: 0xffff20});

    // Create speedBump
    const speedBump1 = new THREE.Mesh(speedBumpGeometry, speedBumpMaterial);
    const speedBump2 = new THREE.Mesh(speedBumpGeometry, speedBumpMaterial);
    speedBump1.position.set(-4, -1, 0.001);
    speedBump2.position.set(4, -1, 0.001);
    speedBump1.applyMatrix4(rotationMatrixZ(-Math.PI/6));
    speedBump2.applyMatrix4(rotationMatrixZ(Math.PI/6));
    speedBump1.applyMatrix4(rotationMatrixX(-DEFAULT_TILT));
    speedBump2.applyMatrix4(rotationMatrixX(-DEFAULT_TILT));
    
    scene.add(speedBump1);
    scene.add(speedBump2);
    
    speedBumps.push(speedBump1);
    speedBumps.push(speedBump2);
}

function createBall() {
    const ballGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const ballMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
    ball = new THREE.Mesh(ballGeometry, ballMaterial);
    ball.position.set(0, 5, 0);
    scene.add(ball);
}

function handleKeyDown(event) {
    if (event.key === 'z' || event.key === 'Z') {
        leftFlipperAngle = Math.max(leftFlipperAngle - FLIPPER_SPEED, MAX_FLIPER_ANGLE);
        isLeftFlipper = true;
    }

    if (event.key === '/' || event.key === '?') {
        rightFlipperAngle = Math.min(rightFlipperAngle + FLIPPER_SPEED, MAX_FLIPER_ANGLE);
        isRightFlipper = true;
    }
}

function handleKeyUp(event) {
    if (event.key === 'z' || event.key === 'Z') {
        leftFlipperAngle = FLIPPER_DEFAULT_ANGLE;
        curLeftFlipperAngle = FLIPPER_DEFAULT_ANGLE;
        resetLeftFlipper();
        isLeftFlipper = false;
    }
    
    if (event.key === '/' || event.key === '?') {
        rightFlipperAngle = FLIPPER_DEFAULT_ANGLE;
        curRightFlipperAngle = FLIPPER_DEFAULT_ANGLE;
        resetRightFlipper();
        isRightFlipper = false;
    }
}

function updatePhysics() {
    // Apply gravity
    ballVelocity.y += GRAVITY;
    
    // Store previous position for collision resolution
    const previousPosition = ball.position.clone();
    
    // Update position based on velocity
    ball.position.add(ballVelocity);
    
    // Create AABB for the ball
    const ballAABB = createAABB(ball);
    
    // Ground collision (table surface)
    if (ball.position.y < 0.5) {
        ball.position.y = 0.5;
        ballVelocity.y = -ballVelocity.y * BOUNCE_FACTOR;
    }
    
    // Wall collisions using AABB
    for (let wall of walls) {
        const wallAABB = createAABB(wall);
        if (checkAABBCollision(ballAABB, wallAABB)) {
            // Determine which side of the wall was hit
            const wallCenter = new THREE.Vector3();
            wallAABB.getCenter(wallCenter);
            const direction = ball.position.clone().sub(wallCenter).normalize();
            
            if (Math.abs(direction.z) > Math.abs(direction.x)) {
                ballVelocity.z = -ballVelocity.z * BOUNCE_FACTOR;
                if (direction.z > 0) {
                    ball.position.z = wallAABB.max.z + 0.5;
                } else {
                    ball.position.z = wallAABB.min.z - 0.5;
                }
            } 
            else {
                ballVelocity.x = -ballVelocity.x * BOUNCE_FACTOR;
                if (direction.x > 0) {
                    ball.position.x = wallAABB.max.x + 0.5;
                } else {
                    ball.position.x = wallAABB.min.x - 0.5;
                }
            }
        }
    }
    
    // Bumper collisions using AABB
    for (let bumper of bumpers) {
        const bumperAABB = createAABB(bumper);
        if (checkAABBCollision(ballAABB, bumperAABB)) {
            // Calculate reflection vector
            const bumperCenter = new THREE.Vector3();
            bumperAABB.getCenter(bumperCenter);
            
            // Direction from bumper to ball
            const normal = ball.position.clone().sub(bumperCenter).normalize();
            
            // Apply impulse in the normal direction (bouncing away from bumper)
            const impulseStrength = 0.2; // Adjust for desired bounce effect
            ballVelocity.x = normal.x * impulseStrength;
            ballVelocity.z = normal.z * impulseStrength;
            ballVelocity.y += 0.1; // Add upward impulse
            
            // Add score or effects here
        }
    }
    
    // Flipper collisions using AABB
    const leftFlipperAABB = createAABB(leftFlipper);
    if (checkAABBCollision(ballAABB, leftFlipperAABB) && isLeftFlipper) {
        ballVelocity.y = 0.3;
        ballVelocity.x = -0.15;
        ballVelocity.z = -0.2;
    }
    
    const rightFlipperAABB = createAABB(rightFlipper);
    if (checkAABBCollision(ballAABB, rightFlipperAABB) && isRightFlipper) {
        ballVelocity.y = 0.3;
        ballVelocity.x = 0.15;
        ballVelocity.z = -0.2;
    }
    
    // Speed bump collisions
    for (let speedBump of speedBumps) {
        const speedBumpAABB = createAABB(speedBump);
        if (checkAABBCollision(ballAABB, speedBumpAABB)) {
            ballVelocity.y += 0.05;
            ballVelocity.z -= 0.1;
        }
    }
    
    // Apply velocity dampening (friction)
    ballVelocity.x *= 0.99;
    ballVelocity.z *= 0.99;
    
    // Reset ball if it falls off bottom
    if (ball.position.z > 15) {
        ball.position.set(0, 5, 0);
        ballVelocity.set(0, 0, 0);
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateLeftFlipper() {
    if (curLeftFlipperAngle < MAX_FLIPER_ANGLE && isLeftFlipper) {
        leftFlipper.applyMatrix4(translationMatrix(-leftFlipperAxis.x, -leftFlipperAxis.y, -leftFlipperAxis.z));
        leftFlipper.applyMatrix4(rotationMatrixY(Math.PI/2));
        leftFlipper.applyMatrix4(rotationMatrixZ(-DEFAULT_TILT));
        leftFlipper.applyMatrix4(rotationMatrixX(FLIPPER_SPEED));
        leftFlipper.applyMatrix4(rotationMatrixZ(DEFAULT_TILT));
        leftFlipper.applyMatrix4(rotationMatrixY(- Math.PI/2));
        leftFlipper.applyMatrix4(translationMatrix(leftFlipperAxis.x, leftFlipperAxis.y, leftFlipperAxis.z));
        curLeftFlipperAngle += FLIPPER_SPEED;
    }
}

function updateRightFlipper() {
    if (curRightFlipperAngle < MAX_FLIPER_ANGLE && isRightFlipper) {
        rightFlipper.applyMatrix4(translationMatrix(-rightFlipperAxis.x, -rightFlipperAxis.y, -rightFlipperAxis.z));
        rightFlipper.applyMatrix4(rotationMatrixY(Math.PI/2));
        rightFlipper.applyMatrix4(rotationMatrixZ(-DEFAULT_TILT));
        rightFlipper.applyMatrix4(rotationMatrixX(-FLIPPER_SPEED));
        rightFlipper.applyMatrix4(rotationMatrixZ(DEFAULT_TILT));
        rightFlipper.applyMatrix4(rotationMatrixY(- Math.PI/2));
        rightFlipper.applyMatrix4(translationMatrix(rightFlipperAxis.x, rightFlipperAxis.y, rightFlipperAxis.z));
        curRightFlipperAngle += FLIPPER_SPEED;
    }
}

function resetLeftFlipper() {
    leftFlipper.position.set(INITIAL_LEFT_FLIPPER_POSITION.x, INITIAL_LEFT_FLIPPER_POSITION.y, INITIAL_LEFT_FLIPPER_POSITION.z);
    leftFlipper.rotation.y = 0;
    leftFlipper.applyMatrix4(translationMatrix(-leftFlipperAxis.x, -leftFlipperAxis.y, -leftFlipperAxis.z));
    leftFlipper.applyMatrix4(rotationMatrixY(Math.PI/2));
    leftFlipper.applyMatrix4(rotationMatrixZ(-DEFAULT_TILT));
    leftFlipper.applyMatrix4(rotationMatrixX(FLIPPER_DEFAULT_ANGLE));
    leftFlipper.applyMatrix4(rotationMatrixZ(DEFAULT_TILT));
    leftFlipper.applyMatrix4(rotationMatrixY(- Math.PI/2));
    leftFlipper.applyMatrix4(translationMatrix(leftFlipperAxis.x, leftFlipperAxis.y, leftFlipperAxis.z));
}

function resetRightFlipper() {
    rightFlipper.position.set(INITIAL_RIGHT_FLIPPER_POSITION.x, INITIAL_RIGHT_FLIPPER_POSITION.y, INITIAL_RIGHT_FLIPPER_POSITION.z);
    rightFlipper.rotation.y = 0;
    rightFlipper.applyMatrix4(translationMatrix(-rightFlipperAxis.x, -rightFlipperAxis.y, -rightFlipperAxis.z));
    rightFlipper.applyMatrix4(rotationMatrixY(Math.PI/2));
    rightFlipper.applyMatrix4(rotationMatrixZ(-DEFAULT_TILT));
    rightFlipper.applyMatrix4(rotationMatrixX(-FLIPPER_DEFAULT_ANGLE));
    rightFlipper.applyMatrix4(rotationMatrixZ(DEFAULT_TILT));
    rightFlipper.applyMatrix4(rotationMatrixY(- Math.PI/2));
    rightFlipper.applyMatrix4(translationMatrix(rightFlipperAxis.x, rightFlipperAxis.y, rightFlipperAxis.z));
}

function animate() {
    controls.update();
    requestAnimationFrame(animate);

    updateLeftFlipper();
    updateRightFlipper();
    
    updatePhysics();
    renderer.render(scene, camera);
    stats.update();
}

init();
animate();

// Handle window resize
window.addEventListener('resize', onWindowResize, false);