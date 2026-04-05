// Wait for DOM
document.addEventListener("DOMContentLoaded", () => {

    // 1. THREE.JS SETUP
    const canvas = document.getElementById('webgl-canvas');
    if (!canvas) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2('#020202', 0.0015);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 100;
    camera.position.y = 0;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor('#020202', 1);

    // 2. GLOBE — "PERFORMANCE CORE"
    const coreGroup = new THREE.Group();
    const isMobile = window.innerWidth <= 480;

    // Mobile: sit ~30% from top (below navbar, clear gap above headline)
    // Desktop: offset right-bottom for two-column hero layout
    coreGroup.position.y = isMobile ? 30 : -25;
    coreGroup.position.x = isMobile ? 0 : 15;
    scene.add(coreGroup);

    const coreGeometry = new THREE.IcosahedronGeometry(15, 1);
    const coreMaterial = new THREE.MeshBasicMaterial({
        color: 0x00F0FF, wireframe: true, transparent: true, opacity: 0.15
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    coreGroup.add(coreMesh);

    // 3. PARTICLES
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 700;
    const posArray = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 200;
        if (i % 3 === 2) posArray[i] = (Math.random() - 0.5) * 800 - 200;
    }
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.8, color: 0xD4AF37, transparent: true, opacity: 0.6,
        blending: THREE.AdditiveBlending
    });
    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

    // 4. MOUSE / TOUCH REACTIVITY
    // targetX/Y drive scene.rotation lerp — both mouse and touch write to them
    let mouseX = 0, mouseY = 0;
    let targetX = 0, targetY = 0;
    const windowHalfX = window.innerWidth / 2;
    const windowHalfY = window.innerHeight / 2;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX - windowHalfX;
        mouseY = e.clientY - windowHalfY;
    });

    // Touch: drag-to-spin globe AND update mouse targets so particles follow too
    let isDragging = false, prevTouchX = 0, prevTouchY = 0;

    document.addEventListener('touchstart', (e) => {
        if (e.touches.length > 0) {
            isDragging = true;
            prevTouchX = e.touches[0].clientX;
            prevTouchY = e.touches[0].clientY;
        }
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        if (!isDragging || e.touches.length === 0) return;
        const tx = e.touches[0].clientX;
        const ty = e.touches[0].clientY;
        const dx = tx - prevTouchX;
        const dy = ty - prevTouchY;

        // Spin globe with finger
        coreGroup.rotation.y += dx * 0.01;
        coreGroup.rotation.x += dy * 0.01;

        // Drive particle/scene reaction (same as mouse)
        mouseX = tx - windowHalfX;
        mouseY = ty - windowHalfY;

        prevTouchX = tx;
        prevTouchY = ty;
    }, { passive: true });

    document.addEventListener('touchend', () => { isDragging = false; });

    // 5. SCROLL → CAMERA SYNC
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.create({
        trigger: "#scroll-proxy",
        start: "top top", end: "bottom bottom", scrub: 1,
        onUpdate: (self) => {
            gsap.to(camera.position, { z: 100 - self.progress * 500, y: -(self.progress * 50), ease: "power2.out", duration: 0.5 });
            gsap.to(coreGroup.rotation, { x: self.progress * Math.PI * 2, z: self.progress * Math.PI, duration: 1, ease: "power1.out" });
        }
    });

    // 6. GLOBE PULSE ANIMATION (Marketing-grade interactions)
    function pulseGlobe(strong = false) {
        const scale = strong ? 1.4 : 1.2;
        const dur   = strong ? 0.35 : 0.5;
        gsap.to(coreMesh.scale, { x: scale, y: scale, z: scale, duration: dur, ease: 'power2.out',
            onComplete: () => gsap.to(coreMesh.scale, { x: 1, y: 1, z: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)' })
        });
        gsap.to(coreMaterial, { opacity: strong ? 0.65 : 0.4, duration: dur,
            onComplete: () => gsap.to(coreMaterial, { opacity: 0.15, duration: 0.8 })
        });
        if (strong) {
            // Subtle screen shake on active click/tap
            gsap.to(canvas, { x: 4, y: -3, duration: 0.05, yoyo: true, repeat: 5, ease: 'none',
                onComplete: () => gsap.set(canvas, { x: 0, y: 0 })
            });
        }
    }

    // PASSIVE: pulse glow every 5s — globe always feels alive
    setInterval(() => pulseGlobe(false), 5000);

    // ACTIVE: stronger burst on click or tap (desktop + mobile)
    canvas.addEventListener('click', () => pulseGlobe(true));
    canvas.addEventListener('touchend', () => pulseGlobe(true), { passive: true });

    // 7. RENDER LOOP
    const clock = new THREE.Clock();
    let currentScroll = 0, targetScroll = 0;
    window.addEventListener('scroll', () => { targetScroll = window.scrollY; });

    const cards = document.querySelectorAll('.interactive-card');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            card.style.transform = `translateY(0px) perspective(1000px) rotateX(${(y / (rect.height / 2)) * -5}deg) rotateY(${(x / (rect.width / 2)) * 5}deg) scale(1.02)`;
        });
    });

    function renderFrame() {
        const elapsedTime = clock.getElapsedTime();

        targetX = mouseX * 0.001;
        targetY = mouseY * 0.001;

        coreGroup.rotation.y += 0.002;
        coreGroup.rotation.x += 0.001;
        particlesMesh.rotation.y = elapsedTime * 0.05;

        // Lerp scene rotation — mouse AND touch writes to mouseX/Y so particles follow both
        scene.rotation.x += 0.05 * (targetY - scene.rotation.x);
        scene.rotation.y += 0.05 * (targetX - scene.rotation.y);

        renderer.render(scene, camera);

        // Floating card momentum
        currentScroll += (targetScroll - currentScroll) * 0.1;
        const velocity = targetScroll - currentScroll;
        cards.forEach((card, index) => {
            const rect = card.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
                const floatY = Math.sin(elapsedTime * 2 + index) * 5;
                card.style.transform = `translateY(${floatY + velocity * -0.05}px)`;
            }
        });

        requestAnimationFrame(renderFrame);
    }
    renderFrame();

    // 8. RESIZE HANDLER
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // 9. FADE-IN OBSERVER
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.1 });
    document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

    // 10. MOBILE MENU — toggle, close-on-link, matrix rain
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mobileMenuCloseBtn = document.querySelector('.mobile-menu-close');
    const mobileMenu   = document.querySelector('.mobile-menu');
    const matrixCanvas = document.getElementById('menu-matrix-canvas');
    let matrixInterval = null;

    function startMatrixRain() {
        if (!matrixCanvas || matrixInterval) return;
        const mCtx = matrixCanvas.getContext('2d');
        matrixCanvas.width  = window.innerWidth;
        matrixCanvas.height = window.innerHeight;
        const chars   = 'RISE01CLICKS10ROAS>_{}[]#@!ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const fontSize = 13;
        const cols    = Math.floor(matrixCanvas.width / fontSize);
        const drops   = Array(cols).fill(1);
        matrixInterval = setInterval(() => {
            mCtx.fillStyle = 'rgba(2,4,2,0.05)';
            mCtx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);
            mCtx.font = `${fontSize}px 'Courier New',monospace`;
            drops.forEach((y, i) => {
                const char = chars[Math.floor(Math.random() * chars.length)];
                mCtx.fillStyle = i % 5 === 0 ? '#D4AF37' : '#00F0FF';
                mCtx.fillText(char, i * fontSize, y * fontSize);
                if (y * fontSize > matrixCanvas.height && Math.random() > 0.975) drops[i] = 0;
                drops[i]++;
            });
        }, 50);
    }

    function stopMatrixRain() {
        if (matrixInterval) { clearInterval(matrixInterval); matrixInterval = null; }
    }

    function closeMobileMenu() {
        if (!mobileMenu) return;
        mobileMenu.classList.remove('open');
        stopMatrixRain();
        const icon = mobileMenuBtn?.querySelector('i');
        if (icon) { icon.classList.replace('fa-times', 'fa-bars'); }
    }

    // Hamburger toggle button
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            const isOpen = mobileMenu.classList.toggle('open');
            const icon   = mobileMenuBtn.querySelector('i');
            if (isOpen) {
                icon.classList.replace('fa-bars', 'fa-times');
                startMatrixRain();
            } else {
                icon.classList.replace('fa-times', 'fa-bars');
                stopMatrixRain();
            }
        });
    }

    // Dedicated × close button inside the menu
    if (mobileMenuCloseBtn) {
        mobileMenuCloseBtn.addEventListener('click', closeMobileMenu);
    }

    // Nav link clicks: close menu first, then navigate after transition completes
    document.querySelectorAll('.mobile-nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault(); // Stop instant jump
            const targetId = this.dataset.target || this.getAttribute('href')?.replace('#', '');
            closeMobileMenu();
            // Wait for menu slide-up transition (500ms) then scroll
            setTimeout(() => {
                const target = document.getElementById(targetId);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 520);
        }, true); // capture: true — fires before any other handler
    });


    // 11. SHOW MOBILE DASHBOARD SECTION
    if (window.innerWidth <= 480) {
        const mobileDash = document.querySelector('.mobile-dashboard-section');
        if (mobileDash) mobileDash.style.display = 'block';
    }
});