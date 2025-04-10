import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import Stats from 'three/addons/libs/stats.module.js';
import { OBB } from 'three/addons/math/OBB.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
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
    DIFFICULTY,
} from './constants';
import { FontLoader } from 'three/examples/jsm/Addons.js';
import { rand } from 'three/tsl';

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
        this.gravity = new THREE.Vector3(0, META.gravity, 0);
        this.bumpers = [];
        this.walls = [];
        this.speedBumps = [];
        // Launcher
        this.launchStick = null;
        this.launchBarrier = [];
        // Arch
        this.arc = [];

        // Ramp
        this.ramp = [];

        // Wormholes
        this.wormholes = [];
        this.inHole = false;

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

        // Difficulty
        this.settings = {
            difficulty: 1,
            ratio: 1,
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
        this.fontLoader = null;
        this.textGeometry = null;
        this.init();
        
    }

    init(){
        this.createTable();
        this.createFlippers();
        this.createBumpers();
        this.createSpeedBump();
        this.createBall();
        this.createLauncher();
        this.createRamp();
        this.createArch();
        this.scoreBoard();
        this.createButtons();
        this.createSound();
        this.createScoreBoard();
        this.createWormholes();
        this.playField.rotateX(-PLAY_FIELD_CONS.tilt_angle);
        this.scene.add(this.playField);
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
        window.addEventListener('resize', this.onWindowResize, false);
        this.animate();
        
        
    }

    createScoreBoard() {
        
        this.fontLoader = new FontLoader();
        this.fontLoader.load('assets/helvetiker_regular.typeface.json', (font) => {
            let textGeometry = new TextGeometry(`Score: ${this.score}`, {
                font: font,
		        size: 2,
		        depth: 0.5,
		        curveSegments: 12,
            });
            const textMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
            const scoreBoardMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
            const scoreBoardGeometry = new THREE.BoxGeometry(20, 5, 0);
            const scoreBoardBackGround = new THREE.Mesh(scoreBoardGeometry, scoreBoardMaterial);
            scoreBoardBackGround.position.set(0, 16, 0);
            this.scene.add(scoreBoardBackGround);
            this.scoreBoard = new THREE.Mesh(textGeometry, textMaterial);
            this.scoreBoard.position.set(-5, 15, 0);
            this.scene.add(this.scoreBoard);
        });
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
        topWall.castShadow = true;

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

         // Lower right wall
         width = 2.3;
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
        barrier.position.set(BALL_CONS.init_x - BALL_CONS.radius - LAUNCHER_CONS.barrier_width/2 -0.1, BALL_CONS.init_y+0.2, LAUNCHER_CONS.barrier_depth);
        this.playField.add(barrier);
        this.walls.push(barrier);

        // Corner
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
    createRamp(){
        let width = -6.5 + (TABLE_CONS.tableWidth+TABLE_CONS.wallWidth)/2;
        let height = 8;
        let depth = TABLE_CONS.tableDepth;
        // left ramp
        height = Math.sqrt(2)*width;
        width = 1;

        const leftRampGeometry = new THREE.BoxGeometry(width, height, depth);
        const leftRampTexture = new THREE.TextureLoader().load('assets/wood.jpg');
        leftRampTexture.wrapS = THREE.RepeatWrapping;
        leftRampTexture.wrapT = THREE.RepeatWrapping;
        const leftRampMaterial = new THREE.MeshStandardMaterial({ map: leftRampTexture });
        const leftRamp = new THREE.Mesh(leftRampGeometry, leftRampMaterial);

        // Shadow
        leftRamp.castShadow = true;

        width = -6.5 + (TABLE_CONS.tableWidth+TABLE_CONS.wallWidth)/2;
        leftRamp.rotateZ(Math.PI/4);
        leftRamp.position.set(-6 - width/2-0.3, -TABLE_CONS.tableHeight/2+8+height/2-1.2, depth-0.01);
        this.playField.add(leftRamp);
        this.ramp.push(leftRamp);

        // right ramp
        height = Math.sqrt(2)*2.4;
        width = 0.5;

        const rightRampGeometry = new THREE.BoxGeometry(width, height, depth);
        const rightRampTexture = new THREE.TextureLoader().load('assets/wood.jpg');
        rightRampTexture.wrapS = THREE.RepeatWrapping;
        rightRampTexture.wrapT = THREE.RepeatWrapping;
        const rightRampMaterial = new THREE.MeshStandardMaterial({ map: rightRampTexture });
        const rightRamp = new THREE.Mesh(rightRampGeometry, rightRampMaterial);

        // Shadow
        rightRamp.castShadow = true;

        width = -6.5 + (TABLE_CONS.tableWidth+TABLE_CONS.wallWidth)/2;
        rightRamp.rotateZ(-Math.PI/4);
        rightRamp.position.set(6 + width/2 - 0.6, -TABLE_CONS.tableHeight/2+8+height/2-0.7, depth-0.01);
        this.playField.add(rightRamp);
        this.ramp.push(rightRamp);
    }

    // Create Arch
    createArch(){

        const width = 6, height = 6;
        const concave = new THREE.Shape();
        concave.moveTo(-width / 2, height / 2);  //Top left
        concave.lineTo(width / 2, height / 2);   //Top right
        concave.lineTo(width / 2, -height / 2);  //Bottom right

        // Concave arc
        const radius = 6;
        concave.absarc(-width/2, -height / 2, radius, 0, Math.PI/2, false);

        const extrudeSettings = { depth: TABLE_CONS.wallDepth/2, bevelEnabled: false };

        // Create 3D geometry by extruding the shape
        const geometry = new THREE.ExtrudeGeometry(concave, extrudeSettings);

        const texture = new THREE.TextureLoader().load('assets/wood.jpg');
        const material = new THREE.MeshPhongMaterial({ map: texture });

        const concaveBox = new THREE.Mesh(geometry, material);
        // Shadow
        concaveBox.castShadow = true;

        concaveBox.position.set(TABLE_CONS.tableWidth/2-width/2, TABLE_CONS.tableHeight/2-height/2, TABLE_CONS.wallDepth/4);
        this.arcOrigin = new THREE.Vector3(TABLE_CONS.tableWidth/2-width/2, TABLE_CONS.tableHeight/2-height/2, TABLE_CONS.wallDepth/4);
        this.playField.add(concaveBox);
        
        // Bounding Box with Segments
        const edges = new THREE.EdgesGeometry(concaveBox.geometry);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffff00 });
        const bounding = new THREE.LineSegments(edges, lineMaterial);
        bounding.position.set(TABLE_CONS.tableWidth/2-width/2, TABLE_CONS.tableHeight/2-height/2, TABLE_CONS.wallDepth/4);
        bounding.updateWorldMatrix(true);
        concaveBox.add(bounding);
        this.playField.add(bounding);
        if (!VISUALIZE_BOUNDING_BOX) {
            bounding.visible = false;
        }
        concaveBox.bounding = bounding;
        this.arc.push(concaveBox);
    }

    createWormholes(){
        const wormholeGeometry = new THREE.CylinderGeometry(1.2, 1.2, 1.2, 32);
        const wormholeMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
        const wormhole1 = new THREE.Mesh(wormholeGeometry, wormholeMaterial);
        wormhole1.position.set(0, 11, 0);
        wormhole1.rotation.x = Math.PI/2;
        this.wormholes.push(wormhole1);
        this.playField.add(wormhole1);

        const wormhole2 = new THREE.Mesh(wormholeGeometry, wormholeMaterial);
        wormhole2.position.set(0, -5, 0);
        wormhole2.rotation.x = Math.PI/2;
        this.wormholes.push(wormhole2);
        this.playField.add(wormhole2);

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
        let oldScore = this.firstThree['Current Score'];
        this.firstThree['Current Score'] = this.score;
        if (oldScore !== this.score) {
            this.fontLoader.load('assets/helvetiker_regular.typeface.json', (font) => {
                let textGeometry = new TextGeometry(`Score: ${this.score}`, {
                    font: font,
                    size: 2,
                    depth: 0.5,
                    curveSegments: 12,
                });
                this.scoreBoard.geometry = null;
                this.scoreBoard.geometry = textGeometry;
                textGeometry = null;
            });
        }
        
    }

    createButtons(){
        const folder = this.gui.addFolder('Game Settings');
        folder.add(this.settings, 'difficulty', 1, 5, 1).onChange().listen((value) => {
            this.settings.difficulty = value;});
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
            this.settings.difficulty = 0;
            this.settings.ratio = 1;
        }
    }

    playSound(sound = 'assets/hitball.mp3', setVolume = 0.5) {
        this.audioLoader.load(sound, (buffer) => {
            const sound = new THREE.Audio(this.audioListener);
            sound.setBuffer(buffer);
            sound.setVolume(0.5);
            sound.play();
        });
    }

    updatePhysics(delta){
        // this.ball.obb = createOBBFromObject(this.ball);
        if (this.gameStart && this.isLaunched) {
            this.ballVelocity.add(this.gravity.clone().multiplyScalar(delta));
            if (this.ballVelocity.length() > META.maxSpeed) {
                this.ballVelocity.normalize().multiplyScalar(Math.sqrt(META.maxSpeed**2/3));
                console.log(this.ballVelocity);
            }
            this.ball.position.add(this.ballVelocity.clone().multiplyScalar(delta));
        }
        this.ballVelocity.z = 0;
        this.ball.position.z = BALL_CONS.init_z;

        // boundary check
        const tableWidth = TABLE_CONS.tableWidth/2 - BALL_CONS.radius - 0.1;
        const tableHeight = TABLE_CONS.tableHeight/2 - BALL_CONS.radius - 0.1;
        if (this.ball.position.x > tableWidth || this.ball.position.x < -tableWidth) {
            this.ballVelocity.x = -this.ballVelocity.x;
            this.ball.position.x = Math.max(Math.min(this.ball.position.x, tableWidth), -tableWidth);
            this.playSound();
        }

        if (this.ball.position.y > tableHeight) {
            this.ballVelocity.y = -this.ballVelocity.y;
            this.ball.position.y = Math.max(Math.min(this.ball.position.y, tableHeight), -tableHeight);
            this.playSound();
        }
    }

    handleCollision(deltaTime) {
        //this.score += 1;
        this.ball.obb = createOBBFromObject(this.ball);
        this.handleLauncherCollision(deltaTime);
        this.handleFlipperCollision(deltaTime);
        this.handleBumperCollision(deltaTime);
        this.handleWallCollision(deltaTime);
        this.handleArcCollision(deltaTime);
        this.handleSpeedBumperCollision(deltaTime);
        this.handleRampCollision(deltaTime);
        this.handleWormholesCollision(deltaTime);
    }

    handleBounce(result) {
        // handle bounce of ball
        const normal = result.normal;
        const velocity = this.ballVelocity.clone();
        const dot = velocity.dot(normal);
        const bounceVelocity = velocity.clone().sub(normal.clone().multiplyScalar(2 * dot));
        bounceVelocity.multiplyScalar(META.bounce_factor*this.settings.ratio);
        this.ballVelocity.copy(bounceVelocity);
        const pushDistance = BALL_CONS.radius - result.distance + 0.05;
        this.ball.position.add(normal.clone().multiplyScalar(pushDistance));

        // sound
        this.audioLoader.load('assets/hitball.mp3', (buffer) => {
            const sound = new THREE.Audio(this.audioListener);
            sound.setBuffer(buffer);
            sound.setVolume(0.5);
            sound.play();
        });
    }

    handleLauncherCollision(deltaTime){
        const ballPos = new THREE.Vector3();
        this.ball.getWorldPosition(ballPos);
        this.launchStick.obb = createOBBFromObject(this.launchStick);
        this.previousStickCollision = false;
        if (this.ball.obb.intersectsOBB(this.launchStick.obb) && ballPos.y > -TABLE_CONS.tableHeight/2+3+BALL_CONS.radius) { 
                 
            if (!this.isLaunched &&!this.holdingLauncher) {
                this.isAttachedToLauncher = true;
                this.ballVelocity.set(0, 0, 0);
            }
            if (this.holdingLauncher && this.isAttachedToLauncher) {
                this.previousHoldingLauncher = this.holdingLauncher;
                this.ball.position.y -= (LAUNCHER_CONS.holding_speed * deltaTime);
            }
            if (this.isLaunched && !this.previousStickCollision && this.ballVelocity.y < 0) {
                this.reset = true;
                return;
            }
            this.previousStickCollision = true;       
        }
        this.previousStickCollision = false; 
        if (!this.holdingLauncher && this.previousHoldingLauncher && this.isAttachedToLauncher){
            const launchPower = Math.min((LAUNCHER_CONS.init_y - this.launchStick.position.y) * 20 , LAUNCHER_CONS.max_power);
            this.ballVelocity.set(0, launchPower, 0); 
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
        // right flipper
        this.rightFlipperBox.obb = createOBBFromObject(this.rightFlipperBox);
        if (this.ball.obb.intersectsOBB(this.rightFlipperBox.obb)) {
            const result = flipperCollisionHelper(this.ball, this.rightFlipperBox, this.rightFlipper, this.playField);
            if (result.collision) {
                this.handleBounce(result);
                // if active increase speed
                if (this.isRightActive) {
                    this.ballVelocity.multiplyScalar(1.3);
                } else {
                    this.ballVelocity.multiplyScalar(0.8);
                }
            }
        }
        // left flipper
        this.leftFlipperBox.obb = createOBBFromObject(this.leftFlipperBox);
        if (this.ball.obb.intersectsOBB(this.leftFlipperBox.obb)) {
            const result = flipperCollisionHelper(this.ball, this.leftFlipperBox, this.leftFlipper, this.playField);
            if (result.collision) {
                this.handleBounce(result);
                // if active increase speed
                if (this.isLeftActive) {
                    this.ballVelocity.multiplyScalar(1.3);
                }
            }
        }
    }

    handleWallCollision(deltaTime) {
        // make it two phased collision detection. 
        // first test with OBB
        // then test with sphere-to-box distance
        for (let i = 0; i < this.walls.length; i++) {
            const wall = this.walls[i];
            wall.obb = createOBBFromObject(wall);
            if (this.ball.obb.intersectsOBB(wall.obb)) {
                // second test
                const result = sphereCollision(this.ball, wall);
                if (result.collision){
                    this.handleBounce(result);
                }
            }
        }

    }

    handleArcCollision(deltaTime){
        // To Do
        //console.log(this.arc[0].bounding);
        this.arc[0].updateMatrixWorld(true);
        const interLines = checkArcCollision(this.arc[0].bounding, this.ball);
        if (interLines.length > 0) {

            let ballPos = new THREE.Vector3(this.ball.position.x, this.ball.position.y, 0);
            let origin = new THREE.Vector3(this.arcOrigin.x-3, this.arcOrigin.y-3, 0);
            
            let normal = origin.clone().sub(ballPos).normalize();
            let velocity = this.ballVelocity.clone().normalize();
            let dot = velocity.dot(normal);
            if (dot <= 0.1) {
                this.ballVelocity = this.ballVelocity.reflect(normal).multiplyScalar(0.98);
                this.ballVelocity.z = 0;
            } 
        }

    }

    handleBumperCollision(deltaTime){
        for (let i = 0; i < this.bumpers.length; i++) {
            const ballPos = new THREE.Vector3(this.ball.position.x, this.ball.position.y, 0);
            const bumperPos = new THREE.Vector3(this.bumpers[i].position.x, this.bumpers[i].position.y, 0);
            const distance = ballPos.distanceTo(bumperPos);
            if (distance <=  BALL_CONS.radius + BUMPER_CONS.radius) {

                const normal = ballPos.clone().sub(bumperPos).normalize();
                this.audioLoader.load('assets/hitball.mp3', (buffer) => {
                    const sound = new THREE.Audio(this.audioListener);
                    sound.setBuffer(buffer);
                    sound.setVolume(0.5);
                    sound.play();
                });

                // random direction
                let randX = Math.random();
                let randY = Math.random();
                let randomAdder = new THREE.Vector3(randX, randY, 0); 
                randomAdder.normalize();
                randomAdder.multiplyScalar(0.1);
                randomAdder.z = 0;
                
                this.ballVelocity = this.ballVelocity.multiplyScalar(-0.88).add(randomAdder);
                
                const pushDistance = BALL_CONS.radius + BUMPER_CONS.radius - distance + 0.03;
                this.ball.position.add(normal.clone().multiplyScalar(pushDistance));
                
                // this.ballVelocity.z = 0;
                this.score += 1;
            }
            //console.log(this.ballVelocity);
        }

    }

    handleSpeedBumperCollision(delta){
        // accelerate the ball once it hits the speed bump
        for (let i = 0; i < this.speedBumps.length; i++) {
            const bumper = this.speedBumps[i];
            if (bumper.userData.hasCollide) {
                continue;
            }

            bumper.obb = createOBBFromObject(bumper);
            if (this.ball.obb.intersectsOBB(bumper.obb)) {
                const result = sphereCollision(this.ball, bumper);
                if (result.collision) {
                    this.ballVelocity.multiplyScalar(SPEED_BUMPER_CONS.speed_factor);
                    //this.ball.position.add(this.ballVelocity.clone().multiplyScalar(delta));
                    this.score += 1;

                    bumper.userData.hasCollide = true;
                    this.playSound('assets/sword.mp3', 1);
                    setTimeout(() => {
                        bumper.userData.hasCollide = false;
                    }, 1000);
                }
            }
        }
    }

    handleRampCollision(delta){
        for (let i = 0; i < this.ramp.length; i++) {
            const ramp = this.ramp[i];
            ramp.obb = createOBBFromObject(ramp);
            if (this.ball.obb.intersectsOBB(ramp.obb)) {
                const result = rampCollisionHelper(this.ball, ramp, this.playField);
                if (result.collision) {
                    this.handleBounce(result);
                }
            }
        }
    }

    handleWormholesCollision(delta){
        for (let i = 0; i < this.wormholes.length; i++) {
            // if hit the wormhole, teleport the ball to the other hole
            const wormhole = this.wormholes[i];
            const ballPos = new THREE.Vector3(this.ball.position.x, this.ball.position.y, 0);
            const wormholePos = new THREE.Vector3(wormhole.position.x, wormhole.position.y, 0);
            const distance = ballPos.distanceTo(wormholePos);
            if (distance <= 1.2 && !this.inHole) {
                // teleport to the other wormhole, speed unchanged, change direction
                this.inHole = true;
                const otherWormhole = this.wormholes[(i + 1) % this.wormholes.length];
                this.ball.position.set(otherWormhole.position.x, otherWormhole.position.y, BALL_CONS.init_z);
                const speed = this.ballVelocity.length();
                const randomAngle = Math.random() * Math.PI * 2;
                const randomDirection = new THREE.Vector3(Math.cos(randomAngle), Math.sin(randomAngle), 0);
                this.ballVelocity = randomDirection.multiplyScalar(speed);
                this.score += 5;
                this.playSound('assets/zoom.mp3', 0.3);
                setTimeout(() => {
                    this.inHole = false;
                }, 500);
            } 
        }
       
    }

    checkGameState(){
        const ballPos = new THREE.Vector3();
        this.ball.getWorldPosition(ballPos);
        if(ballPos.y < -TABLE_CONS.tableHeight/2) {
            this.reset = true;
            this.history.push(this.score);
        } else {
            const new_difficulty = Math.min(Math.floor(this.score / 10 + 1), 5);
            if (new_difficulty > this.settings.difficulty) {
                this.settings.difficulty = new_difficulty;
            } 
            switch (this.settings.difficulty){
                case 1:
                    this.gravity.y = DIFFICULTY.level_1;
                    this.settings.ratio = 1;
                    break;
                case 2:
                    this.gravity.y = DIFFICULTY.level_2;
                    this.settings.ratio = 1.05;
                    break;
                case 3:
                    this.gravity.y = DIFFICULTY.level_3;
                    this.settings.ratio = 1.7;
                    break;
                case 4:
                    this.gravity.y = DIFFICULTY.level_4;
                    this.settings.ratio = 1.19;
                    break;
                case 5:
                    this.gravity.y = DIFFICULTY.level_5;
                    this.settings.ratio = 1.21;
                    break;
            }

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

function sphereCollision(sphere, obj){
    // closest point on the box to the sphere center
    // find the center of the ball
    const sphereCenter = sphere.position; // local position
    // find min and max of the box in local space
    const box = obj.geometry.boundingBox;
    const boxMin = new THREE.Vector3(box.min.x, box.min.y, box.min.z);
    boxMin.applyMatrix4(obj.matrix);
    const boxMax = new THREE.Vector3(box.max.x, box.max.y, box.max.z);
    boxMax.applyMatrix4(obj.matrix);
    // find the closest point on the box to the sphere center
    const closestPoint = new THREE.Vector3(
        Math.max(boxMin.x, Math.min(sphereCenter.x, boxMax.x)),
        Math.max(boxMin.y, Math.min(sphereCenter.y, boxMax.y)),
        Math.max(boxMin.z, Math.min(sphereCenter.z, boxMax.z))
    );
    // find the distance between the sphere center and the closest point on the box
    const distance = sphereCenter.distanceTo(closestPoint);
    // check if the distance is less than the sphere radius
    if (distance <= BALL_CONS.radius) {
        // calculate the normal vector
        const normal = sphereCenter.clone().sub(closestPoint).normalize();
        return {
            collision: true,
            distance: distance,
            normal: normal,
            point: closestPoint
        };
    }

    return {
        collision: false,
    }
}

function flipperCollisionHelper(sphere, flipperBox, flipper, playField) {
    // Make sure all matrices are up to date
    playField.updateMatrixWorld(true);
    flipper.updateMatrixWorld(true);
    flipperBox.updateMatrixWorld(true);
    sphere.updateMatrixWorld(true);
    
    // Get sphere's world position
    const sphereWorldPos = new THREE.Vector3();
    sphere.getWorldPosition(sphereWorldPos);
    
    // Transform sphere position to flipperBox's local space using the world matrix inverse
    const flipperBoxWorldInverse = flipperBox.matrixWorld.clone().invert();
    const localSpherePos = sphereWorldPos.clone().applyMatrix4(flipperBoxWorldInverse);
    
    // Get flipperBox's bounding box in its local space
    const boxMin = flipperBox.geometry.boundingBox.min.clone();
    const boxMax = flipperBox.geometry.boundingBox.max.clone();
    
    // Find closest point on the box to the sphere in local space
    const localClosestPoint = new THREE.Vector3(
        Math.max(boxMin.x, Math.min(localSpherePos.x, boxMax.x)),
        Math.max(boxMin.y, Math.min(localSpherePos.y, boxMax.y)),
        Math.max(boxMin.z, Math.min(localSpherePos.z, boxMax.z))
    );
    
    // Calculate distance in local space
    const distance = localSpherePos.distanceTo(localClosestPoint);
    const isColliding = distance <= BALL_CONS.radius;

    // log
    // console.log("localSpherePos", localSpherePos, "localClosestPoint", localClosestPoint, "distance", distance, "isColliding", isColliding);
    
    if (isColliding) {
        // transform closest point to playField's local space
        const playFieldWorldInverse = playField.matrixWorld.clone().invert();
        const closestPoint = localClosestPoint.clone().applyMatrix4(flipperBox.matrixWorld).applyMatrix4(playFieldWorldInverse);
        
        // calculate the normal in playField's local space
        const normal = sphere.position.clone().sub(closestPoint).normalize();
        // set z component to 0
        normal.z = 0;
        normal.normalize();
        
        // Calculate penetration depth
        const penetrationDepth = BALL_CONS.radius - distance;

        // log
        // console.log("closestPoint", closestPoint, "collisionNormal", normal, "penetrationDepth", penetrationDepth);
        
        return {
            collision: true,
            normal: normal,
            distance: distance,
            point: closestPoint
        };
    }
    
    return {
        collision: false
    };
}

function rampCollisionHelper(sphere, ramp, playField){
    const sphereWorldPos = new THREE.Vector3();
    sphere.getWorldPosition(sphereWorldPos);
    const rampWorldInverse = ramp.matrixWorld.clone().invert();
    const localSpherePos = sphereWorldPos.clone().applyMatrix4(rampWorldInverse);
    const boxMin = ramp.geometry.boundingBox.min.clone();
    const boxMax = ramp.geometry.boundingBox.max.clone();
    const localClosestPoint = new THREE.Vector3(
        Math.max(boxMin.x, Math.min(localSpherePos.x, boxMax.x)),
        Math.max(boxMin.y, Math.min(localSpherePos.y, boxMax.y)),
        Math.max(boxMin.z, Math.min(localSpherePos.z, boxMax.z))
    );
    const distance = localSpherePos.distanceTo(localClosestPoint);
    const isColliding = distance <= BALL_CONS.radius;
    if (isColliding) {
        const closestPoint = localClosestPoint.clone().applyMatrix4(ramp.matrixWorld).applyMatrix4(playField.matrixWorld.clone().invert());
        const normal = sphere.position.clone().sub(closestPoint).normalize();
        return {
            collision: true,
            normal: normal,
            distance: distance,
            point: closestPoint
        };
    }
        
    return {
        collision: false,
    }
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

function checkArcCollision(lineSegments, ball) {
    //Update World Matrix
    lineSegments.updateWorldMatrix(true);
    ball.updateWorldMatrix(true);

    //Raycaster for each segments of bounding
    const raycaster = new THREE.Raycaster();
    //Vertices of each segments
    const vertices = lineSegments.geometry.attributes.position.array;
    const intersections = [];

    for (let i = 0; i < vertices.length; i += 6) {
        //The two ends of segments with xyz position
        const startPoint = new THREE.Vector3(vertices[i], vertices[i + 1], vertices[i + 2]);
        const endPoint = new THREE.Vector3(vertices[i + 3], vertices[i + 4], vertices[i + 5]);

        //Convert to world space
        startPoint.applyMatrix4(lineSegments.matrixWorld);
        endPoint.applyMatrix4(lineSegments.matrixWorld);

        const directionVector = new THREE.Vector3().subVectors(endPoint, startPoint).normalize();

        //Set raycaster from start to end of the segment
        raycaster.set(startPoint, directionVector);
        raycaster.far = startPoint.distanceTo(endPoint);

        //Check intersection
        const intersects = raycaster.intersectObject(ball, true);
        if (intersects.length > 0) {
            intersections.push({ index: i / 6, point: intersects[0].point });
        }
    }

    return intersections;
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