// Wait for DOM
document.addEventListener("DOMContentLoaded", () => {
    
    // 1. THREE.JS SETUP
    const canvas = document.getElementById('webgl-canvas');
    if (!canvas) return;

    const scene = new THREE.Scene();
    
    // Add subtle fog for depth
    scene.fog = new THREE.FogExp2('#020202', 0.0015);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    // Move camera back to see the core
    camera.position.z = 100;
    camera.position.y = 0;

    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true // Important for background color bleeding
    });
    
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor('#020202', 1);

    // 2. CREATE THE "PERFORMANCE CORE" (Geometric Wireframe Infrastructure)
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // Main Core - Icosahedron
    const coreGeometry = new THREE.IcosahedronGeometry(15, 1);
    const coreMaterial = new THREE.MeshBasicMaterial({
        color: 0x00F0FF,
        wireframe: true,
        transparent: true,
        opacity: 0.15
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    coreGroup.add(coreMesh);

    // Orbiting KPIs / Data Nodes (Points)
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 700;
    const posArray = new Float32Array(particlesCount * 3);

    for(let i=0; i < particlesCount * 3; i++) {
        // Spread particles out along the depth (Z-axis) to fly through them
        posArray[i] = (Math.random() - 0.5) * 200;
        // Extend Z vastly backwards so we scroll into it
        if (i%3 === 2) {
            posArray[i] = (Math.random() - 0.5) * 800 - 200;
        }
    }
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.8,
        color: 0xD4AF37,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });

    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

    // 3. MOUSE / CURSOR REACTIVITY
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const windowHalfX = window.innerWidth / 2;
    const windowHalfY = window.innerHeight / 2;

    document.addEventListener('mousemove', (event) => {
        mouseX = (event.clientX - windowHalfX);
        mouseY = (event.clientY - windowHalfY);
    });

    // 4. SCROLL TO CAMERA SYNC (GSAP)
    // We bind the camera's Z and Y position to the page scroll
    gsap.registerPlugin(ScrollTrigger);

    ScrollTrigger.create({
        trigger: "#scroll-proxy",
        start: "top top",
        end: "bottom bottom",
        scrub: 1, // Smooth dragging
        onUpdate: (self) => {
            // self.progress goes from 0 to 1
            // We fly from Z=100 into the scene to Z=-400
            gsap.to(camera.position, {
                z: 100 - (self.progress * 500),
                y: -(self.progress * 50),
                ease: "power2.out",
                duration: 0.5
            });
            
            // Rotate the core progressively with scroll
            gsap.to(coreGroup.rotation, {
                x: self.progress * Math.PI * 2,
                z: self.progress * Math.PI,
                duration: 1,
                ease: "power1.out"
            });
        }
    });

    // 5. HTML UI CSS ANTI-GRAVITY / PARALLAX
    const cards = document.querySelectorAll('.interactive-card');
    
    // We add a momentum effect using a continuous requestAnimationFrame loop for the cards
    let currentScroll = 0;
    let targetScroll = 0;
    
    window.addEventListener('scroll', () => {
        targetScroll = window.scrollY;
    });

    // 6. RENDER LOOP
    const clock = new THREE.Clock();

    function renderFrame() {
        const elapsedTime = clock.getElapsedTime();

        // Cursor Reactivity Lerp
        targetX = mouseX * 0.001;
        targetY = mouseY * 0.001;

        coreGroup.rotation.y += 0.002;
        coreGroup.rotation.x += 0.001;
        
        // Subtle drift for particles
        particlesMesh.rotation.y = elapsedTime * 0.05;
        // Make the entire scene subtly follow the mouse
        scene.rotation.x += 0.05 * (targetY - scene.rotation.x);
        scene.rotation.y += 0.05 * (targetX - scene.rotation.y);

        // Render WebGL
        renderer.render(scene, camera);

        // HTML Anti-Gravity Lerp (Smooth scrolling velocity calculation)
        // Interpolate current scroll towards target scroll
        currentScroll += (targetScroll - currentScroll) * 0.1;
        const velocity = targetScroll - currentScroll; // Delta
        
        cards.forEach((card, index) => {
            // Base transform includes a floating sine wave + velocity momentum
            const floatY = Math.sin(elapsedTime * 2 + index) * 5; 
            const momentumY = velocity * -0.05; // When scrolling down, cards lag slightly upward
            
            const rect = card.getBoundingClientRect();
            // If in viewport
            if(rect.top < window.innerHeight && rect.bottom > 0) {
                card.style.transform = `translateY(${floatY + momentumY}px)`;
            }
        });

        // Interactive Mouse hover overrides on individual cards
        cards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left - (rect.width/2);
                const y = e.clientY - rect.top - (rect.height/2);
                
                const rotateX = (y / (rect.height/2)) * -5;
                const rotateY = (x / (rect.width/2)) * 5;
                
                // Overlay on top of the animation loop
                card.style.transform = `translateY(0px) perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
            });
            
            // Clean up when mouse leaves is naturally handled by the next frame of renderFrame mapping it back to floatY
        });

        requestAnimationFrame(renderFrame);
    }

    renderFrame();

    // Resize Handler
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Subtly trigger reveal classes
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));
    
    // Mobile menu toggle logic
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mobileMenu = document.querySelector('.mobile-menu');
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('open');
            const icon = mobileMenuBtn.querySelector('i');
            if(mobileMenu.classList.contains('open')) {
                icon.classList.replace('fa-bars', 'fa-times');
            } else {
                icon.classList.replace('fa-times', 'fa-bars');
            }
        });
    }
});