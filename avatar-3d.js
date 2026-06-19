/* ==========================================================================
   INTERACTIVE 3D PHYSICS LANYARD BADGE ENGINE // AVATAR-3D.JS
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('avatar-3d-container');
    const canvas = document.getElementById('avatar-3d-canvas');
    if (!container || !canvas) return;

    let scene, camera, renderer;
    let cardGroup, cardMesh;
    let lanyardLine, lineMaterial;
    let cardGLTF;
    let activePointLight, dirLight2;
    
    // Physics variables
    const numParticles = 8;
    const segmentLength = 0.35;
    const gravity = -20;
    const particles = [];
    const constraints = [];
    const ropeAnchor = { x: 0, y: 2.8, z: 0 };
    
    // Sleep & Stability states
    let isSleeping = true; // Starts completely stable and asleep
    let settledFrames = 0;
    
    // Interaction states
    let isDragging = false;
    const mouse = new THREE.Vector2();
    const lastMouse = new THREE.Vector2();
    const dragPlane = new THREE.Plane();
    const raycaster = new THREE.Raycaster();
    const dragTarget = new THREE.Vector3();
    const intersectionOffset = new THREE.Vector3();
    
    // Canvas textures for Card
    let frontCanvas, backCanvas;
    let frontTexture, backTexture;
    
    // Avatar image
    const avatarImg = new Image();

    // Initialize Card Textures
    function initCardCanvases() {
        frontCanvas = document.createElement('canvas');
        frontCanvas.width = 512;
        frontCanvas.height = 800;
        
        backCanvas = document.createElement('canvas');
        backCanvas.width = 512;
        backCanvas.height = 800;
        
        const isLight = document.body.classList.contains('light-theme');
        drawCardTextures(isLight);
        
        frontTexture = new THREE.CanvasTexture(frontCanvas);
        backTexture = new THREE.CanvasTexture(backCanvas);
        
        // Improve texture rendering quality
        frontTexture.minFilter = THREE.LinearMipmapLinearFilter;
        frontTexture.magFilter = THREE.LinearFilter;
        frontTexture.anisotropy = 4;
        
        backTexture.minFilter = THREE.LinearMipmapLinearFilter;
        backTexture.magFilter = THREE.LinearFilter;
        backTexture.anisotropy = 4;

        // Load avatar image asynchronously and redraw texture when loaded
        avatarImg.src = 'assets/soham_avatar.png';
        avatarImg.onload = () => {
            const currentLight = document.body.classList.contains('light-theme');
            drawCardTextures(currentLight);
            frontTexture.needsUpdate = true;
        };
    }

    // Dynamic Procedural Canvas Drawing
    function drawCardTextures(isLight) {
        const ctxF = frontCanvas.getContext('2d');
        const ctxB = backCanvas.getContext('2d');
        
        // Colors
        const bg = isLight ? '#F8FAFC' : '#111827';
        const borderGlow = isLight ? '#2563EB' : '#3B82F6';
        const textMain = isLight ? '#0F172A' : '#F9FAFB';
        const textMuted = isLight ? '#475569' : '#94A3B8';
        const gridColor = isLight ? 'rgba(37, 99, 235, 0.08)' : 'rgba(59, 130, 246, 0.08)';
        const accentNeon = isLight ? '#2563EB' : '#3B82F6';
        const accentPurple = isLight ? '#1D4ED8' : '#2563EB';
        
        // --- DRAW FRONT ---
        // Background
        ctxF.fillStyle = bg;
        ctxF.fillRect(0, 0, 512, 800);
        
        // Grid lines
        ctxF.strokeStyle = gridColor;
        ctxF.lineWidth = 1;
        for (let i = 0; i < 512; i += 20) {
            ctxF.beginPath(); ctxF.moveTo(i, 0); ctxF.lineTo(i, 800); ctxF.stroke();
        }
        for (let j = 0; j < 800; j += 20) {
            ctxF.beginPath(); ctxF.moveTo(0, j); ctxF.lineTo(512, j); ctxF.stroke();
        }

        // Tech borders
        ctxF.strokeStyle = accentNeon;
        ctxF.lineWidth = 4;
        ctxF.strokeRect(15, 15, 482, 770);
        
        ctxF.strokeStyle = accentPurple;
        ctxF.lineWidth = 2;
        ctxF.strokeRect(25, 25, 462, 750);
        
        // L-corners
        ctxF.fillStyle = accentNeon;
        ctxF.fillRect(10, 10, 30, 6); ctxF.fillRect(10, 10, 6, 30);
        ctxF.fillRect(472, 10, 30, 6); ctxF.fillRect(496, 10, 6, 30);
        ctxF.fillRect(10, 784, 30, 6); ctxF.fillRect(10, 760, 6, 30);
        ctxF.fillRect(472, 784, 30, 6); ctxF.fillRect(496, 760, 6, 30);
        
        // Header
        ctxF.fillStyle = isLight ? 'rgba(37, 99, 235, 0.1)' : 'rgba(59, 130, 246, 0.15)';
        ctxF.fillRect(25, 25, 462, 70);
        ctxF.fillStyle = accentNeon;
        ctxF.font = 'bold 22px "JetBrains Mono", monospace';
        ctxF.fillText('SECURE IDENTITY BADGE // PU-2027', 45, 67);
        
        // Scanner design overlay
        ctxF.fillStyle = 'rgba(59, 130, 246, 0.1)';
        ctxF.beginPath();
        ctxF.arc(256, 260, 100, 0, Math.PI * 2);
        ctxF.fill();
        ctxF.strokeStyle = accentPurple;
        ctxF.lineWidth = 1;
        ctxF.setLineDash([4, 4]);
        ctxF.stroke();
        ctxF.setLineDash([]);
        
        // Stylized Avatar or Image
        if (avatarImg.complete && avatarImg.naturalWidth !== 0) {
            ctxF.save();
            ctxF.beginPath();
            ctxF.arc(256, 260, 100, 0, Math.PI * 2);
            ctxF.clip();
            ctxF.drawImage(avatarImg, 156, 160, 200, 200);
            ctxF.restore();
        } else {
            // Stylized Avatar Silhouette
            ctxF.fillStyle = isLight ? '#e2e8f0' : '#1e293b';
            ctxF.beginPath();
            ctxF.arc(256, 240, 50, 0, Math.PI * 2); // Head
            ctxF.fill();
            ctxF.beginPath();
            ctxF.ellipse(256, 335, 85, 55, 0, Math.PI, Math.PI * 2); // Shoulders
            ctxF.fill();
            
            // Tech glasses/hud details on avatar
            ctxF.strokeStyle = accentNeon;
            ctxF.lineWidth = 3;
            ctxF.beginPath();
            ctxF.moveTo(225, 235); ctxF.lineTo(287, 235);
            ctxF.stroke();
            ctxF.fillStyle = accentNeon;
            ctxF.beginPath();
            ctxF.arc(235, 235, 5, 0, Math.PI * 2);
            ctxF.arc(277, 235, 5, 0, Math.PI * 2);
            ctxF.fill();
        }
        
        // Hologram scanning circle overlay
        ctxF.strokeStyle = accentNeon;
        ctxF.lineWidth = 1;
        ctxF.beginPath();
        ctxF.arc(256, 260, 115, 0, Math.PI * 2);
        ctxF.stroke();
        
        // Name
        ctxF.fillStyle = textMain;
        ctxF.textAlign = 'center';
        ctxF.font = 'bold 36px "Outfit", sans-serif';
        ctxF.fillText('SOHAM NESWANKAR', 256, 440);
        
        // Role
        ctxF.fillStyle = accentNeon;
        ctxF.font = '800 20px "JetBrains Mono", monospace';
        ctxF.fillText('FULL STACK DEVELOPER', 256, 475);
        
        // Separation line
        ctxF.strokeStyle = 'rgba(148, 163, 184, 0.3)';
        ctxF.lineWidth = 2;
        ctxF.beginPath(); ctxF.moveTo(50, 505); ctxF.lineTo(462, 505); ctxF.stroke();
        
        // Details fields
        ctxF.textAlign = 'left';
        ctxF.font = '16px "JetBrains Mono", monospace';
        
        ctxF.fillStyle = textMuted; ctxF.fillText('SYS_OPERATOR:', 60, 540);
        ctxF.fillStyle = textMain; ctxF.fillText('S_NESWANKAR', 230, 540);
        
        ctxF.fillStyle = textMuted; ctxF.fillText('COGNITIVE_CORES:', 60, 575);
        ctxF.fillStyle = textMain; ctxF.fillText('MERN_WEB3D // JAVA', 230, 575);
        
        ctxF.fillStyle = textMuted; ctxF.fillText('LOCATION_NODE:', 60, 610);
        ctxF.fillStyle = textMain; ctxF.fillText('MH_MUM_EAST_UPLINK', 230, 610);
        
        ctxF.fillStyle = textMuted; ctxF.fillText('SYS_STATUS:', 60, 645);
        ctxF.fillStyle = '#10b981'; // Green status
        ctxF.fillText('● ONLINE // SECURE', 230, 645);
        
        // Barcode at bottom
        ctxF.fillStyle = textMain;
        for (let x = 60; x < 452; ) {
            const w = Math.floor(Math.random() * 5) + 1;
            ctxF.fillRect(x, 690, w, 40);
            x += w + Math.floor(Math.random() * 4) + 1;
        }
        ctxF.fillStyle = textMuted;
        ctxF.textAlign = 'center';
        ctxF.font = '12px "JetBrains Mono", monospace';
        ctxF.fillText('UPLINK-DATA-STREAM-2950-8080-CONNECTED', 256, 755);

        // Gold chip graphic
        ctxF.fillStyle = isLight ? '#b45309' : '#d97706'; // Bronze/Gold
        ctxF.fillRect(410, 530, 45, 35);
        ctxF.strokeStyle = '#000000';
        ctxF.lineWidth = 1;
        ctxF.strokeRect(410, 530, 45, 35);
        // lines inside chip
        ctxF.beginPath();
        ctxF.moveTo(425, 530); ctxF.lineTo(425, 565);
        ctxF.moveTo(440, 530); ctxF.lineTo(440, 565);
        ctxF.moveTo(410, 542); ctxF.lineTo(455, 542);
        ctxF.moveTo(410, 552); ctxF.lineTo(455, 552);
        ctxF.stroke();

        // --- DRAW BACK ---
        ctxB.fillStyle = bg;
        ctxB.fillRect(0, 0, 512, 800);
        
        // Grid
        ctxB.strokeStyle = gridColor;
        ctxB.lineWidth = 1;
        for (let i = 0; i < 512; i += 20) {
            ctxB.beginPath(); ctxB.moveTo(i, 0); ctxB.lineTo(i, 800); ctxB.stroke();
        }
        for (let j = 0; j < 800; j += 20) {
            ctxB.beginPath(); ctxB.moveTo(0, j); ctxB.lineTo(512, j); ctxB.stroke();
        }
        
        // Tech borders
        ctxB.strokeStyle = accentPurple;
        ctxB.lineWidth = 4;
        ctxB.strokeRect(15, 15, 482, 770);
        
        // Magnetic Stripe
        ctxB.fillStyle = '#0f172a';
        ctxB.fillRect(25, 80, 462, 90);
        
        // Tech emblem in center
        ctxB.strokeStyle = accentNeon;
        ctxB.lineWidth = 2;
        ctxB.beginPath();
        ctxB.arc(256, 400, 130, 0, Math.PI * 2);
        ctxB.stroke();
        
        ctxB.fillStyle = accentPurple;
        ctxB.beginPath();
        ctxB.arc(256, 400, 30, 0, Math.PI * 2);
        ctxB.fill();
        
        // Hexagon emblem
        ctxB.strokeStyle = accentNeon;
        ctxB.lineWidth = 3;
        ctxB.beginPath();
        for (let s = 0; s < 6; s++) {
            const angle = (s * Math.PI) / 3;
            const x = 256 + 85 * Math.cos(angle);
            const y = 400 + 85 * Math.sin(angle);
            if (s === 0) ctxB.moveTo(x, y); else ctxB.lineTo(x, y);
        }
        ctxB.closePath();
        ctxB.stroke();
        
        // Emblem texts
        ctxB.textAlign = 'center';
        ctxB.fillStyle = textMain;
        ctxB.font = 'bold 24px "JetBrains Mono", monospace';
        ctxB.fillText('PARUL UNIVERSITY', 256, 580);
        
        ctxB.fillStyle = accentNeon;
        ctxB.font = '800 16px "JetBrains Mono", monospace';
        ctxB.fillText('DEPT OF COMPUTER SCIENCE', 256, 610);
        
        ctxB.fillStyle = textMuted;
        ctxB.font = '12px "JetBrains Mono", monospace';
        ctxB.fillText('HACKER LABS // HARDWARE SECURITY LINK', 256, 635);
        
        // Warnings
        ctxB.fillStyle = accentPurple;
        ctxB.font = '10px "JetBrains Mono", monospace';
        ctxB.fillText('WARNING: FOR AUTHORIZED PERSONNEL ONLY', 256, 700);
        ctxB.fillText('IF FOUND, TRANSMIT UPLINK PACKET TO SYSTEM PORT 8080.', 256, 720);
        ctxB.fillText('UNAUTHORIZED DUPLICATION DETECTED BY COGNITIVE DRIVER.', 256, 740);
    }

    // Initialize Verlet physics rope points
    function initPhysics() {
        particles.length = 0;
        constraints.length = 0;
        
        for (let i = 0; i < numParticles; i++) {
            particles.push({
                x: ropeAnchor.x,
                y: ropeAnchor.y - i * segmentLength,
                z: 0,
                px: ropeAnchor.x,
                py: ropeAnchor.y - i * segmentLength,
                pz: 0
            });
        }
        
        for (let i = 0; i < numParticles - 1; i++) {
            constraints.push({
                p1: i,
                p2: i + 1,
                length: segmentLength
            });
        }
    }

    // Physics Simulation Solver
    function updatePhysics(dt) {
        if (isSleeping) {
            // Keep card fully locked at resting position
            for (let i = 0; i < numParticles; i++) {
                const p = particles[i];
                const restX = ropeAnchor.x;
                const restY = ropeAnchor.y - i * segmentLength;
                p.x = restX; p.y = restY; p.z = 0;
                p.px = restX; p.py = restY; p.pz = 0;
            }
            return;
        }

        if (dt > 0.03) dt = 0.03; // Clamp max step
        
        // 1. Verlet Integration
        for (let i = 1; i < numParticles; i++) {
            const p = particles[i];
            
            // If dragging, the card handles the last particle's position
            if (i === numParticles - 1 && isDragging) {
                p.x = dragTarget.x;
                p.y = dragTarget.y;
                p.z = dragTarget.z;
                continue;
            }
            
            let vx = p.x - p.px;
            let vy = p.y - p.py;
            let vz = p.z - p.pz;
            
            // Dynamic Damping: High damping when slow (settles quickly), low damping when fast (swings smooth)
            const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
            const damping = speed < 0.04 ? 0.82 : 0.975;
            
            vx *= damping;
            vy *= damping;
            vz *= damping;
            
            p.px = p.x;
            p.py = p.y;
            p.pz = p.z;
            
            p.x += vx;
            p.y += vy + gravity * dt * dt;
            p.z += vz;
        }
        
        // 2. Solve Constraints
        const iterations = 8;
        for (let step = 0; step < iterations; step++) {
            // Anchor point is fixed
            particles[0].x = ropeAnchor.x;
            particles[0].y = ropeAnchor.y;
            particles[0].z = ropeAnchor.z;
            
            for (let i = 0; i < constraints.length; i++) {
                const c = constraints[i];
                const p1 = particles[c.p1];
                const p2 = particles[c.p2];
                
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const dz = p2.z - p1.z;
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                if (dist === 0) continue;
                
                const diff = c.length - dist;
                const percent = (diff / dist) * 0.5;
                const offsetX = dx * percent;
                const offsetY = dy * percent;
                const offsetZ = dz * percent;
                
                if (c.p1 === 0) {
                    // Anchor is fixed
                    p2.x += offsetX * 2;
                    p2.y += offsetY * 2;
                    p2.z += offsetZ * 2;
                } else {
                    p1.x -= offsetX;
                    p1.y -= offsetY;
                    p1.z -= offsetZ;
                    
                    if (!(c.p2 === numParticles - 1 && isDragging)) {
                        p2.x += offsetX;
                        p2.y += offsetY;
                        p2.z += offsetZ;
                    }
                }
            }
        }
        
        // 3. Settle / Put to Sleep Check
        if (!isDragging) {
            let totalVelocity = 0;
            let totalDisplacement = 0;
            for (let i = 1; i < numParticles; i++) {
                const p = particles[i];
                const vx = p.x - p.px;
                const vy = p.y - p.py;
                const vz = p.z - p.pz;
                totalVelocity += Math.sqrt(vx * vx + vy * vy + vz * vz);
                
                const restX = ropeAnchor.x;
                const restY = ropeAnchor.y - i * segmentLength;
                totalDisplacement += Math.abs(p.x - restX) + Math.abs(p.y - restY) + Math.abs(p.z);
            }
            
            if (totalVelocity < 0.003 && totalDisplacement < 0.015) {
                settledFrames++;
                if (settledFrames > 15) {
                    isSleeping = true;
                    settledFrames = 0;
                }
            } else {
                settledFrames = 0;
            }
        }
    }    // Set up the Three.js Environment
    function initThree() {
        let width = container.clientWidth;
        let height = container.clientHeight;
        
        // Fallback for initial zero layout size
        if (width === 0 || height === 0) {
            width = 380;
            height = 480;
        }
        
        // Scene
        scene = new THREE.Scene();
        
        // Camera (positioned closer and lower to center on the larger card)
        camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
        camera.position.set(0, -0.65, 7.7);
        camera.lookAt(0, -0.65, 0);
        
        // WebGL Renderer
        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        
        // Textures
        initCardCanvases();
        
        // Materials for fallback procedural box card
        const isLight = document.body.classList.contains('light-theme');
        const edgeColor = isLight ? 0xe2e8f0 : 0x111827;
        const sideMat = new THREE.MeshPhysicalMaterial({
            color: edgeColor,
            metalness: 0.8,
            roughness: 0.2,
            clearcoat: 0.5
        });
        
        const frontMat = new THREE.MeshPhysicalMaterial({
            map: frontTexture,
            roughness: 0.12,
            metalness: 0.1,
            clearcoat: 1.0,
            clearcoatRoughness: 0.08
        });
        
        const backMat = new THREE.MeshPhysicalMaterial({
            map: backTexture,
            roughness: 0.12,
            metalness: 0.1,
            clearcoat: 1.0,
            clearcoatRoughness: 0.08
        });
        
        const cardMaterials = [
            sideMat,  // +X
            sideMat,  // -X
            sideMat,  // +Y
            sideMat,  // -Y
            frontMat, // +Z (Front)
            backMat   // -Z (Back)
        ];
        
        // Fallback box geometry card (used while GLTF loads) - scaled up slightly
        const cardGeo = new THREE.BoxGeometry(2.4, 3.75, 0.07);
        cardMesh = new THREE.Mesh(cardGeo, cardMaterials);
        cardMesh.castShadow = true;
        cardMesh.receiveShadow = true;
        
        // Add glowing blue border outline to fallback card
        const fallbackEdges = new THREE.EdgesGeometry(cardGeo);
        const fallbackLine = new THREE.LineSegments(fallbackEdges, new THREE.LineBasicMaterial({
            color: isLight ? 0x2563eb : 0x3b82f6
        }));
        cardMesh.add(fallbackLine);
        
        // Offset the mesh inside the group so the group's center is at the card's top attachment
        cardGroup = new THREE.Group();
        cardMesh.position.set(0, -1.875, 0); // half height offset
        cardGroup.add(cardMesh);
        scene.add(cardGroup);
        
        // Load the kartu.glb 3D card model
        const gltfLoader = new THREE.GLTFLoader();
        gltfLoader.load('assets/kartu.glb', (gltf) => {
            cardGLTF = gltf.scene;
            
            let clipMesh = null;
            let clampMesh = null;
            
            cardGLTF.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    if (child.name === 'card') {
                        const baseMap = child.material.map;
                        if (baseMap) baseMap.anisotropy = 16;
                        
                        child.material = new THREE.MeshPhysicalMaterial({
                            map: baseMap || frontTexture,
                            roughness: 0.3,
                            metalness: 0.5,
                            clearcoat: 1.0,
                            clearcoatRoughness: 0.15
                        });
                        
                        // Add glowing blue border outline to GLTF card mesh
                        const gltfEdges = new THREE.EdgesGeometry(child.geometry);
                        const gltfLine = new THREE.LineSegments(gltfEdges, new THREE.LineBasicMaterial({
                            color: isLight ? 0x2563eb : 0x3b82f6
                        }));
                        child.add(gltfLine);
                    } else if (child.name === 'clip' || child.name === 'clamp') {
                        child.material = new THREE.MeshPhysicalMaterial({
                            color: 0x94a3b8,
                            roughness: 0.2,
                            metalness: 0.9,
                            clearcoat: 0.5
                        });
                        if (child.name === 'clip') clipMesh = child;
                        if (child.name === 'clamp') clampMesh = child;
                    }
                }
            });
            
            // Set scale before computing bounding box - scaled up slightly
            cardGLTF.scale.set(2.55, 2.55, 2.55);
            cardGLTF.position.set(0, 0, 0);

            // Temporarily add to scene to ensure world matrices are updated for setFromObject
            scene.add(cardGLTF);
            cardGLTF.updateMatrixWorld(true);

            // Calculate bounding box of the clip to align its top-center to (0, 0, 0)
            const alignTarget = clipMesh || clampMesh || cardGLTF;
            const box = new THREE.Box3().setFromObject(alignTarget);
            const center = new THREE.Vector3();
            box.getCenter(center);

            // Remove from scene temp
            scene.remove(cardGLTF);

            // Offset cardGLTF position so the top center of clipMesh is at (0, 0, 0) relative to cardGroup
            cardGLTF.position.set(-center.x, -box.max.y, -center.z);
            
            // Swap fallback mesh with GLTF card scene
            if (cardMesh && cardMesh.parent) {
                cardGroup.remove(cardMesh);
            }
            cardGroup.add(cardGLTF);
            console.log(">> [3D CARD] GLTF Model loaded and auto-aligned successfully.");
        }, undefined, (error) => {
            console.error("Error loading GLTF card model:", error);
        });
        
        // Initialize physics particles
        initPhysics();

        // Create Lanyard Ribbon (MeshLine)
        const textureLoader = new THREE.TextureLoader();
        const bandTexture = textureLoader.load('assets/bandd.png');
        bandTexture.wrapS = THREE.RepeatWrapping;
        bandTexture.wrapT = THREE.RepeatWrapping;
        
        const points = [];
        for (let i = 0; i < numParticles; i++) {
            points.push(new THREE.Vector3(particles[i].x, particles[i].y, particles[i].z));
        }
        const curve = new THREE.CatmullRomCurve3(points);
        curve.curveType = 'chordal';
        const curvePoints = curve.getPoints(32);
        
        const positions = [];
        for (let i = 0; i < curvePoints.length; i++) {
            positions.push(curvePoints[i].x, curvePoints[i].y, curvePoints[i].z);
        }
        
        lanyardLine = new MeshLine();
        lanyardLine.setPoints(positions);
        
        lineMaterial = new MeshLineMaterial({
            color: new THREE.Color(0xffffff),
            useMap: 1,
            map: bandTexture,
            lineWidth: 0.22,
            repeat: new THREE.Vector2(-4, 1),
            resolution: new THREE.Vector2(width, height),
            sizeAttenuation: 1,
            depthTest: true,
            transparent: true,
            opacity: 1
        });
        
        const ropeMesh = new THREE.Mesh(lanyardLine.geometry, lineMaterial);
        scene.add(ropeMesh);
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
        scene.add(ambientLight);
        
        const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.5);
        dirLight1.position.set(5, 5, 4);
        scene.add(dirLight1);
        
        dirLight2 = new THREE.DirectionalLight(isLight ? 0x1d4ed8 : 0x2563eb, 1.5);
        dirLight2.position.set(-5, -3, 2);
        scene.add(dirLight2);
 
        // Point light following cursor for specular sheen reflection
        activePointLight = new THREE.PointLight(isLight ? 0x2563eb : 0x3b82f6, 4.0, 12);
        activePointLight.position.set(0, 0, 3);
        scene.add(activePointLight);
        
        // Physics particles initialized earlier
        
        // Event Listeners
        container.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        
        // Touch events
        container.addEventListener('touchstart', onTouchStart, { passive: true });
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onTouchEnd);
        
        // Resize observer
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                const w = entry.contentRect.width || 380;
                const h = entry.contentRect.height || 480;
                camera.aspect = w / h;
                camera.updateProjectionMatrix();
                renderer.setSize(w, h);
                
                // Update MeshLine resolution uniform
                if (lineMaterial && lineMaterial.uniforms && lineMaterial.uniforms.resolution) {
                    lineMaterial.uniforms.resolution.value.set(w, h);
                }
            }
        });
        resizeObserver.observe(container);
    }

    // Theme toggle synchronization
    function updateTheme(isLight) {
        // Redraw canvases (if fallback card uses them)
        drawCardTextures(isLight);
        frontTexture.needsUpdate = true;
        backTexture.needsUpdate = true;
        
        // Update side colors of procedural box card if fallback-active
        if (cardMesh && cardMesh.material && Array.isArray(cardMesh.material)) {
            const edgeColor = isLight ? 0xe2e8f0 : 0x111827;
            for (let i = 0; i < 4; i++) {
                if (cardMesh.material[i]) cardMesh.material[i].color.setHex(edgeColor);
            }
        }
        
        // Update glowing border outline colors in cardGroup
        if (cardGroup) {
            cardGroup.traverse((child) => {
                if (child.isLineSegments && child.material) {
                    child.material.color.setHex(isLight ? 0x2563eb : 0x3b82f6);
                }
            });
        }
 
        // Update light colors to match the theme accent
        if (activePointLight) {
            activePointLight.color.setHex(isLight ? 0x2563eb : 0x3b82f6);
        }
        if (dirLight2) {
            dirLight2.color.setHex(isLight ? 0x1d4ed8 : 0x2563eb);
        }
        
        // Force a brief physics wakeup to settle visual state
        isSleeping = false;
        settledFrames = 0;
    }

    // Setup theme change observer (listening to theme icon changes)
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            setTimeout(() => {
                const isLight = document.body.classList.contains('light-theme');
                updateTheme(isLight);
            }, 60);
        });
    }

    // Interaction utilities
    function updateMouseCoordinates(e) {
        const rect = container.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    }

    function onMouseDown(e) {
        updateMouseCoordinates(e);
        
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(cardGroup.children, true);
        
        if (intersects.length > 0) {
            isDragging = true;
            isSleeping = false; // Wake up physics
            settledFrames = 0;
            
            // Record drag plane parallel to camera at the click depth
            const intersectPoint = intersects[0].point;
            dragPlane.setFromNormalAndCoplanarPoint(
                new THREE.Vector3(0, 0, 1),
                intersectPoint
            );
            
            // Calculate cursor offset relative to the card's local attachment point
            const lastParticle = particles[numParticles - 1];
            const attachmentPos = new THREE.Vector3(lastParticle.x, lastParticle.y, lastParticle.z);
            intersectionOffset.copy(attachmentPos).sub(intersectPoint);
            
            // Disable page scroll when interacting
            e.preventDefault();
        }
    }

    function onMouseMove(e) {
        // Move the point light slightly to follow the cursor for interactive reflections
        const rect = container.getBoundingClientRect();
        const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const normY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        
        if (activePointLight) {
            activePointLight.position.x = normX * 4;
            activePointLight.position.y = normY * 4 - 0.65;
        }

        if (!isDragging) {
            lastMouse.set(normX, normY);
            return;
        }
        
        updateMouseCoordinates(e);
        
        raycaster.setFromCamera(mouse, camera);
        raycaster.ray.intersectPlane(dragPlane, dragTarget);
        dragTarget.add(intersectionOffset); // Apply initial click offset
        
        // Clamp dragTarget to avoid pulling the lanyard completely flat/broken
        dragTarget.x = Math.max(-4, Math.min(4, dragTarget.x));
        dragTarget.y = Math.max(-4, Math.min(3, dragTarget.y));
        dragTarget.z = Math.max(-2, Math.min(2, dragTarget.z));
    }

    function onMouseUp() {
        isDragging = false;
    }

    // Touch support (Mobile)
    function onTouchStart(e) {
        if (e.touches.length > 0) {
            onMouseDown(e.touches[0]);
        }
    }

    function onTouchMove(e) {
        if (e.touches.length > 0) {
            onMouseMove(e.touches[0]);
            if (isDragging) {
                // Prevent scroll behavior while dragging
                e.preventDefault();
            }
        }
    }

    function onTouchEnd() {
        onMouseUp();
    }

    // Animation Loop
    let lastTime = performance.now();
    
    function animate() {
        requestAnimationFrame(animate);
        
        const time = performance.now();
        const dt = (time - lastTime) / 1000;
        lastTime = time;
        
        // Update verlet physics
        updatePhysics(dt);
        
        // Update rope curve points and MeshLine geometry
        if (lanyardLine) {
            const points = [];
            for (let i = 0; i < numParticles; i++) {
                points.push(new THREE.Vector3(particles[i].x, particles[i].y, particles[i].z));
            }
            const curve = new THREE.CatmullRomCurve3(points);
            curve.curveType = 'chordal';
            const curvePoints = curve.getPoints(32);
            
            const positions = [];
            for (let i = 0; i < curvePoints.length; i++) {
                positions.push(curvePoints[i].x, curvePoints[i].y, curvePoints[i].z);
            }
            lanyardLine.setPoints(positions);
        }
        
        // Update Card position & rotation
        const lastP = particles[numParticles - 1];
        const nextToLastP = particles[numParticles - 2];
        
        cardGroup.position.set(lastP.x, lastP.y, lastP.z);
        
        // Calculate physics rotation based on rope segment direction and camera direction
        const up = new THREE.Vector3(nextToLastP.x - lastP.x, nextToLastP.y - lastP.y, nextToLastP.z - lastP.z).normalize();
        
        // Facing camera
        const toCam = new THREE.Vector3(0, 0, 1); 
        const right = new THREE.Vector3().crossVectors(up, toCam).normalize();
        const forward = new THREE.Vector3().crossVectors(right, up).normalize();
        
        // Build rotation matrix from basis vectors
        const rotMat = new THREE.Matrix4().makeBasis(right, up, forward);
        const targetQuat = new THREE.Quaternion().setFromRotationMatrix(rotMat);
        
        // Smoothly interpolate rotation to look realistic (soft spring lag)
        cardGroup.quaternion.slerp(targetQuat, 0.15);
        
        // Render scene
        renderer.render(scene, camera);
    }
    
    // Launch Three.js badge engine
    initThree();
    animate();
});
