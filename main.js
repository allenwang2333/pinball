import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, ball;
let leftFlipper, rightFlipper;
let ballVelocity = new THREE.Vector3(0, 0, 0);
let controls;
const GRAVITY = -0.001;
const FLIPPER_SPEED = 1;
const FLIPPER_DEFAULT_ANGLE = -0.4;
const BOUNCE_FACTOR = 0.8;
const DEFAULT_TILT = Math.PI / 3;
let leftFlipperAngle = FLIPPER_DEFAULT_ANGLE;
let rightFlipperAngle = FLIPPER_DEFAULT_ANGLE;

function init() {
    // Scene setup
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    controls = new OrbitControls(camera, renderer.domElement);


    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper)
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

    // Event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
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
    const tableMaterial = new THREE.MeshPhongMaterial({ color: 0x3cb371 });
    const table = new THREE.Mesh(tableGeometry, tableMaterial);
    table.applyMatrix4(rotationMatrixX(-DEFAULT_TILT));
    scene.add(table);

    // Walls
    const wallGeometry = new THREE.BoxGeometry(1, 2, 30);
    const wallMaterial = new THREE.MeshPhongMaterial({ color: 0x660000 });

    const leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
    leftWall.applyMatrix4(rotationMatrixX(Math.PI/2 - DEFAULT_TILT));
    leftWall.position.set(-10, 0, 0);
    
    
    scene.add(leftWall);

    const rightWall = new THREE.Mesh(wallGeometry, wallMaterial);
    rightWall.applyMatrix4(rotationMatrixX(Math.PI/2 - DEFAULT_TILT));
    rightWall.position.set(10, 0, 0);
    scene.add(rightWall);

    const topWall = new THREE.Mesh(new THREE.BoxGeometry(20, 2, 1), wallMaterial);
    

    topWall.position.set(0, 0, -14.5);
    topWall.applyMatrix4(rotationMatrixX(Math.PI/2 - DEFAULT_TILT));
    scene.add(topWall);

    // const backWall = new THREE.Mesh(new THREE.BoxGeometry(15, 2, 1), wallMaterial);
    // backWall.position.set(0, 1, 15.5);
    // scene.add(backWall);
}

function createFlippers() {
    const flipperGeometry = new THREE.BoxGeometry(5, 0.2, 0.3);
    const flipperMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    
    // Left flipper
    leftFlipper = new THREE.Mesh(flipperGeometry, flipperMaterial);
    leftFlipper.position.set(-4, 0.25, 12);
    leftFlipper.applyMatrix4(rotationMatrixX((Math.PI/2 - DEFAULT_TILT)));
    scene.add(leftFlipper);

    // Right flipper
    rightFlipper = new THREE.Mesh(flipperGeometry, flipperMaterial);
    rightFlipper.position.set(4, 0.25, 12);
    rightFlipper.applyMatrix4(rotationMatrixX((Math.PI/2 - DEFAULT_TILT)));
    scene.add(rightFlipper);
}

function createBumpers() {
    const bumperGeometry = new THREE.CylinderGeometry(1, 1, 1.5);
    const bumperMaterial = new THREE.MeshPhongMaterial({ color: 0x0000ff });
    
    // Create bumpers
    const bumper1 = new THREE.Mesh(bumperGeometry, bumperMaterial);
    bumper1.position.set(0, 0.5, -5);
    bumper1.applyMatrix4(rotationMatrixX((Math.PI/2 - DEFAULT_TILT)));
    

    const bumper2 = new THREE.Mesh(bumperGeometry, bumperMaterial);
    bumper2.position.set(-3, 0.5, -8);
    bumper2.applyMatrix4(rotationMatrixX((Math.PI/2 - DEFAULT_TILT)));

    const bumper3 = new THREE.Mesh(bumperGeometry, bumperMaterial);
    bumper3.position.set(3, 0.5, -8);
    bumper3.applyMatrix4(rotationMatrixX((Math.PI/2 - DEFAULT_TILT)));

    scene.add(bumper1);
    scene.add(bumper2);
    scene.add(bumper3);
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
}

function createBall() {
    const ballGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const ballMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
    ball = new THREE.Mesh(ballGeometry, ballMaterial);
    ball.position.set(0, 5, 0);
    scene.add(ball);

}

function handleKeyDown(event) {
    if (event.key === 'z') {
        leftFlipperAngle = Math.min(leftFlipperAngle - FLIPPER_SPEED, Math.PI/4);
    }
    if (event.key === '/') {
        rightFlipperAngle = Math.min(rightFlipperAngle + FLIPPER_SPEED, Math.PI/4);
    }
}

function handleKeyUp(event) {
    if (event.key === 'z') {
        leftFlipperAngle = FLIPPER_DEFAULT_ANGLE;
    } 
    if (event.key === '/') {
        rightFlipperAngle = FLIPPER_DEFAULT_ANGLE;
    }
}

function updatePhysics() {

    ballVelocity.y += GRAVITY;
    ball.position.add(ballVelocity);

    // Table collision (ground)
    if (ball.position.y < 0.5) {
        ball.position.y = 0.5;
        ballVelocity.y = -ballVelocity.y * BOUNCE_FACTOR;
    }

    // Wall collisions
    if (ball.position.x < -9.5) { // Left wall
        ball.position.x = -9.5;
        ballVelocity.x = -ballVelocity.x * BOUNCE_FACTOR;
    }
    if (ball.position.x > 9.5) { // Right wall
        ball.position.x = 9.5;
        ballVelocity.x = -ballVelocity.x * BOUNCE_FACTOR;
    }
    if (ball.position.z > 14.5) { // Top wall
        ball.position.z = 14.5;
        ballVelocity.z = -ballVelocity.z * BOUNCE_FACTOR;
    }

    // Flipper collisions (simplified)
    const ballBox = new THREE.Box3().setFromObject(ball);
    const leftFlipperBox = new THREE.Box3().setFromObject(leftFlipper);
    const rightFlipperBox = new THREE.Box3().setFromObject(rightFlipper);

    if (ballBox.intersectsBox(leftFlipperBox) && leftFlipperAngle > 0) {
        ballVelocity.y = 0.5; // Push ball up
        ballVelocity.x = -0.2; // Slight left nudge
    }
    if (ballBox.intersectsBox(rightFlipperBox) && rightFlipperAngle > 0) {
        ballVelocity.y = 0.5; // Push ball up
        ballVelocity.x = 0.2; // Slight right nudge
    }

    // Reset ball if it falls off bottom (simulating out-of-bounds)
    if (ball.position.z < -15) {
        ball.position.set(0, 5, 0);
        ballVelocity.set(0, 0, 0);
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    controls.update();
    requestAnimationFrame(animate);
    
    leftFlipper.rotation.y = leftFlipperAngle;
    rightFlipper.rotation.y = -rightFlipperAngle;
    
    updatePhysics();
    renderer.render(scene, camera);
}

init();
animate();


    // Handle window resize
window.addEventListener('resize', onWindowResize, false);