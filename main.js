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

class PinballGame{
    constructor(){
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.stats = new Stats();
        document.body.appendChild( this.stats.dom );
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(0, 10, 0);
        this.scene.add(directionalLight);
        this.camera.position.set(0, 6, 25);
        this.camera.lookAt(0, 0, 0);
        this.playField = new THREE.Group();
        this.leftFlipper = null;
        this.leftFlipperBox = null;
        this.rightFlipper = null;
        this.rightFlipperBox = null;
        this.ball = null;
        this.ballVelocity = new THREE.Vector3();
        this.gravity = new THREE.Vector3(0, -9.8, 0);
        this.bumpers = [];
        this.walls = [];
        this.speedBumps = [];
        this.isLeftActive = false;
        this.isRightActive = false;
        this.lastTime = 0;
        this.clock = new THREE.Clock();
        this.settings = {
            difficulty: 1
        }
        this.gui = new GUI();
        this.init();
    }

    init(){
        this.createTable();
        this.createFlippers();
        this.createBumpers();
        this.createSpeedBump();
        this.createBall();
        this.createButtons();
        this.playField.rotateX(-PLAY_FIELD_CONS.tilt_angle);
        this.scene.add(this.playField);
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
        window.addEventListener('resize', this.onWindowResize, false);
        this.animate();
    }

    createTable(){
        const tableGeometry = new THREE.BoxGeometry(TABLE_CONS.tableWidth, TABLE_CONS.tableHeight, TABLE_CONS.tableDepth);
        const tableTexture = new THREE.TextureLoader().load('assets/board.jpg');
        tableTexture.wrapS = THREE.RepeatWrapping;
        tableTexture.wrapT = THREE.RepeatWrapping;
        tableTexture.repeat.set( 2, 3 );
        const tableMaterial = new THREE.MeshPhongMaterial( {map: tableTexture } );
        const table = new THREE.Mesh(tableGeometry, tableMaterial);
        table.position.set(0, 0, 0);
        this.playField.add(table);
        const wallGeometry = new THREE.BoxGeometry(TABLE_CONS.wallWidth, TABLE_CONS.wallHeight, TABLE_CONS.wallDepth);
        const wallTexture = new THREE.TextureLoader().load('assets/wood.jpg');
        wallTexture.wrapS = THREE.RepeatWrapping;
        wallTexture.wrapT = THREE.RepeatWrapping;
        const wallMaterial = new THREE.MeshPhongMaterial({ map: wallTexture });
        const leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
        leftWall.position.set(-(TABLE_CONS.tableWidth+TABLE_CONS.wallWidth)/2, 0, (TABLE_CONS.wallDepth-TABLE_CONS.tableDepth)/2);
        this.playField.add(leftWall);
        this.walls.push(leftWall);
        const rightWall = new THREE.Mesh(wallGeometry, wallMaterial);
        rightWall.position.set((TABLE_CONS.tableWidth+TABLE_CONS.wallWidth)/2, 0, (TABLE_CONS.wallDepth-TABLE_CONS.tableDepth)/2);
        this.playField.add(rightWall);
        this.walls.push(rightWall);
        const topWallGeometry = new THREE.BoxGeometry(TABLE_CONS.topWallWidth, TABLE_CONS.topWallHeight, TABLE_CONS.topWallDepth);
        const topWall = new THREE.Mesh(topWallGeometry, wallMaterial);
        topWall.position.set(0, (TABLE_CONS.tableHeight+TABLE_CONS.topWallHeight)/2, (TABLE_CONS.wallDepth-TABLE_CONS.tableDepth)/2);
        this.playField.add(topWall);
        this.walls.push(topWall);
        const cornerGeometry = new THREE.BoxGeometry(TABLE_CONS.cornerWidth, TABLE_CONS.cornerHeight, TABLE_CONS.cornerDepth);
        const leftConner = new THREE.Mesh(cornerGeometry, wallMaterial);
        leftConner.position.set(
            -(TABLE_CONS.tableWidth+TABLE_CONS.wallWidth)/2,
            (TABLE_CONS.tableHeight+TABLE_CONS.topWallHeight)/2,
            (TABLE_CONS.wallDepth-TABLE_CONS.tableDepth)/2
        );
        this.playField.add(leftConner);
        const rightConner = new THREE.Mesh(cornerGeometry, wallMaterial);
        rightConner.position.set(
            (TABLE_CONS.tableWidth+TABLE_CONS.wallWidth)/2,
            (TABLE_CONS.tableHeight+TABLE_CONS.topWallHeight)/2,
            (TABLE_CONS.wallDepth-TABLE_CONS.tableDepth)/2
        );
        this.playField.add(rightConner);
    }

    createFlippers(){
        const flipperGeometry = new THREE.BoxGeometry(FLIPPER_CONS.width, FLIPPER_CONS.height, FLIPPER_CONS.depth);
        const flipperMaterial = new THREE.MeshPhongMaterial({ color: FLIPPER_CONS.color });
        this.leftFlipperBox = new THREE.Mesh(flipperGeometry, flipperMaterial);
        this.leftFlipper = new THREE.Group();
        this.leftFlipper.add(this.leftFlipperBox);
        this.leftFlipperBox.position.set(FLIPPER_CONS.width/2, FLIPPER_CONS.height/2, 0);
        this.leftFlipper.position.set(-6.5, -11, (TABLE_CONS.wallDepth+FLIPPER_CONS.depth)/2);
        this.leftFlipper.rotation.z = -FLIPPER_CONS.init_angle;
        this.playField.add(this.leftFlipper);
        this.rightFlipperBox = new THREE.Mesh(flipperGeometry, flipperMaterial);
        this.rightFlipper = new THREE.Group();
        this.rightFlipper.add(this.rightFlipperBox);
        this.rightFlipperBox.position.set(-FLIPPER_CONS.width/2, FLIPPER_CONS.height/2, 0);
        this.rightFlipper.position.set(6.5, -11, (TABLE_CONS.wallDepth+FLIPPER_CONS.depth)/2);
        this.rightFlipper.rotation.z = FLIPPER_CONS.init_angle;
        this.playField.add(this.rightFlipper);
    }

    createBumpers(){
        const bumperGeometry = new THREE.CylinderGeometry(BUMPER_CONS.radius, BUMPER_CONS.radius, BUMPER_CONS.height);
        const bumperMaterial = new THREE.MeshPhongMaterial({ color: BUMPER_CONS.color });
        const bumper1 = new THREE.Mesh(bumperGeometry, bumperMaterial);
        bumper1.position.set(0, 5, 1);
        bumper1.rotation.x = Math.PI/2;
        this.playField.add(bumper1);
        this.bumpers.push(bumper1);

        const bumper2 = new THREE.Mesh(bumperGeometry, bumperMaterial);
        bumper2.position.set(-4, 8, 1);
        bumper2.rotation.x = Math.PI/2;
        this.playField.add(bumper2);
        this.bumpers.push(bumper2);

        const bumper3 = new THREE.Mesh(bumperGeometry, bumperMaterial);
        bumper3.position.set(4, 8, 1);
        bumper3.rotation.x = Math.PI/2;
        this.playField.add(bumper3);
        this.bumpers.push(bumper3);
    }

    createSpeedBump(){
        const speedBumpGeometry = new THREE.BoxGeometry(SPEED_BUMPER_CONS.width, SPEED_BUMPER_CONS.height, SPEED_BUMPER_CONS.depth);
        const speedBumpMaterial = new THREE.MeshPhongMaterial({ color: SPEED_BUMPER_CONS.color });
        const speedBump1 = new THREE.Mesh(speedBumpGeometry, speedBumpMaterial);
        speedBump1.position.set(-3.5, -1, 1);
        speedBump1.rotation.z = -SPEED_BUMPER_CONS.init_angle;
        this.playField.add(speedBump1);
        this.speedBumps.push(speedBump1);
        const speedBump2 = new THREE.Mesh(speedBumpGeometry, speedBumpMaterial);
        speedBump2.position.set(3.5, -1, 1);
        speedBump2.rotation.z = SPEED_BUMPER_CONS.init_angle;
        this.playField.add(speedBump2);
        this.speedBumps.push(speedBump2);
    }

    createBall(){
        const ballGeometry = new THREE.SphereGeometry(BALL_CONS.radius, BALL_CONS.segments, BALL_CONS.segments);
        const ballMaterial = new THREE.MeshPhongMaterial({ color: BALL_CONS.color });
        this.ball = new THREE.Mesh(ballGeometry, ballMaterial);
        this.ball.position.set(-3, -3, 1);
        this.playField.add(this.ball);
    }

    createButtons(){
        const folder = this.gui.addFolder('Game Settings');
        folder.add(this.settings, 'difficulty', 1, 5).onChange((value) => {
            this.settings.difficulty = value;
            console.log('Difficulty set to: ', value);
        });
        folder.open();
    }

    handleKeyDown(event){
        switch (event.key) {
            case 'z':
            case 'Z':
                this.isLeftActive = true;
                break;
            case '/':
            case '?':
                this.isRightActive = true;
                break;
            // todo: add space bar for launching the ball
            // todo: add r for reset the ball
        }
    }

    handleKeyUp(event){
        switch (event.key) {
            case 'z':
            case 'Z':
                this.isLeftActive = false;
                break;
            case '/':
            case '?':
                this.isRightActive = false;
                break;
        }
    }

    updateFlippers(delta){
        if (this.isLeftActive) {
            this.leftFlipper.rotation.z = Math.min(this.leftFlipper.rotation.z + FLIPPER_CONS.speed * delta, FLIPPER_CONS.max_angle);
        }
        else {
            this.leftFlipper.rotation.z = Math.max(this.leftFlipper.rotation.z - FLIPPER_CONS.return_speed * delta, -FLIPPER_CONS.init_angle);
        }
        if (this.isRightActive) {
            this.rightFlipper.rotation.z = Math.max(this.rightFlipper.rotation.z - FLIPPER_CONS.speed * delta, -FLIPPER_CONS.max_angle);
        }
        else {
            this.rightFlipper.rotation.z = Math.min(this.rightFlipper.rotation.z + FLIPPER_CONS.return_speed * delta, FLIPPER_CONS.init_angle);
        }
    }

    updatePhysics(delta){
        this.ballVelocity.add(this.gravity.clone().multiplyScalar(delta));
        this.ball.position.add(this.ballVelocity.clone().multiplyScalar(delta));
        this.checkCollision();
    }

    checkCollision(){
        if (!this.ball.obb) {
            this.ball.obb = createOBB(this.ball);
        } else {
            updateOBB(this.ball, this.ball.obb);
        }
        for (const wall of this.walls) {
            if (!wall.obb) {
                wall.obb = createOBB(wall);
            }
            else {
                updateOBB(wall, wall.obb);
            }
            if (this.ball.obb.intersectsOBB(wall.obb)) {
                this.handleWallCollision();
            }
        }
        for (const bumper of this.bumpers) {
            if (!bumper.obb) {
                bumper.obb = createOBB(bumper);
            }
            else {
                updateOBB(bumper, bumper.obb);
            }
            if (this.ball.obb.intersectsOBB(bumper.obb)) {
                this.handleBumperCollision();
            }
        }
        for (const speedBump of this.speedBumps) {
            if (!speedBump.obb) {
                speedBump.obb = createOBB(speedBump);
            }
            else {
                updateOBB(speedBump, speedBump.obb);
            }
            if (this.ball.obb.intersectsOBB(speedBump.obb)) {
                this.handleSpeedBumpCollision();
            }
        }
        if (!this.leftFlipperBox.obb) {
            this.leftFlipperBox.obb = createOBB(this.leftFlipperBox);
        }
        else {
            updateOBB(this.leftFlipperBox, this.leftFlipperBox.obb);
        }
        if (this.ball.obb.intersectsOBB(this.leftFlipperBox.obb)) {
            this.handleFlipperCollision(this.leftFlipperBox);
        }
        if (!this.rightFlipperBox.obb) {
            this.rightFlipperBox.obb = createOBB(this.rightFlipperBox);
        }
        else {
            updateOBB(this.rightFlipperBox, this.rightFlipperBox.obb);
        }
        if (this.ball.obb.intersectsOBB(this.rightFlipperBox.obb)) {
            this.handleFlipperCollision();
        }
    }

    handleWallCollision(){
        // todo
    }

    handleBumperCollision(){
        // todo
    }

    handleSpeedBumpCollision(){
        // todo
    }

    handleFlipperCollision(flipper){
        // todo
    }

    onWindowResize(){
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate(){
        this.controls.update();
        requestAnimationFrame(this.animate.bind(this));
        const currentTime = this.clock.getElapsedTime();
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        this.updateFlippers(deltaTime);    
        this.updatePhysics(deltaTime);
        this.renderer.render(this.scene, this.camera);
        this.stats.update();
    }

}

function createOBB(mesh) {
    const obb = new OBB();
    const geometry = mesh.geometry;
    geometry.computeBoundingBox();
    const boundingBox = geometry.boundingBox;
    const center = new THREE.Vector3();
    boundingBox.getCenter(center);
    const halfsize = new THREE.Vector3();
    boundingBox.getSize(halfsize).multiplyScalar(0.5);
    const rotation = new THREE.Matrix3().setFromMatrix4(mesh.matrixWorld);
    obb.set(center, halfsize, rotation);
    obb.applyMatrix4(mesh.matrixWorld);
    console.log(obb);
    return obb;
}

function updateOBB(mesh, obb) {
    const geometry = mesh.geometry;
    if (!geometry.boundingBox) {
        geometry.computeBoundingBox();
    }
    mesh.updateMatrixWorld(true);
    obb.applyMatrix4(mesh.matrixWorld);
  }

// Initialize the game
window.addEventListener('DOMContentLoaded', () => {
    const game = new PinballGame();
});