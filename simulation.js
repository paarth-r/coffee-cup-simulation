let scene, camera, renderer;
let physicsWorld;
let cup, cupBody;
let fluidParticles = [];
let stairs;

// Physics constants
const gravity = -9.82;
const cupMass = 1;
const particleCount = 1000;
const particleMass = 0.0005;

let isCupClicked = false;

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

    // Add text
    const loader = new THREE.FontLoader();
    loader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/fonts/helvetiker_regular.typeface.json', function (font) {
        const textGeometry = new THREE.TextGeometry('Throwing AI (and coffee) at everything.', {
            font: font,
            size: 0.8, // Much larger text
            height: 0.05,
            curveSegments: 12,
            bevelEnabled: true,
            bevelThickness: 0.05,
            bevelSize: 0.05,
            bevelOffset: 0,
            bevelSegments: 5
        });
        
        const textMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFFFF }); // White text
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        
        // Center the text using its bounding box
        const box = new THREE.Box3().setFromObject(textMesh);
        const center = box.getCenter(new THREE.Vector3());
        textMesh.position.x = -center.x;
        textMesh.position.y = 6;
        textMesh.position.z = -3;
        textMesh.rotation.x = 0; // Horizontal orientation
        textMesh.rotation.y = 0; // No rotation around y
        textMesh.rotation.z = 0; // No rotation around z
        scene.add(textMesh);
    });

    // Physics world
    physicsWorld = new CANNON.World();
    physicsWorld.gravity.set(0, gravity, 0);
    physicsWorld.defaultContactMaterial.friction = 0.1;
    physicsWorld.defaultContactMaterial.restitution = 0.01; // Much less bouncy
    physicsWorld.solver.iterations = 10; // More accurate physics

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
    // Create cup geometry (taller and thinner)
    const cupGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.8, 32);
    const cupMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFFFF }); // White cup
    cup = new THREE.Mesh(cupGeometry, cupMaterial);
    cup.position.set(0, 2.25, -1.6); // Start at top of stairs
    scene.add(cup);

    // Add Starbucks logo
    const logoMaterial = new THREE.MeshPhongMaterial({ color: 0x006B3C }); // Starbucks green
    const logoGeometry = new THREE.CircleGeometry(0.1, 32);
    const logoMesh = new THREE.Mesh(logoGeometry, logoMaterial);
    logoMesh.position.set(0, 0.4, 0); // Centered vertically on thinner cup
    logoMesh.rotation.y = Math.PI; // Rotate to face the camera
    cup.add(logoMesh); // Add logo as a child of the cup

    // Create physics body with matching dimensions using Box shape
    const cupShape = new CANNON.Box(new CANNON.Vec3(0.2, 0.4, 0.2)); // Box dimensions (width, height, depth)
    cupBody = new CANNON.Body({
        mass: cupMass,
        shape: cupShape,
        position: new CANNON.Vec3(0, 2.25, -1.6),
        linearDamping: 0.95,
        angularDamping: 0.95
    });

    // Adjust position to match cup mesh
    cupBody.position.set(0, 2.25, -1.6);
    physicsWorld.addBody(cupBody);
}

function createStairs() {
    const stepHeight = 0.2;
    const stepDepth = 0.4;
    const numSteps = 5;
    const stepsGroup = new THREE.Group();
    scene.add(stepsGroup);

    for (let i = 0; i < numSteps; i++) {
        // Create solid step
        const geometry = new THREE.BoxGeometry(2, stepHeight, stepDepth);
        const material = new THREE.MeshPhongMaterial({ color: 0x808080 });
        const step = new THREE.Mesh(geometry, material);
        step.position.y = i * stepHeight;
        step.position.z = -i * stepDepth;
        stepsGroup.add(step);

        // Create wireframe for step
        const wireframe = new THREE.WireframeGeometry(geometry);
        const line = new THREE.LineSegments(wireframe, new THREE.LineBasicMaterial({ color: 0x000000 }));
        line.position.y = i * stepHeight;
        line.position.z = -i * stepDepth;
        stepsGroup.add(line);

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
    const particleMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x654321, // Rich coffee brown
        shininess: 50,  // More shiny
        specular: 0x404040
    });

    for (let i = 0; i < particleCount; i++) {
        // Position particles at the top of the cup
        const angle = Math.random() * Math.PI * 2;
        const radius = 0.18 * Math.random(); // Smaller radius to match cup
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = 2.65; // Position at top of cup
        
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        particle.position.set(x, y, z - 1.6);
        scene.add(particle);
        
        const particleShape = new CANNON.Sphere(0.02);
        const particleBody = new CANNON.Body({
            mass: particleMass,
            shape: particleShape,
            restitution: 0.01, // Much less bouncy
            friction: 0.1,
            linearDamping: 0.85, // Less damping for less viscosity
            angularDamping: 0.85,
            linearFactor: new CANNON.Vec3(1, 1, 1), // Allow movement in all directions
            angularFactor: new CANNON.Vec3(1, 1, 1) // Allow rotation in all directions
        });
        particleBody.position.set(x, y, z - 1.6); // Use the same y position as the visual particle
        physicsWorld.addBody(particleBody);
        
        fluidParticles.push({
            mesh: particle,
            body: particleBody
        });
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
    if (intersects.length > 0 && !isCupClicked) {
        // Calculate force based on click position
        const force = new CANNON.Vec3(
            (mouse.x * 2), // Apply force in x direction based on click position
            0,
            (mouse.y * 2) // Apply force in z direction based on click position
        );
        force.normalize();
        force.scale(15); // Increased force strength
        cupBody.applyForce(force, cupBody.position);
        isCupClicked = true;
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
    isCupClicked = false;

    // Reset fluid particles
    fluidParticles.forEach(particle => {
        // Position particles at the very top of the cup
        const angle = Math.random() * Math.PI * 2;
        const radius = 0.18 * Math.random(); // Smaller radius to match cup
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = 2.65; // Slightly above cup rim (2.25 base + 0.8 height + 0.05)
        
        particle.body.position.set(x, y, z - 1.6);
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
