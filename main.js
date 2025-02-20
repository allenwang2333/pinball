import * as THREE from 'three';

let scene, camera, renderer, ball;
let leftFlipper, rightFlipper;
let ballVelocity = new THREE.Vector3(0, 0, 0);
const gravity = -0.001;
const flipperSpeed = 0.1;

function init() {
    // Scene setup
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 10, 0);
    scene.add(directionalLight);

    // Camera position
    camera.position.set(0, 20, 20);
    camera.lookAt(0, 0, 0);

    createPlayfield();
    createFlippers();
    createBumpers();
    createBall();

    // Event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
}

function createPlayfield() {
    // Main table
    const tableGeometry = new THREE.BoxGeometry(15, 0.5, 30);
    const tableMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
    const table = new THREE.Mesh(tableGeometry, tableMaterial);
    scene.add(table);

    // Walls
    const wallMaterial = new THREE.MeshPhongMaterial({ color: 0x808080 });
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 30), wallMaterial);
    leftWall.position.set(-8, 1, 0);
    scene.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 30), wallMaterial);
    rightWall.position.set(8, 1, 0);
    scene.add(rightWall);

    const backWall = new THREE.Mesh(new THREE.BoxGeometry(15, 2, 1), wallMaterial);
    backWall.position.set(0, 1, 15.5);
    scene.add(backWall);
}

function createFlippers() {
    const flipperMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    
    // Left flipper
    leftFlipper = new THREE.Mesh(
        new THREE.BoxGeometry(3, 0.5, 1),
        flipperMaterial
    );
    leftFlipper.position.set(-4, 0.5, -12);
    leftFlipper.rotation.y = -0.3;
    scene.add(leftFlipper);
    // Right flipper
    rightFlipper = new THREE.Mesh(
        new THREE.BoxGeometry(3, 0.5, 1),
        flipperMaterial
    );
    rightFlipper.position.set(4, 0.5, -12);
    rightFlipper.rotation.y = 0.3;
    scene.add(rightFlipper);
}

function createBumpers() {
    const bumperGeometry = new THREE.SphereGeometry(1, 32, 32);
    const bumperMaterial = new THREE.MeshPhongMaterial({ color: 0x0000ff });
    
    // Create bumpers
    const bumper1 = new THREE.Mesh(bumperGeometry, bumperMaterial);
    bumper1.position.set(0, 1, 5);
    scene.add(bumper1);

    const bumper2 = new THREE.Mesh(bumperGeometry, bumperMaterial);
    bumper2.position.set(-3, 1, 8);
    scene.add(bumper2);

    const bumper3 = new THREE.Mesh(bumperGeometry, bumperMaterial);
    bumper3.position.set(3, 1, 8);
    scene.add(bumper3);
}

function createBall() {
    const ballGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const ballMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
    ball = new THREE.Mesh(ballGeometry, ballMaterial);
    ball.position.set(0, 5, 0);
    scene.add(ball);
}

function handleKeyDown(event) {
    if (event.key === 'ArrowLeft') {
        leftFlipper.rotation.y = Math.max(leftFlipper.rotation.y - flipperSpeed, -0.7);
    }
    if (event.key === 'ArrowRight') {
        rightFlipper.rotation.y = Math.min(rightFlipper.rotation.y + flipperSpeed, 0.7);
    }
}

function handleKeyUp(event) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        leftFlipper.rotation.y = -0.3;
        rightFlipper.rotation.y = 0.3;
    }
}

function updatePhysics() {
            // Apply gravity
    ballVelocity.y += gravity;
    ball.position.add(ballVelocity);

            // Basic collision with table
    if (ball.position.y <= 0.5) {
        ball.position.y = 0.5;
        ballVelocity.y *= -0.8; // Bounce with energy loss
   }

            // Keep ball within play area
    ball.position.x = THREE.MathUtils.clamp(ball.position.x, -7, 7);
    ball.position.z = THREE.MathUtils.clamp(ball.position.z, -14, 14);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    updatePhysics();
    renderer.render(scene, camera);
}

init();
animate();

    // Handle window resize
window.addEventListener('resize', onWindowResize, false);

