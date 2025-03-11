import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { RapierPhysics } from 'three/addons/physics/RapierPhysics.js';
import Stats from 'three/addons/libs/stats.module.js';
import { OBB } from 'three/addons/math/OBB.js';
import { 
    TABLE_CONS, 
    FLIPPER_CONS, 
    BUMPER_CONS, 
    SPEED_BUMPER_CONS, 
    BALL_CONS,
    PLAY_FIELD_CONS,
} from './constants';

let scene, camera, renderer, ball;
let playField = new THREE.Group();
let leftFlipper, leftFlipperBox, rightFlipper, rightFlipperBox;
let ballVelocity = new THREE.Vector3(0, 0, 0);
let controls;
let gui, stats;
let settings = {
    difficulty: 1
}

let isLeftActive = false;
let isRightActive = false;

let lastTime = 0;
const clock = new THREE.Clock();

const GRAVITY = -9.8;
const BOUNCE_FACTOR = 0.8;

// Objects for collision detection
let bumpers = [];
let walls = [];
let speedBumps = [];

function createOBB(mesh) {
    // todo
}

function checkCollision(ob1, ob2) {
    // todo
}

function updateOBB(mesh, obb) {
    // todo
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
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 10, 0);
    scene.add(directionalLight);

    // Camera position
    // todo: change position later?
    camera.position.set(0, 6, 25);
    camera.lookAt(0, 0, 0);

    createTable();
    createFlippers();
    createBumpers();
    createSpeedBump();
    createBall();
    createButtons();

    playField.rotateX(-PLAY_FIELD_CONS.tilt_angle);
    scene.add(playField);

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

function createTable() {
    // Table
    const tableGeometry = new THREE.BoxGeometry(TABLE_CONS.tableWidth, TABLE_CONS.tableHeight, TABLE_CONS.tableDepth);
    const tableTexture = new THREE.TextureLoader().load('assets/board.jpg');
    tableTexture.wrapS = THREE.RepeatWrapping;
    tableTexture.wrapT = THREE.RepeatWrapping;
    tableTexture.repeat.set( 2, 3 );
    const tableMaterial = new THREE.MeshPhongMaterial( {map: tableTexture } );
    const table = new THREE.Mesh(tableGeometry, tableMaterial);
    table.position.set(0, 0, 0);
    playField.add(table);

    // Walls
    const wallGeometry = new THREE.BoxGeometry(TABLE_CONS.wallWidth, TABLE_CONS.wallHeight, TABLE_CONS.wallDepth);
    const wallTexture = new THREE.TextureLoader().load('assets/wood.jpg');
    wallTexture.wrapS = THREE.RepeatWrapping;
    wallTexture.wrapT = THREE.RepeatWrapping;
    const wallMaterial = new THREE.MeshPhongMaterial({ map: wallTexture });

    const leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
    leftWall.position.set(-(TABLE_CONS.tableWidth+TABLE_CONS.wallWidth)/2, 0, (TABLE_CONS.wallDepth-TABLE_CONS.tableDepth)/2);
    playField.add(leftWall);
    walls.push(leftWall);

    const rightWall = new THREE.Mesh(wallGeometry, wallMaterial);
    rightWall.position.set((TABLE_CONS.tableWidth+TABLE_CONS.wallWidth)/2, 0, (TABLE_CONS.wallDepth-TABLE_CONS.tableDepth)/2);
    playField.add(rightWall);
    walls.push(rightWall);

    const topWallGeometry = new THREE.BoxGeometry(TABLE_CONS.topWallWidth, TABLE_CONS.topWallHeight, TABLE_CONS.topWallDepth);
    const topWall = new THREE.Mesh(topWallGeometry, wallMaterial);
    topWall.position.set(0, (TABLE_CONS.tableHeight+TABLE_CONS.topWallHeight)/2, (TABLE_CONS.wallDepth-TABLE_CONS.tableDepth)/2);
    playField.add(topWall);
    walls.push(topWall);

    // corners
    const cornerGeometry = new THREE.BoxGeometry(TABLE_CONS.cornerWidth, TABLE_CONS.cornerHeight, TABLE_CONS.cornerDepth);
    const leftConner = new THREE.Mesh(cornerGeometry, wallMaterial);
    leftConner.position.set(
        -(TABLE_CONS.tableWidth+TABLE_CONS.wallWidth)/2, 
        (TABLE_CONS.tableHeight+TABLE_CONS.topWallHeight)/2, 
        (TABLE_CONS.wallDepth-TABLE_CONS.tableDepth)/2
    );
    playField.add(leftConner);

    const rightConner = new THREE.Mesh(cornerGeometry, wallMaterial);
    rightConner.position.set(
        (TABLE_CONS.tableWidth+TABLE_CONS.wallWidth)/2, 
        (TABLE_CONS.tableHeight+TABLE_CONS.topWallHeight)/2, 
        (TABLE_CONS.wallDepth-TABLE_CONS.tableDepth)/2
    );
    playField.add(rightConner);
}

function createFlippers() {
    const flipperGeometry = new THREE.BoxGeometry(FLIPPER_CONS.width, FLIPPER_CONS.height, FLIPPER_CONS.depth);
    const flipperMaterial = new THREE.MeshPhongMaterial({ color: FLIPPER_CONS.color });
    
    // Left flipper
    leftFlipperBox = new THREE.Mesh(flipperGeometry, flipperMaterial);
    leftFlipper = new THREE.Group();
    leftFlipper.add(leftFlipperBox);
    leftFlipperBox.position.set(FLIPPER_CONS.width/2, FLIPPER_CONS.height/2, 0);
    leftFlipper.position.set(-6.5, -11, (TABLE_CONS.wallDepth+FLIPPER_CONS.depth)/2);
    leftFlipper.rotation.z = -FLIPPER_CONS.init_angle;
    playField.add(leftFlipper);

    // Right flipper
    rightFlipperBox = new THREE.Mesh(flipperGeometry, flipperMaterial);
    rightFlipper = new THREE.Group();
    rightFlipper.add(rightFlipperBox);
    rightFlipperBox.position.set(-FLIPPER_CONS.width/2, FLIPPER_CONS.height/2, 0);
    rightFlipper.position.set(6.5, -11, (TABLE_CONS.wallDepth+FLIPPER_CONS.depth)/2);
    rightFlipper.rotation.z = FLIPPER_CONS.init_angle;
    playField.add(rightFlipper);
}

function createBumpers() {
    const bumperGeometry = new THREE.CylinderGeometry(BUMPER_CONS.radius, BUMPER_CONS.radius, BUMPER_CONS.height);
    const bumperMaterial = new THREE.MeshPhongMaterial({ color: BUMPER_CONS.color });
    
    // Create bumpers
    const bumper1 = new THREE.Mesh(bumperGeometry, bumperMaterial);
    bumper1.position.set(0, 5, 1);
    bumper1.rotation.x = Math.PI/2;
    playField.add(bumper1);
    bumpers.push(bumper1);

    const bumper2 = new THREE.Mesh(bumperGeometry, bumperMaterial);
    bumper2.position.set(-4, 8, 1);
    bumper2.rotation.x = Math.PI/2;
    playField.add(bumper2);
    bumpers.push(bumper2);

    const bumper3 = new THREE.Mesh(bumperGeometry, bumperMaterial);
    bumper3.position.set(4, 8, 1);
    bumper3.rotation.x = Math.PI/2;
    playField.add(bumper3);
    bumpers.push(bumper3);
}

function createSpeedBump() {
    const speedBumpGeometry = new THREE.BoxGeometry(SPEED_BUMPER_CONS.width, SPEED_BUMPER_CONS.height, SPEED_BUMPER_CONS.depth);
    const speedBumpMaterial = new THREE.MeshPhongMaterial({ color: SPEED_BUMPER_CONS.color });

    // Create speedBump
    const speedBump1 = new THREE.Mesh(speedBumpGeometry, speedBumpMaterial);
    speedBump1.position.set(-3.5, -1, 1);
    speedBump1.rotation.z = -SPEED_BUMPER_CONS.init_angle;
    playField.add(speedBump1);
    speedBumps.push(speedBump1);

    const speedBump2 = new THREE.Mesh(speedBumpGeometry, speedBumpMaterial);
    speedBump2.position.set(3.5, -1, 1);
    speedBump2.rotation.z = SPEED_BUMPER_CONS.init_angle;
    playField.add(speedBump2);
    speedBumps.push(speedBump2);
}

function createBall() {
    const ballGeometry = new THREE.SphereGeometry(BALL_CONS.radius, BALL_CONS.segments, BALL_CONS.segments);
    const ballMaterial = new THREE.MeshPhongMaterial({ color: BALL_CONS.color });
    ball = new THREE.Mesh(ballGeometry, ballMaterial);
    ball.position.set(0, 0, 1);
    playField.add(ball);
}

function handleKeyDown(event) {
    switch (event.key) {
        case 'z':
        case 'Z':
            isLeftActive = true;
            break;
        case '/':
        case '?':
            isRightActive = true;
            break;
        // todo: add space bar for launching the ball
        // todo: add r for reset the ball
    }
}

function handleKeyUp(event) {
    switch (event.key) {
        case 'z':
        case 'Z':
            isLeftActive = false;
            break;
        case '/':
        case '?':
            isRightActive = false;
            break;
    }
}

function updateFlippers(delta) {
    console.log(isLeftActive, isRightActive);
    if (isLeftActive) {
        leftFlipper.rotation.z = Math.min(leftFlipper.rotation.z + FLIPPER_CONS.speed * delta, FLIPPER_CONS.max_angle);
    }
    else {
        leftFlipper.rotation.z = Math.max(leftFlipper.rotation.z - FLIPPER_CONS.return_speed * delta, -FLIPPER_CONS.init_angle);
    }
    if (isRightActive) {
        rightFlipper.rotation.z = Math.max(rightFlipper.rotation.z - FLIPPER_CONS.speed * delta, -FLIPPER_CONS.max_angle);
    }
    else {
        rightFlipper.rotation.z = Math.min(rightFlipper.rotation.z + FLIPPER_CONS.return_speed * delta, FLIPPER_CONS.init_angle);
    }
}

function updatePhysics() {
    // todo
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    controls.update();
    requestAnimationFrame(animate);
    const currentTime = clock.getElapsedTime();
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    updateFlippers(deltaTime);    
    updatePhysics();
    renderer.render(scene, camera);
    stats.update();
}

init();
animate();

// Handle window resize
window.addEventListener('resize', onWindowResize, false);