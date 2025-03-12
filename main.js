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

let temp;

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

        // Lights
        const ambientLight = new THREE.AmbientLight(0x404040);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(0, 10, 20);

        // Setting Shadow for lights
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        directionalLight.castShadow = true;
        ambientLight.castShadow = true;

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
        this.isLeftActive = false;
        this.isRightActive = false;
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
        this.checkCollision = this.checkCollision.bind(this);
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
        this.leftFlipper.position.set(-6.5, -11, (TABLE_CONS.tableDepth+FLIPPER_CONS.depth)/2);
        this.leftFlipper.rotation.z = -FLIPPER_CONS.init_angle;
        this.leftFlipperBox.userData.obb = new OBB();
        this.playField.add(this.leftFlipper);
        this.rightFlipperBox = new THREE.Mesh(flipperGeometry, flipperMaterial);
        // Shadow
        this.rightFlipperBox.castShadow = true;

        this.rightFlipper = new THREE.Group();
        this.rightFlipper.add(this.rightFlipperBox);
        this.rightFlipperBox.position.set(-FLIPPER_CONS.width/2, FLIPPER_CONS.height/2, 0);
        this.rightFlipper.position.set(6.5, -11, (TABLE_CONS.tableDepth+FLIPPER_CONS.depth)/2);
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

        this.ball.position.set(9, -10, 1);
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

    checkCollision() {
        if (!temp) {
            temp = this.leftFlipperBox.userData.obb;
        }
        else {
            if (temp.center !== this.leftFlipperBox.userData.obb.center) {
                console.log('center changed');
            }
        }
        // console.log(this.leftFlipperBox.userData.obb);
        // console.log(this.leftFlipperBox.userData.obb.intersectsOBB(this.leftFlipperBox.userData.obb));
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
        this.leftFlipperBox.userData.obb.copy(this.leftFlipperBox.geometry.userData.obb);
        this.leftFlipperBox.updateMatrixWorld(true);
        this.leftFlipperBox.userData.obb.applyMatrix4(this.leftFlipperBox.matrixWorld);
        console.log(this.leftFlipperBox.matrixWorld);
        //this.updatePhysics(deltaTime);

        // Update Phong shading matterial
        updateMaterial(this.ball, this.scene, this.camera);

        this.renderer.render(this.scene, this.camera);
        this.stats.update();
    }

}

function createOBB(mesh) {
    // Create a new OBB based on the mesh's geometry
    const obb = new OBB();
    
    // Get the mesh's geometry
    const geometry = mesh.geometry;
    
    // We need the vertices to compute the OBB
    const vertices = [];
    const positionAttribute = geometry.getAttribute('position');
    
    // Extract vertices from the geometry
    for (let i = 0; i < positionAttribute.count; i++) {
        const vertex = new THREE.Vector3();
        vertex.fromBufferAttribute(positionAttribute, i);
        vertices.push(vertex);
    }
    
    // Set the OBB from points
    obb.fromPoints(vertices);
    
    // Update the OBB to match the mesh's current position, rotation, and scale
    updateOBB(mesh, obb);
    
    return obb;
}

function updateOBB(mesh, obb) {
    // We need to transform the OBB to match the mesh's world transformation
    
    // Clone mesh's world matrix
    const worldMatrix = mesh.matrixWorld.clone();
    
    // Extract position, rotation, and scale from the world matrix
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    worldMatrix.decompose(position, quaternion, scale);
    
    // Apply rotation to the OBB
    obb.rotation.copy(quaternion);
    
    // Apply position to the OBB
    obb.center.copy(position);
    
    // Apply scale to the OBB (if needed)
    // This depends on how your OBB implementation handles scale
    obb.halfSize.x *= scale.x;
    obb.halfSize.y *= scale.y;
    obb.halfSize.z *= scale.z;
    
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