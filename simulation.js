let scene, camera, renderer;
let physicsWorld;
let cup, cupBody;
let fluidParticles = [];
let stairs;

// Physics constants
const gravity = -9.82;
const cupMass = 1;
const particleCount = 100;
const particleMass = 0.01;

init();
animate();

function init() {
    // Scene setup
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;
    camera.position.y = 2;
    
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Physics world
    physicsWorld = new CANNON.World();
    physicsWorld.gravity.set(0, gravity, 0);

    // Create stairs
    createStairs();
    
    // Create cup
    createCup();
    
    // Create fluid particles
    createFluid();

    // Add lights
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Event listeners
    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('click', onClick, false);
    document.addEventListener('keydown', onKeydown, false);
}

function createCup() {
    // Create cup geometry
    const cupGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.5, 32);
    const cupMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
    cup = new THREE.Mesh(cupGeometry, cupMaterial);
    cup.position.y = 2.25; // Start at top of stairs
    cup.position.z = -1.6; // Start at top of stairs
    scene.add(cup);

    // Physics body for cup
    const cupShape = new CANNON.Cylinder(0.3, 0.3, 0.5, 32);
    cupBody = new CANNON.Body({
        mass: cupMass,
        shape: cupShape,
        position: new CANNON.Vec3(0, 2.25, -1.6) // Start at top of stairs
    });
    physicsWorld.addBody(cupBody);
}

function createStairs() {
    const stepHeight = 0.2;
    const stepDepth = 0.4;
    const numSteps = 5;

    for (let i = 0; i < numSteps; i++) {
        const geometry = new THREE.BoxGeometry(2, stepHeight, stepDepth);
        const material = new THREE.MeshPhongMaterial({ color: 0x808080 });
        const step = new THREE.Mesh(geometry, material);
        step.position.y = i * stepHeight;
        step.position.z = -i * stepDepth;
        scene.add(step);

        // Physics body for stairs
        const stepShape = new CANNON.Box(new CANNON.Vec3(1, stepHeight/2, stepDepth/2));
        const stepBody = new CANNON.Body({
            mass: 0,
            shape: stepShape,
            position: new CANNON.Vec3(0, i * stepHeight, -i * stepDepth)
        });
        physicsWorld.addBody(stepBody);
    }
}

function createFluid() {
    const particleGeometry = new THREE.SphereGeometry(0.02, 4, 4);
    const particleMaterial = new THREE.MeshPhongMaterial({ color: 0x0000FF });

    for (let i = 0; i < particleCount; i++) {
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        particle.position.set(
            Math.random() * 0.2 - 0.1,
            2.05,
            Math.random() * 0.2 - 0.1
        );
        scene.add(particle);
        fluidParticles.push({
            mesh: particle,
            body: new CANNON.Body({
                mass: particleMass,
                shape: new CANNON.Sphere(0.02),
                position: new CANNON.Vec3(particle.position.x, particle.position.y, particle.position.z)
            })
        });
        physicsWorld.addBody(fluidParticles[i].body);
    }
}

function onClick(event) {
    // Get mouse position
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Create raycaster
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    // Check if ray intersects with cup
    const intersects = raycaster.intersectObject(cup);
    if (intersects.length > 0) {
        // Calculate force based on click position
        const force = new CANNON.Vec3(
            (mouse.x * 2), // Apply force in x direction based on click position
            0,
            (mouse.y * 2) // Apply force in z direction based on click position
        );
        force.normalize();
        force.scale(15); // Increased force strength
        cupBody.applyForce(force, cupBody.position);
    }
}

function onKeydown(event) {
    if (event.key === 'r' || event.key === 'R') {
        resetSimulation();
    }
}

function resetSimulation() {
    // Reset cup
    cupBody.position.set(0, 2.25, -1.6); // Reset to top of stairs
    cupBody.velocity.set(0, 0, 0);
    cupBody.angularVelocity.set(0, 0, 0);

    // Reset fluid particles
    fluidParticles.forEach(particle => {
        particle.body.position.set(
            Math.random() * 0.2 - 0.1,
            2.05,
            Math.random() * 0.2 - 0.1
        );
        particle.body.velocity.set(0, 0, 0);
        particle.body.angularVelocity.set(0, 0, 0);
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    
    // Update physics
    physicsWorld.step(1/60);
    
    // Update cup position
    cup.position.copy(cupBody.position);
    cup.quaternion.copy(cupBody.quaternion);

    // Update fluid particles
    fluidParticles.forEach(particle => {
        particle.mesh.position.copy(particle.body.position);
        particle.mesh.quaternion.copy(particle.body.quaternion);
    });

    renderer.render(scene, camera);
}
