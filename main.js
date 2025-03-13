import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import Stats from 'three/addons/libs/stats.module.js';
import { OBB } from 'three/addons/math/OBB.js';
import { 
    TABLE_CONS, 
    FLIPPER_CONS, 
    BUMPER_CONS, 
    SPEED_BUMPER_CONS, 
    BALL_CONS,
    PLAY_FIELD_CONS,
    LAUNCHER_CONS,
    VISUALIZE_BOUNDING_BOX,
    META,
} from './constants';

let temp;

class PinballGame {
    constructor(){
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.stats = new Stats();
        document.body.appendChild( this.stats.dom );

        // Lights
        const ambientLight = new THREE.AmbientLight(0x404040);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(0, 10, 20);

        // Setting Shadow for lights
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        directionalLight.castShadow = true;

        // Set directional light shadow rendering area
        //directionalLight.shadow.bias = -0.001;
        directionalLight.shadow.mapSize.width = 50000; 
        directionalLight.shadow.mapSize.height = 50000; 
        directionalLight.shadow.camera.near = 0.1; 
        directionalLight.shadow.camera.far = 1000;
        directionalLight.shadow.camera.left = 500;
        directionalLight.shadow.camera.right = -500;
        directionalLight.shadow.camera.top = 500;
        directionalLight.shadow.camera.bottom = -500;


        this.scene.add(ambientLight);
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
        // Launcher
        this.launchStick = null;
        this.launchBarrier = [];

        // Track Game State
        this.gameStart = false;
        this.score = 0;
        this.history = [];
        this.firstThree = {
            '1st': 0,
            '2nd': 0,
            '3rd': 0,
            'Current Score': 0
        }

        this.isLeftActive = false;
        this.isRightActive = false;
        this.holdingLauncher = false;
        this.reset = false;
        this.lastTime = 0;
        this.clock = new THREE.Clock();
        this.settings = {
            difficulty: 1
        }
        this.gui = new GUI();

        this.animate = this.animate.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.onWindowResize = this.onWindowResize.bind(this);
        this.updatePhysics = this.updatePhysics.bind(this);
        this.handleCollision = this.handleCollision.bind(this);

        this.isAttachedToLauncher = false;
        this.isLaunched = false;
        this.previousHoldingLauncher = false;

        this.audioListener = null;
        this.audioLoader = null;
        this.sound = null;
        this.init();
        
    }

    init(){
        this.createTable();
        this.createFlippers();
        this.createBumpers();
        this.createSpeedBump();
        this.createBall();
        this.createLauncher();
        this.createBottom();
        this.scoreBoard();
        this.createButtons();
        this.createSound();
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
        // Shadow
        table.receiveShadow = true;

        table.position.set(0, 0, 0);
        this.playField.add(table);
        const wallGeometry = new THREE.BoxGeometry(TABLE_CONS.wallWidth, TABLE_CONS.wallHeight, TABLE_CONS.wallDepth);
        const wallTexture = new THREE.TextureLoader().load('assets/wood.jpg');
        wallTexture.wrapS = THREE.RepeatWrapping;
        wallTexture.wrapT = THREE.RepeatWrapping;
        const wallMaterial = new THREE.MeshPhongMaterial({ map: wallTexture });
        const leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
        // Shadow
        leftWall.castShadow = true;

        leftWall.position.set(-(TABLE_CONS.tableWidth+TABLE_CONS.wallWidth)/2, 0, (TABLE_CONS.wallDepth-TABLE_CONS.tableDepth)/2);
        this.playField.add(leftWall);
        this.walls.push(leftWall);
        const rightWall = new THREE.Mesh(wallGeometry, wallMaterial);
        // Shadow
        rightWall.castShadow = true;

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
        // Shadow
        leftConner.castShadow = true;


        leftConner.position.set(
            -(TABLE_CONS.tableWidth+TABLE_CONS.wallWidth)/2,
            (TABLE_CONS.tableHeight+TABLE_CONS.topWallHeight)/2,
            (TABLE_CONS.wallDepth-TABLE_CONS.tableDepth)/2
        );
        this.playField.add(leftConner);
        const rightConner = new THREE.Mesh(cornerGeometry, wallMaterial);
        // Shadow
        rightConner.castShadow = true;

        rightConner.position.set(
            (TABLE_CONS.tableWidth+TABLE_CONS.wallWidth)/2,
            (TABLE_CONS.tableHeight+TABLE_CONS.topWallHeight)/2,
            (TABLE_CONS.wallDepth-TABLE_CONS.tableDepth)/2
        );
        this.playField.add(rightConner);
    }

    createFlippers(){
        const flipperGeometry = new THREE.BoxGeometry(FLIPPER_CONS.width, FLIPPER_CONS.height, FLIPPER_CONS.depth);
        flipperGeometry.userData.obb = new OBB();
        const size = new THREE.Vector3(FLIPPER_CONS.width/2, FLIPPER_CONS.height/2, FLIPPER_CONS.depth/2);
        flipperGeometry.userData.obb.halfSize.copy(size);
        const flipperMaterial = new THREE.MeshPhongMaterial({ color: FLIPPER_CONS.color });
        this.leftFlipperBox = new THREE.Mesh(flipperGeometry, flipperMaterial);
        // Shadow
        this.leftFlipperBox.castShadow = true;

        this.leftFlipper = new THREE.Group();
        this.leftFlipper.add(this.leftFlipperBox);
        this.leftFlipperBox.position.set(FLIPPER_CONS.width/2, FLIPPER_CONS.height/2, 0);
        this.leftFlipper.position.set(-6.5, -11, (TABLE_CONS.tableDepth+FLIPPER_CONS.depth)/2-0.01);
        this.leftFlipper.rotation.z = -FLIPPER_CONS.init_angle;
        this.leftFlipperBox.userData.obb = new OBB();
        this.playField.add(this.leftFlipper);
        this.rightFlipperBox = new THREE.Mesh(flipperGeometry, flipperMaterial);
        // Shadow
        this.rightFlipperBox.castShadow = true;

        this.rightFlipper = new THREE.Group();
        this.rightFlipper.add(this.rightFlipperBox);
        this.rightFlipperBox.position.set(-FLIPPER_CONS.width/2, FLIPPER_CONS.height/2, 0);
        this.rightFlipper.position.set(6.5, -11, (TABLE_CONS.tableDepth+FLIPPER_CONS.depth)/2-0.01);
        this.rightFlipper.rotation.z = FLIPPER_CONS.init_angle;
        this.playField.add(this.rightFlipper);
    }

    createBumpers(){
        const bumperGeometry = new THREE.CylinderGeometry(BUMPER_CONS.radius, BUMPER_CONS.radius, BUMPER_CONS.height);
        const bumperMaterial = new THREE.MeshPhongMaterial({ color: BUMPER_CONS.color });
        const bumper1 = new THREE.Mesh(bumperGeometry, bumperMaterial);
        // Shadow
        bumper1.receiveShadow = true;
        bumper1.castShadow = true;

        bumper1.position.set(0, 5, 1);
        bumper1.rotation.x = Math.PI/2;
        this.playField.add(bumper1);
        this.bumpers.push(bumper1);

        const bumper2 = new THREE.Mesh(bumperGeometry, bumperMaterial);
        // Shadow
        bumper2.receiveShadow = true;
        bumper2.castShadow = true;

        bumper2.position.set(-4, 8, 1);
        bumper2.rotation.x = Math.PI/2;
        this.playField.add(bumper2);
        this.bumpers.push(bumper2);

        const bumper3 = new THREE.Mesh(bumperGeometry, bumperMaterial);
        // Shadow
        bumper3.receiveShadow = true;
        bumper3.castShadow = true;

        bumper3.position.set(4, 8, 1);
        bumper3.rotation.x = Math.PI/2;
        this.playField.add(bumper3);
        this.bumpers.push(bumper3);
    }

    createSpeedBump(){
        const speedBumpGeometry = new THREE.BoxGeometry(SPEED_BUMPER_CONS.width, SPEED_BUMPER_CONS.height, SPEED_BUMPER_CONS.depth);
        const speedBumpMaterial = new THREE.MeshPhongMaterial({ color: SPEED_BUMPER_CONS.color });
        const speedBump1 = new THREE.Mesh(speedBumpGeometry, speedBumpMaterial);
        // Shadow
        speedBump1.receiveShadow = true;

        speedBump1.position.set(-3.5, -1, 0.1);
        speedBump1.rotation.z = -SPEED_BUMPER_CONS.init_angle;
        this.playField.add(speedBump1);
        this.speedBumps.push(speedBump1);
        const speedBump2 = new THREE.Mesh(speedBumpGeometry, speedBumpMaterial);
        // Shadow
        speedBump1.receiveShadow = true;
        
        speedBump2.position.set(3.5, -1, 0.1);
        speedBump2.rotation.z = SPEED_BUMPER_CONS.init_angle;
        this.playField.add(speedBump2);
        this.speedBumps.push(speedBump2);
    }

    createBall(){
        const ballGeometry = new THREE.SphereGeometry(BALL_CONS.radius, BALL_CONS.segments, BALL_CONS.segments);
        let ballMaterial = createPhongMaterial({
            color: BALL_CONS.color,
            ambient: 0,
            diffusivity: 1.0,
            specularity: 30.0,
            smoothness: 100
        });
        //new THREE.MeshPhongMaterial({ color: BALL_CONS.color });
        this.ball = new THREE.Mesh(ballGeometry, ballMaterial);
        // Shadow
        this.ball.receiveShadow = true;
        this.ball.castShadow = true;

        this.ball.position.set(BALL_CONS.init_x, BALL_CONS.init_y, BALL_CONS.init_z);
        this.playField.add(this.ball);
    }

    // Create Launcher for the ball at button right side
    createLauncher(){
        // Launcher stick to hit the ball
        const stickGeometry = new THREE.CylinderGeometry(LAUNCHER_CONS.stick_upper_radius, LAUNCHER_CONS.stick_lower_radius, LAUNCHER_CONS.stick_length);
        const stickTexture = new THREE.TextureLoader().load('assets/wood.jpg');
        stickTexture.wrapS = THREE.RepeatWrapping;
        stickTexture.wrapT = THREE.RepeatWrapping;
        const stickMaterial = new THREE.MeshPhongMaterial({ map: stickTexture });
        this.launchStick = new THREE.Mesh(stickGeometry, stickMaterial);
        // Shadow
        this.launchStick.castShadow = true;
        this.launchStick.receiveShadow = true;

        this.launchStick.position.set(BALL_CONS.init_x, LAUNCHER_CONS.init_y, BALL_CONS.init_z);
        this.playField.add(this.launchStick);

        // Launcher barriers
        const barrierGeometry = new THREE.BoxGeometry(LAUNCHER_CONS.barrier_width, LAUNCHER_CONS.barrier_height, LAUNCHER_CONS.barrier_depth);
        const barrierTexture = new THREE.TextureLoader().load('assets/wood.jpg');
        barrierTexture.wrapS = THREE.RepeatWrapping;
        barrierTexture.wrapT = THREE.RepeatWrapping;
        const barrierMaterial = new THREE.MeshPhongMaterial({ map: barrierTexture });
        const barrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
        barrier.position.set(BALL_CONS.init_x - BALL_CONS.radius - LAUNCHER_CONS.barrier_width/2 - 0.1, BALL_CONS.init_y, LAUNCHER_CONS.barrier_depth);
        this.playField.add(barrier);
        this.walls.push(barrier);

        // Corner
        console.log(this.walls[1].position, barrier.position);
        const cornerGeometry = new THREE.BoxGeometry(this.walls[1].position.x - barrier.position.x - TABLE_CONS.wallWidth/2 - barrierGeometry.parameters.width/2, BALL_CONS.radius, LAUNCHER_CONS.barrier_depth);
        const cornerTexture = new THREE.TextureLoader().load('assets/wood.jpg');
        cornerTexture.wrapS = THREE.RepeatWrapping;
        cornerTexture.wrapT = THREE.RepeatWrapping;
        const cornerMaterial = new THREE.MeshPhongMaterial({ map: cornerTexture });
        const corner = new THREE.Mesh(cornerGeometry, cornerMaterial);
        corner.position.set(barrier.position.x + barrierGeometry.parameters.width/2 + cornerGeometry.parameters.width/2, -TABLE_CONS.tableHeight/2+BALL_CONS.radius/2, LAUNCHER_CONS.barrier_depth);
        this.playField.add(corner);
        this.walls.push(corner);
    }

    // Build the bottom part of the board
    createBottom(){
        // Lower left wall
        let width = -6.5 + (TABLE_CONS.tableWidth+TABLE_CONS.wallWidth)/2;
        let height = 8;
        let depth = TABLE_CONS.tableDepth;
        const lowerLeftGeometry = new THREE.BoxGeometry(width, height, depth);
        const lowerLeftTexture = new THREE.TextureLoader().load('assets/wood.jpg');
        lowerLeftTexture.wrapS = THREE.RepeatWrapping;
        lowerLeftTexture.wrapT = THREE.RepeatWrapping;
        const lowerLeftMaterial = new THREE.MeshPhongMaterial({ map: lowerLeftTexture });
        const lowerLeft = new THREE.Mesh(lowerLeftGeometry, lowerLeftMaterial);
        // Shadow
        lowerLeft.castShadow = true;

        lowerLeft.position.set(-6 - width/2, -TABLE_CONS.tableHeight/2+height/2, depth);
        this.playField.add(lowerLeft);
        this.walls.push(lowerLeft);

        // Lower left bumper
        height = Math.sqrt(2)*width;
        width = 1;

        const leftBumperGeometry = new THREE.BoxGeometry(width, height, depth);
        const leftBumperTexture = new THREE.TextureLoader().load('assets/wood.jpg');
        leftBumperTexture.wrapS = THREE.RepeatWrapping;
        leftBumperTexture.wrapT = THREE.RepeatWrapping;
        const leftBumperMaterial = new THREE.MeshStandardMaterial({ map: leftBumperTexture });
        const leftBumper = new THREE.Mesh(leftBumperGeometry, leftBumperMaterial);

        // Shadow
        leftBumper.castShadow = true;

        width = -6.5 + (TABLE_CONS.tableWidth+TABLE_CONS.wallWidth)/2;
        leftBumper.rotateZ(Math.PI/4);
        leftBumper.position.set(-6 - width/2-0.3, -TABLE_CONS.tableHeight/2+8+height/2-1.2, depth-0.01);
        this.playField.add(leftBumper);
        this.walls.push(leftBumper);

        // Lower right wall
        width = 2;
        height = 8;
        depth = TABLE_CONS.tableDepth;
        const lowerRightGeometry = new THREE.BoxGeometry(width, height, depth);
        const lowerRightTexture = new THREE.TextureLoader().load('assets/wood.jpg');
        lowerRightTexture.wrapS = THREE.RepeatWrapping;
        lowerRightTexture.wrapT = THREE.RepeatWrapping;
        const lowerRightMaterial = new THREE.MeshPhongMaterial({ map: lowerRightTexture });
        const lowerRight = new THREE.Mesh(lowerRightGeometry, lowerRightMaterial);
        // Shadow
        lowerRight.castShadow = true;

        lowerRight.position.set(6 + width/2, -TABLE_CONS.tableHeight/2+height/2, depth);
        this.playField.add(lowerRight);
        this.walls.push(lowerRight);

        // Lower right bumper
        height = Math.sqrt(2)*width;
        width = 0.5;

        const rightBumperGeometry = new THREE.BoxGeometry(width, height, depth);
        const rightBumperTexture = new THREE.TextureLoader().load('assets/wood.jpg');
        rightBumperTexture.wrapS = THREE.RepeatWrapping;
        rightBumperTexture.wrapT = THREE.RepeatWrapping;
        const rightBumperMaterial = new THREE.MeshStandardMaterial({ map: rightBumperTexture });
        const rightBumper = new THREE.Mesh(rightBumperGeometry, rightBumperMaterial);

        // Shadow
        rightBumper.castShadow = true;

        width = -6.5 + (TABLE_CONS.tableWidth+TABLE_CONS.wallWidth)/2;
        rightBumper.rotateZ(-Math.PI/4);
        rightBumper.position.set(6 + width/2 - 0.81, -TABLE_CONS.tableHeight/2+8+height/2-0.6, depth-0.01);
        this.playField.add(rightBumper);
        this.walls.push(rightBumper);
    }

    // Display Score
    scoreBoard(){
        const board = this.gui.addFolder('Score Board');
        board.add(this.firstThree, '1st').listen();
        board.add(this.firstThree, '2nd').listen();
        board.add(this.firstThree, '3rd').listen();
        board.add(this.firstThree, 'Current Score').listen();
        board.open();
    }

    // Update Score Board
    updateScoreBoard(){
        this.history.sort((a, b) => b - a);
        for (let i = 0; i < Math.min(this.history.length, 3); i++) {
            if (i === 0) this.firstThree['1st'] = this.history[i];
            if (i === 1) this.firstThree['2nd'] = this.history[i];
            if (i === 2) this.firstThree['3rd'] = this.history[i];
        }
        this.firstThree['Current Score'] = this.score;
    }

    createButtons(){
        const folder = this.gui.addFolder('Game Settings');
        folder.add(this.settings, 'difficulty', 1, 5).onChange((value) => {
            this.settings.difficulty = value;
            console.log('Difficulty set to: ', value);
        });
        folder.open();
    }

    createSound() {
        this.audioListener = new THREE.AudioListener();
        this.camera.add(this.audioListener);
        this.audioLoader = new THREE.AudioLoader();
        this.sound = new THREE.Audio(this.audioListener);
        this.audioLoader.load('assets/ambient.mp3', (buffer) => {
            this.sound.setBuffer(buffer);
            this.sound.setLoop(true);
            this.sound.setVolume(0.2);
        });
        document.addEventListener('click', () => {
            this.sound.play();
        });
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
            case ' ':
                this.holdingLauncher = true;
                break;
            case 'R':
            case 'r':
                this.reset = true;
                break;
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
            case ' ':
                this.holdingLauncher = false;
                break;
            case 'R':
            case 'r':
                this.reset = false;
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

    updateLauncher(delta){
        if (this.holdingLauncher) {
            this.launchStick.position.y = Math.max(this.launchStick.position.y - LAUNCHER_CONS.holding_speed * delta, LAUNCHER_CONS.stick_lowest);
            this.gameStart = true;
        } else {
            this.launchStick.position.y = Math.min(this.launchStick.position.y + LAUNCHER_CONS.releasing_speed * delta, LAUNCHER_CONS.init_y)
        }
    }

    resetGame(){
        if (this.reset) {
            this.ball.position.set(BALL_CONS.init_x, BALL_CONS.init_y, BALL_CONS.init_z);
            this.ballVelocity.set(0, 0, 0);
            this.isLaunched = false;
            this.gameStart = false;
            this.isAttachedToLauncher = true;
            this.previousHoldingLauncher = false;
            this.score = 0;
            this.reset = false;
        }
    }

    updatePhysics(delta){
        this.ball.obb = createOBBFromObject(this.ball);
        if (this.gameStart && this.isLaunched) {
            this.ballVelocity.add(this.gravity.clone().multiplyScalar(delta));
            this.ball.position.add(this.ballVelocity.clone().multiplyScalar(delta));
        }
    }

    handleCollision(deltaTime) {
        this.ball.obb = createOBBFromObject(this.ball);
        this.handleLauncherCollision(deltaTime);
        this.handleBarrierCollision(deltaTime);
        this.handleFlipperCollision(deltaTime);
        this.handleBumperCollision(deltaTime);
        this.handleWallCollision(deltaTime);
    }

    handleBarrierCollision(deltaTime) {
        for (let barrier of this.launchBarrier) {
            barrier.obb = createOBBFromObject(barrier);
            const collision = sphereOBBCollision(this.ball, barrier.obb);
            
            if (collision.collision) {
                // Get collision normal
                const normal = collision.normal;
                console.log(normal);
                
                // Calculate reflection vector using the normal
                const bounceFactor = META.bounce_factor;
                
                // Reflect velocity based on collision normal
                // v' = v - 2(v·n)n
                const dot = this.ballVelocity.dot(normal);
                const reflection = this.ballVelocity.clone().sub(
                    normal.clone().multiplyScalar(2 * dot)
                ).multiplyScalar(bounceFactor);
                
                this.ballVelocity.copy(reflection);
                
                // Move the ball outside the collision to prevent sticking
                // We move it slightly past the collision point along the normal
                const pushDistance = BALL_CONS.radius - collision.distance + 0.01;
                this.ball.position.add(normal.clone().multiplyScalar(pushDistance));
                
                // Play a sound effect
                this.audioLoader.load('assets/hitball.mp3', (buffer) => {
                    const sound = new THREE.Audio(this.audioListener);
                    sound.setBuffer(buffer);
                    sound.setVolume(0.3);
                    sound.play();
                });
            }
        }
    }
    handleLauncherCollision(deltaTime){
        const ballPos = new THREE.Vector3();
        this.ball.getWorldPosition(ballPos);
        this.launchStick.obb = createOBBFromObject(this.launchStick);
        if (this.ball.obb.intersectsOBB(this.launchStick.obb) && ballPos.y > -TABLE_CONS.tableHeight/2+3+BALL_CONS.radius) { 
            if (!this.isLaunched &&!this.holdingLauncher) {
                this.isAttachedToLauncher = true;
                this.ballVelocity.set(0, 0, 0);
            }
            if (this.holdingLauncher && this.isAttachedToLauncher) {
                this.previousHoldingLauncher = this.holdingLauncher;
                this.ball.position.y -= (LAUNCHER_CONS.holding_speed * deltaTime);
            }
        }
        if (!this.holdingLauncher && this.previousHoldingLauncher && this.isAttachedToLauncher){
            const launchPower = Math.min((LAUNCHER_CONS.init_y - this.launchStick.position.y) * 20 , LAUNCHER_CONS.max_power);
            this.ballVelocity.set(1, launchPower, 0); 
            //this.ball.position.add(this.ballVelocity.clone().multiplyScalar(deltaTime));
            
            this.isLaunched = true;
            this.isAttachedToLauncher = false;


            this.audioLoader.load('assets/hitball.mp3', (buffer) => {
                const sound = new THREE.Audio(this.audioListener);
                sound.setBuffer(buffer);
                sound.setVolume(0.5);
                sound.play();
            });
         }  
        
    }
    
    handleFlipperCollision(deltaTime){

        this.leftFlipperBox.obb = createOBBFromObject(this.leftFlipperBox);
        if (this.ball.obb.intersectsOBB(this.leftFlipperBox.obb)) {
            //TODO: handle collision logic
        }
        
        this.rightFlipperBox.obb = createOBBFromObject(this.rightFlipperBox);
        if (this.ball.obb.intersectsOBB(this.rightFlipperBox.obb)) {
            //TODO: handle collision logic
        }
        
    }

    handleWallCollision(deltaTime) {
        for (let wall of this.walls) {
            wall.obb = createOBBFromObject(wall);
            const collision = sphereOBBCollision(this.ball, wall.obb);
            
            if (collision.collision) {
                // Get collision normal
                const normal = collision.normal;
                console.log(normal);
                
                // Calculate reflection vector using the normal
                const bounceFactor = META.bounce_factor;
                
                // Reflect velocity based on collision normal
                const dot = this.ballVelocity.dot(normal);
                const reflection = this.ballVelocity.clone().sub(
                    normal.clone().multiplyScalar(2 * dot)
                ).multiplyScalar(bounceFactor);
                
                console.log(this.ballVelocity);
                this.ballVelocity.copy(reflection);
                console.log(this.ballVelocity);
                
                // Move the ball outside the collision
                const pushDistance = BALL_CONS.radius - collision.distance + 0.01;
                this.ball.position.add(normal.clone().multiplyScalar(pushDistance));
                
                // Play a sound effect for wall collision
                this.audioLoader.load('assets/hitball.mp3', (buffer) => {
                    const sound = new THREE.Audio(this.audioListener);
                    sound.setBuffer(buffer);
                    sound.setVolume(0.4);
                    sound.play();
                });
            }
        }
    }

    handleBumperCollision(deltaTime){
        for (let bumper of this.bumpers) {
            bumper.obb = createOBBFromObject(bumper);
            if (this.ball.obb.intersectsOBB(bumper.obb)) {
                // TODO handle bumper collision logic
            }
        }
    }

    checkGameState(){
        const ballPos = new THREE.Vector3();
        this.ball.getWorldPosition(ballPos);
        if(ballPos.y < -TABLE_CONS.tableHeight/2) {
            this.reset = true;
            this.history.push(this.score);
        }
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
        let substep = 10;
        let dt = deltaTime / substep;
        // for (let i = 0; i < substep; i++) {
        //     this.updateFlippers(dt);
        //     this.updateLauncher(dt);
        //     this.handleCollision(dt);
        //     this.updatePhysics(dt);
        // }
        // Check if Game End
        this.checkGameState();

        this.updateFlippers(deltaTime);
        this.updateLauncher(deltaTime);
        this.handleCollision(deltaTime);
        this.updatePhysics(deltaTime );

        // Update Score Board Before End the Game
        this.updateScoreBoard();
        // Reset
        this.resetGame();


        

        // Update Phong shading matterial
        updateMaterial(this.ball, this.scene, this.camera);
    
        this.renderer.render(this.scene, this.camera);
        this.stats.update();
    }
}

// Helper function to detect collision between sphere and OBB
function sphereOBBCollision(sphere, obb) {
    // Get sphere center in world space
    const sphereCenter = new THREE.Vector3();
    sphere.getWorldPosition(sphereCenter);
    
    // Transform sphere center to OBB's local space
    const localSphereCenter = sphereCenter.clone().sub(obb.center);
    localSphereCenter.applyMatrix3(obb.rotation);
    
    // Find the closest point on the OBB to the sphere center
    const closestPoint = new THREE.Vector3(
        Math.max(-obb.halfSize.x, Math.min(obb.halfSize.x, localSphereCenter.x)),
        Math.max(-obb.halfSize.y, Math.min(obb.halfSize.y, localSphereCenter.y)),
        Math.max(-obb.halfSize.z, Math.min(obb.halfSize.z, localSphereCenter.z))
    );
    
    // Transform closest point back to world space
    const worldClosestPoint = closestPoint.clone();
    worldClosestPoint.applyMatrix3(obb.rotation.clone().transpose());
    worldClosestPoint.add(obb.center);
    
    // Check if the closest point is within the sphere
    const distance = sphereCenter.distanceTo(worldClosestPoint);

    let normal = sphereCenter.clone().sub(worldClosestPoint)
    normal.z = 0;
    normal.normalize();
    
    return {
        collision: distance <= BALL_CONS.radius,
        distance: distance,
        normal: normal,
        point: worldClosestPoint
    };
}

// Helper function to create an OBB for objects other than the ball
function createOBBFromObject(object) {
    object.updateMatrixWorld(true);
    object.geometry.computeBoundingBox();
    
    const bbox = object.geometry.boundingBox;
    if (VISUALIZE_BOUNDING_BOX && !object.obb) {
        let bboxviz = new THREE.Box3Helper(bbox, 0xffff00);
        object.add(bboxviz);
    }
    
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    bbox.getCenter(center);
    bbox.getSize(size);

    const obb = new OBB(center, size.multiplyScalar(0.5)).applyMatrix4(object.matrixWorld);
    return obb;
}

// Phong Shading
function createPhongMaterial(materialProperties) {
    const numLights = 2;
    
    // convert shape_color1 to a Vector4
    let shape_color_representation = new THREE.Color(materialProperties.color);
    let shape_color = new THREE.Vector4(
        shape_color_representation.r,
        shape_color_representation.g,
        shape_color_representation.b,
        1.0
    );

    // Vertex Shader
    let vertexShader = `
        precision mediump float;
        const int N_LIGHTS = ${numLights};
        uniform float ambient, diffusivity, specularity, smoothness;
        uniform vec4 light_positions_or_vectors[N_LIGHTS];
        uniform vec4 light_colors[N_LIGHTS];
        uniform float light_attenuation_factors[N_LIGHTS];
        uniform vec4 shape_color;
        uniform vec3 squared_scale;
        uniform vec3 camera_center;
        varying vec3 N, vertex_worldspace;

        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;

        void main() {
            gl_Position = projection_camera_model_transform * vec4(position, 1.0);
            N = normalize(mat3(model_transform) * normal / squared_scale);
            vertex_worldspace = (model_transform * vec4(position, 1.0)).xyz;
        }
    `;
    // Fragment Shader
    let fragmentShader = `
        precision mediump float;
        const int N_LIGHTS = ${numLights};
        uniform float ambient, diffusivity, specularity, smoothness;
        uniform vec4 light_positions_or_vectors[N_LIGHTS];
        uniform vec4 light_colors[N_LIGHTS];
        uniform float light_attenuation_factors[N_LIGHTS];
        uniform vec4 shape_color;
        uniform vec3 camera_center;
        varying vec3 N, vertex_worldspace;

        // ***** PHONG SHADING HAPPENS HERE: *****
        vec3 phong_model_lights(vec3 N, vec3 vertex_worldspace) {
            vec3 E = normalize(camera_center - vertex_worldspace); // View direction
            vec3 result = vec3(0.0); // Initialize the output color
            for(int i = 0; i < N_LIGHTS; i++) {
                // Calculate the vector from the surface to the light source
                vec3 surface_to_light_vector = light_positions_or_vectors[i].xyz - 
                    light_positions_or_vectors[i].w * vertex_worldspace;
                float distance_to_light = length(surface_to_light_vector); // Light distance
                vec3 L = normalize(surface_to_light_vector); // Light direction
                
                // Phong uses the reflection vector R
                vec3 R = reflect(-L, N); // Reflect L around the normal N
                
                float diffuse = max(dot(N, L), 0.0); // Diffuse term
                float specular = pow(max(dot(R, E), 0.0), smoothness); // Specular term
                
                // Light attenuation
                float attenuation = 1.0 / (1.0 + light_attenuation_factors[i] * distance_to_light * distance_to_light);
                
                // Calculate the contribution of this light source
                vec3 light_contribution = shape_color.xyz * light_colors[i].xyz * diffusivity * diffuse
                                        + light_colors[i].xyz * specularity * specular;
                result += attenuation * light_contribution;
            }
            return result;
        }

        void main() {
            // Compute an initial (ambient) color:
            vec4 color = vec4(shape_color.xyz * ambient, shape_color.w);
            // Compute the final color with contributions from lights:
            color.xyz += phong_model_lights(normalize(N), vertex_worldspace);
            gl_FragColor = color;
        }
    `;
    // Prepare uniforms
    const uniforms = {
        ambient: { value: materialProperties.ambient },
        diffusivity: { value: materialProperties.diffusivity },
        specularity: { value: materialProperties.specularity },
        smoothness: { value: materialProperties.smoothness },
        shape_color: { value: shape_color },
        squared_scale: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
        camera_center: { value: new THREE.Vector3() },
        model_transform: { value: new THREE.Matrix4() },
        projection_camera_model_transform: { value: new THREE.Matrix4() },
        light_positions_or_vectors: { value: [] },
        light_colors: { value: [] },
        light_attenuation_factors: { value: [] }
    };

    // Create the ShaderMaterial using the custom vertex and fragment shaders
    return new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        uniforms: uniforms
    });
}

// Update Phongshading matterials
function updateMaterial(ball, scene, camera) {
    const material = ball.material;
    if (!material.uniforms) {
        return;
    }

    const uniforms = material.uniforms;
    const numLights = 2;
    const lights = scene.children.filter(child => child.isLight).slice(0, numLights);
    // Ensure correct number of lights
    if (lights.length < numLights) {
        console.warn(`Expected ${numLights} lights, but found ${lights.length}. Padding with default lights.`);
    }

    // Update model_transform and projection_camera_model_transform
    ball.updateMatrixWorld();
    camera.updateMatrixWorld();

    uniforms.model_transform.value.copy(ball.matrixWorld);
    uniforms.projection_camera_model_transform.value.multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse
    ).multiply(ball.matrixWorld);

    // Update camera_center
    uniforms.camera_center.value.setFromMatrixPosition(camera.matrixWorld);

    // Update squared_scale (in case the scale changes)
    const scale = ball.scale;
    uniforms.squared_scale.value.set(
        scale.x * scale.x,
        scale.y * scale.y,
        scale.z * scale.z
    );

    // Update light uniforms
    uniforms.light_positions_or_vectors.value = [];
    uniforms.light_colors.value = [];
    uniforms.light_attenuation_factors.value = [];

    for (let i = 0; i < numLights; i++) {
        const light = lights[i];
        if (light) {
            let position = new THREE.Vector4();
            if (light.isDirectionalLight) {
                // For directional lights
                const lightDirection = new THREE.Vector3();
                lightDirection.subVectors(light.position, light.target.position).normalize();
                const direction = new THREE.Vector3(lightDirection.x, lightDirection.y, lightDirection.z).applyQuaternion(light.quaternion);
                position.set(direction.x, direction.y, direction.z, 0.0);
            } else if (light.position) {
                // For point lights
                position.set(light.position.x, light.position.y, light.position.z, 1.0);
            } else {
                // Default position
                position.set(0.0, 0.0, 0.0, 1.0);
            }
            uniforms.light_positions_or_vectors.value.push(position);

            // Update light color
            const color = new THREE.Vector4(light.color.r, light.color.g, light.color.b, 1.0);
            uniforms.light_colors.value.push(color);

            // Update attenuation factor
            let attenuation = 0.0;
            if (light.isPointLight || light.isSpotLight) {
                const distance = light.distance || 1000.0; // Default large distance
                attenuation = 1.0 / (distance * distance);
            } else if (light.isDirectionalLight) {
                attenuation = 0.0; // No attenuation for directional lights
            }
            // Include light intensity
            const intensity = light.intensity !== undefined ? light.intensity : 1.0;
            attenuation *= intensity;

            uniforms.light_attenuation_factors.value.push(attenuation);
        } else {
            // Default light values
            uniforms.light_positions_or_vectors.value.push(new THREE.Vector4(0.0, 0.0, 0.0, 0.0));
            uniforms.light_colors.value.push(new THREE.Vector4(0.0, 0.0, 0.0, 1.0));
            uniforms.light_attenuation_factors.value.push(0.0);
        }
    }
}

// Initialize the game
window.addEventListener('DOMContentLoaded', () => {
    const game = new PinballGame();
});