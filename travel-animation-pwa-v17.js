/* v17: mobile tour obeys saved on/off & transparency while retaining smooth 4-5 tourist engine. */
/* Mobile tour v16: 4-5 tourists with tiny selfie, dance and party poses; no costly particle effects. */
/* Shikkha installed-PWA mobile animation v15: 4–5 tourists, CSS-pixel canvas, 30fps cap, watchdog; unique URL busts PWA cache. */
(function () {
      var canvas = document.getElementById('groupTravelStoryCanvas');
      if (!canvas) return;
      var ctx = canvas.getContext('2d');
      if (!ctx) return;
      var reduceMotion = false; // Always play the explicitly requested tour; respect app-only pause if added later.
      // Android-safe animation driver: never rely on RAF alone. Some power-saving
      // browsers pause RAF while leaving an installed PWA visibly in the foreground.
      // A timer-backed watchdog keeps the tourist journey moving without touching POS state.
      var lastRenderTime = 0;
      var lastWallPaint = 0;
      var rafPending = false;
      var frameCount = 0;
      var tourErrors = 0;
      function safeRender(now, forced) {
        if (document.hidden || document.documentElement.classList.contains('tour-animation-off')) return;
        // requestAnimationFrame supplies a performance-relative timestamp while
        // the watchdog supplies epoch milliseconds. Use one clock for BOTH drivers.
        var wallTime = Date.now();
        if (!forced && lastRenderTime && wallTime - lastRenderTime < 33) return;
        lastRenderTime = wallTime;
        try {
          updateAndRender();
          // Only one full-scene redraw per tick; avoids unnecessary battery and CPU load.
          lastWallPaint = Date.now();
          frameCount++;
          if (frameCount % 20 === 0) {
            canvas.dataset.tourFrames = String(frameCount);
            canvas.dataset.tourMode = tour.mode;
          }
          tourErrors = 0;
        } catch (err) {
          tourErrors++;
          if (tourErrors < 4 && window.console) console.warn('Travel animation recovered from a drawing error:', err);
          // If a destination drawing method is unsupported on a particular phone,
          // keep the characters visible while recovering the trip on the next tick.
          try {
            ctx.clearRect(0, 0, vw, vh);
            tour.waveTick += .12;
            tour.timer += 1 / 20;
            var basex = Math.max(80, Math.min(vw-80, tour.groupX || vw*.5));
            var basey = Math.max(170, Math.min(vh-150, tour.groupY || vh*.6));
            groupMembers.forEach(function(member,i) {
              member.inTent=false;
              member.x=basex+(i-(groupMembers.length-1)/2)*24+Math.sin(tour.waveTick+i)*6;
              member.y=basey+Math.sin(i*2.4)*9;
              member.state='walk';
              member.phase+=.24;
              try { drawMiniAvatar(member.x, member.y, member); } catch(avatarErr) {
                ctx.fillStyle=member.shirt||'#0891b2';ctx.fillRect(member.x-4,member.y-18,8,14);
                ctx.fillStyle='#f5c99b';ctx.beginPath();ctx.arc(member.x,member.y-23,5,0,Math.PI*2);ctx.fill();
              }
            });
          } catch (ignored) { /* Keep the watchdog alive for next frame. */ }
          lastWallPaint = Date.now();
        }
      }
      function scheduleFrame() {
        if (rafPending || !window.requestAnimationFrame || document.documentElement.classList.contains('tour-animation-off')) return;
        rafPending = true;
        window.requestAnimationFrame(function(now) {
          rafPending = false;
          safeRender(now, false);
          scheduleFrame();
        });
      }
      if (reduceMotion) {
        // A still illustrated tourism scene for users who requested reduced motion.
        canvas.setAttribute('data-reduced-motion','true');
      }

      var dpr = (window.innerWidth || 390) < 768 ? 1 : Math.min(window.devicePixelRatio || 1, 1.2); // Phone canvas at CSS pixel resolution to reduce GPU usage
      var vw = window.innerWidth || 1200;
      var vh = window.innerHeight || 800;

      function resize() {
        vw = window.innerWidth || 1200;
        vh = window.innerHeight || 800;
        canvas.width = vw * dpr;
        canvas.height = vh * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      window.addEventListener('resize', resize);
      resize();

      function randRange(min, max) {
        return min + Math.random() * (max - min);
      }

      function clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
      }

      // =========================================================================
      // SCENIC 2D ANCHOR ZONES AROUND THE APP PERIMETER
      // Every spot has a flat 2D horizontal ground plane so characters spread out
      // naturally in 2D (NEVER stacked vertically in a tall line!) and the bus
      // ALWAYS drives horizontally along a road (NEVER drops straight down!).
      // =========================================================================
      function getPerimeterWaypoints() {
        var isMob = vw < 768;
        var yBot = vh - (isMob ? 152 : 18);
        var yTop = isMob ? Math.max(190, Math.min(240, vh * 0.28)) : 76;
        var yMidLow = Math.round(vh * 0.70);
        var yMidHigh = Math.round(vh * 0.36);
        var xLeftMargin = isMob ? 68 : 88;
        var xRightMargin = vw - (isMob ? 68 : 88);

        return [
          { id: 0, x: Math.round(vw * 0.22), y: yBot,     zone: 'bottom', road: true },
          { id: 1, x: Math.round(vw * 0.52), y: yBot,     zone: 'bottom', road: true },
          { id: 2, x: Math.round(vw * 0.80), y: yBot,     zone: 'bottom', road: true },
          { id: 3, x: xRightMargin,          y: yMidLow,  zone: 'right',  road: false },
          { id: 4, x: xRightMargin,          y: yMidHigh, zone: 'right',  road: false },
          { id: 5, x: Math.round(vw * 0.74), y: yTop,     zone: 'top',    road: true },
          { id: 6, x: Math.round(vw * 0.28), y: yTop,     zone: 'top',    road: true },
          { id: 7, x: xLeftMargin,           y: yMidHigh, zone: 'left',   road: false },
          { id: 8, x: xLeftMargin,           y: yMidLow,  zone: 'left',   road: false }
        ];
      }

      // =========================================================================
      // THE 5 FRIENDS IN THE TOUR GROUP
      // Each member has independent 2D coordinates (x, y), target (tx, ty),
      // dynamic formation slot (slotX, slotY) that shifts over time ("ekto aghe piche"),
      // and autonomous spot activity state so they roam freely at every spot!
      // =========================================================================
      var groupMembers = [
        { id: 0, shirt: '#06b6d4', pants: '#0f172a', hat: '#f59e0b', bag: '#10b981', phase: 0.0, speedMul: 1.0,  slotX: 18,  slotY: 1,  x: 120, y: 500, tx: 120, ty: 500, state: 'walk', dir: 1, actTimer: 0, hasMug: false, inTent: false },
        { id: 1, shirt: '#ec4899', pants: '#1e293b', hat: '#facc15', bag: '#06b6d4', phase: 1.4, speedMul: 0.94, slotX: 5,   slotY: -4, x: 106, y: 496, tx: 106, ty: 496, state: 'walk', dir: 1, actTimer: 0, hasMug: false, inTent: false },
        { id: 2, shirt: '#10b981', pants: '#0f172a', hat: '#fb923c', bag: '#f43f5e', phase: 2.8, speedMul: 1.06, slotX: -8,  slotY: 3,  x: 94,  y: 503, tx: 94,  ty: 503, state: 'walk', dir: 1, actTimer: 0, hasMug: false, inTent: false },
        { id: 3, shirt: '#8b5cf6', pants: '#1e293b', hat: '#38bdf8', bag: '#f59e0b', phase: 4.1, speedMul: 0.91, slotX: -20, slotY: -3, x: 82,  y: 497, tx: 82,  ty: 497, state: 'walk', dir: 1, actTimer: 0, hasMug: false, inTent: false },
        { id: 4, shirt: '#f43f5e', pants: '#0f172a', hat: '#a3e635', bag: '#3b82f6', phase: 5.3, speedMul: 1.03, slotX: -32, slotY: 2,  x: 70,  y: 502, tx: 70,  ty: 502, state: 'walk', dir: 1, actTimer: 0, hasMug: false, inTent: false }
      ];

      var wardrobeShirts = ['#06b6d4','#ec4899','#10b981','#8b5cf6','#f43f5e','#f59e0b','#2563eb','#f97316','#14b8a6','#e11d48','#a855f7'];
      var wardrobePants = ['#0f172a','#1e293b','#475569','#334155','#0e7490'];
      var wardrobeHats = ['#facc15','#a3e635','#f97316','#38bdf8','#e879f9','#fdba74'];
      var wardrobeBags = ['#10b981','#0ea5e9','#f43f5e','#f59e0b','#a855f7'];
      function randomOf(xs){return xs[Math.floor(Math.random()*xs.length)];}
      function changeOutfit(m) {
        m.shirt=randomOf(wardrobeShirts);
        m.pants=randomOf(wardrobePants);
        m.hat=randomOf(wardrobeHats);
        m.bag=randomOf(wardrobeBags);
        m.scale=randRange(0.92,1.11);
      }
      function adjustGroupSize() {
        var target=Math.floor(randRange(4,6)); // Always four or five visible tourists: mobile performance
        // Natural arrivals / departures between activities, never during a boarding sequence.
        while(groupMembers.length>target)groupMembers.pop();
        while(groupMembers.length<target) {
          var id=groupMembers.length;
          var p={id:id,phase:randRange(0,6.28),speedMul:randRange(.85,1.2),
             slotX:0,slotY:0,x:tour.groupX+randRange(-20,20),y:tour.groupY+randRange(-4,4),
             tx:tour.groupX,ty:tour.groupY,state:'walk',dir:1,actTimer:0,hasMug:false,inTent:false};
          changeOutfit(p);groupMembers.push(p);
        }
      }
      function reshuffleWalkingFormation() {
        // Randomizes who is slightly ahead, behind, or walking side-by-side ("ekto aghe piche")
        var baseSlots = groupMembers.map(function(_,i){return (groupMembers.length-1)*7-i*14;});
        // Shuffle baseSlots
        for (var i = baseSlots.length - 1; i > 0; i--) {
          var r = Math.floor(Math.random() * (i + 1));
          var tmp = baseSlots[i];
          baseSlots[i] = baseSlots[r];
          baseSlots[r] = tmp;
        }
        for (var j = 0; j < groupMembers.length; j++) {
          var m = groupMembers[j];
          m.slotX = baseSlots[j] + randRange(-5, 5);
          m.slotY = randRange(-4.5, 4.5);
          m.speedMul = randRange(0.88, 1.14);
        }
      }

      // =========================================================================
      // COMPACT, NATURAL 2-BONE SKELETAL MINI-AVATAR RENDERER
      // Well-proportioned (never stretched/lanky!), supports walking, climbing,
      // sitting by tent/campfire with tea mug, chatting, photo posing, & beach fun!
      // =========================================================================
      function drawMiniAvatar(x, y, opts) {
        if (opts.inTent) return; // Hidden inside tent (tent renderer draws peeking head!)
        var scale = opts.scale || (vw < 768 ? 1.04 : 0.58);
        var dir = opts.dir || 1;
        var phase = opts.phase || 0;
        var state = opts.state || 'walk';
        var shirt = opts.shirt || '#06b6d4';
        var pants = opts.pants || '#1e293b';
        var hatColor = opts.hat || '#f59e0b';
        var bagColor = opts.bag || '#10b981';
        var skin = '#fcd34d';

        ctx.save();
        ctx.translate(x, y);

        // Soft ground shadow
        ctx.fillStyle = 'rgba(15, 23, 42, 0.24)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 8 * scale, 2.3 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.scale(dir * scale, scale);

        var hipL = 0, kneeL = 0, hipR = 0, kneeR = 0;
        var shL = 0, elbL = 0, shR = 0, elbR = 0;
        var torsoTilt = 0, bodyBob = 0, headNod = 0;
        var sitDrop = 0;

        if (state === 'walk') {
          var s = Math.sin(phase);
          var c = Math.cos(phase);
          hipL = s * 0.62;
          kneeL = Math.max(0, -c * 0.70) + 0.08;
          hipR = -s * 0.62;
          kneeR = Math.max(0, c * 0.70) + 0.08;

          shL = -s * 0.52;
          elbL = -0.35 - Math.max(0, s * 0.25);
          shR = s * 0.52;
          elbR = -0.35 - Math.max(0, -s * 0.25);

          torsoTilt = 0.05;
          bodyBob = Math.abs(s) * -2.2;
          headNod = Math.sin(phase * 2) * 0.04;
        } else if (state === 'climb') {
          var sc = Math.sin(phase);
          var cc = Math.cos(phase);
          hipL = sc * 0.72 - 0.22;
          kneeL = Math.max(0.2, -cc * 0.85 + 0.38);
          hipR = -sc * 0.72 - 0.22;
          kneeR = Math.max(0.2, cc * 0.85 + 0.38);

          shL = -sc * 0.42 - 0.28;
          elbL = -0.5;
          shR = sc * 0.32 - 0.48;
          elbR = -0.42;

          torsoTilt = 0.26;
          bodyBob = Math.abs(sc) * -2.5;
          headNod = -0.12;
        } else if (state === 'sit_camp' || state === 'sit_relax') {
          // Sitting comfortably on rock / camp mat / beach
          sitDrop = 5.8;
          hipL = -1.15;
          kneeL = 1.25;
          hipR = -1.05;
          kneeR = 1.15;
          shL = -0.35 + Math.sin(phase * 0.7) * 0.1;
          elbL = -0.55;
          shR = -0.65 + Math.sin(phase * 0.9) * 0.15;
          elbR = -0.85;
          torsoTilt = -0.06;
          bodyBob = Math.sin(phase * 0.6) * -0.4;
          headNod = Math.sin(phase * 0.5) * 0.06;
        } else if (state === 'chat') {
          // Standing & gesturing naturally while talking with friends
          hipL = -0.08;
          kneeL = 0.04;
          hipR = 0.08;
          kneeR = 0.04;
          shL = -0.25 + Math.sin(phase * 1.1) * 0.25;
          elbL = -0.6;
          shR = -0.55 + Math.cos(phase * 1.3) * 0.35;
          elbR = -0.75;
          torsoTilt = 0.02;
          bodyBob = Math.sin(phase * 0.8) * -0.5;
          headNod = Math.sin(phase * 1.1) * 0.08;
         } else if (state === 'dance' || state === 'party') {
          var bounce = Math.abs(Math.sin(phase * 1.35));
          hipL = Math.sin(phase * 1.3) * .38;
          hipR = -hipL;
          kneeL = .2 + bounce * .2;
          kneeR = .2 + bounce * .2;
          shL = -1.95 + Math.sin(phase * 1.6) * .65;
          shR = -1.95 - Math.sin(phase * 1.6) * .65;
          elbL = -.28;
          elbR = -.28;
          bodyBob = -bounce * 5.5;
          torsoTilt = Math.sin(phase * .8) * .17;
          headNod = Math.sin(phase * 1.3) * .1;
        } else if (state === 'selfie') {
          hipL = -.12; hipR = .12; kneeL = .08; kneeR = .08;
          shL = -2.15 + Math.sin(phase) * .09;
          shR = -.65; elbL = -.22; elbR = -.7;
          torsoTilt = -.07;
          headNod = -.12 + Math.sin(phase * .5) * .04;
        } else if (state === 'take_photo') {
          hipL = -0.10;
          kneeL = 0.04;
          hipR = 0.10;
          kneeR = 0.04;
          shL = -0.75;
          elbL = -0.85;
          shR = -1.20;
          elbR = -1.05;
          torsoTilt = -0.04;
          bodyBob = Math.sin(phase * 0.5) * -0.4;
        } else if (state === 'photo_pose' || state === 'beach_fun') {
          var jmp = Math.max(0, Math.sin(phase * 1.25));
          bodyBob = -jmp * 6.5;
          hipL = -0.22 + jmp * 0.30;
          kneeL = 0.28;
          hipR = 0.22 - jmp * 0.30;
          kneeR = 0.28;

          shL = -2.1 + Math.sin(phase * 1.8) * 0.32;
          elbL = -0.2;
          shR = -1.9 - Math.sin(phase * 1.8) * 0.32;
          elbR = -0.2;
          torsoTilt = Math.sin(phase) * 0.08;
        } else if (state === 'tired') {
          var br = Math.sin(phase * 0.9);
          hipL = -0.14;
          kneeL = 0.32;
          hipR = 0.14;
          kneeR = 0.32;
          shL = 0.32;
          elbL = -0.2;
          shR = -0.80 + br * 0.10;
          elbR = -1.0;
          torsoTilt = 0.32 + br * 0.04;
          bodyBob = 1.5 + br * 0.8;
          headNod = 0.22;
        }

        function drawLeg(hipA, kneeA, isBack) {
          ctx.save();
          ctx.translate(0, -11.5 + bodyBob + sitDrop);
          ctx.rotate(hipA);
          ctx.strokeStyle = isBack ? '#0f172a' : pants;
          ctx.lineWidth = 4.2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, 6.0);
          ctx.stroke();

          ctx.translate(0, 6.0);
          ctx.rotate(kneeA);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, 5.5);
          ctx.stroke();

          ctx.translate(0, 5.5);
          ctx.fillStyle = isBack ? '#cbd5e1' : '#ffffff';
          ctx.beginPath();
          ctx.ellipse(1.7, 0.4, 3.2, 1.7, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        function drawArm(shA, elbA, isBack) {
          ctx.save();
          ctx.translate(0, -20.5 + bodyBob + sitDrop);
          ctx.rotate(shA);
          ctx.strokeStyle = isBack ? '#0e7490' : shirt;
          ctx.lineWidth = 3.4;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, 5.2);
          ctx.stroke();

          ctx.translate(0, 5.2);
          ctx.rotate(elbA);
          ctx.strokeStyle = skin;
          ctx.lineWidth = 2.9;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, 4.8);
          ctx.stroke();

          ctx.translate(0, 4.8);
          ctx.fillStyle = skin;
          ctx.beginPath();
          ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
          ctx.fill();

          if (!isBack) {
            if (state === 'climb') {
              ctx.strokeStyle = '#fde047';
              ctx.lineWidth = 1.7;
              ctx.beginPath();
              ctx.moveTo(0, -3);
              ctx.lineTo(2.5, 11);
              ctx.stroke();
            } else if (state === 'take_photo' || state === 'selfie') {
              ctx.fillStyle = '#0f172a';
              ctx.fillRect(-1, -3, 5.5, 4.2);
              ctx.fillStyle = '#38bdf8';
              ctx.beginPath();
              ctx.arc(4.5, -0.8, 1.4, 0, Math.PI * 2);
              ctx.fill();
            } else if (opts.hasMug && (state === 'sit_camp' || state === 'sit_relax' || state === 'chat')) {
              // Warm tea/coffee mug in hand!
              ctx.fillStyle = '#f97316';
              ctx.fillRect(0, -2.5, 4.2, 4.8);
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 1;
              ctx.strokeRect(0, -2.5, 4.2, 4.8);
            }
          }
          ctx.restore();
        }

        drawArm(shL, elbL, true);
        drawLeg(hipL, kneeL, true);

        ctx.save();
        ctx.translate(0, -11.5 + bodyBob + sitDrop);
        ctx.rotate(torsoTilt);

        // Backpack
        ctx.fillStyle = bagColor;
        ctx.beginPath();
        ctx.roundRect(-7.2, -10.2, 5.2, 9.2, 2.2);
        ctx.fill();

        // Compact Torso
        ctx.fillStyle = shirt;
        ctx.beginPath();
        ctx.roundRect(-3.8, -11.0, 7.6, 11.5, 3.0);
        ctx.fill();

        // Proportional Head
        ctx.save();
        ctx.translate(0, -14.2);
        ctx.rotate(headNod);
        ctx.fillStyle = skin;
        ctx.beginPath();
        ctx.arc(0, 0, 5.0, 0, Math.PI * 2);
        ctx.fill();

        // Cap
        ctx.fillStyle = hatColor;
        ctx.beginPath();
        ctx.arc(0, -1.4, 5.1, Math.PI, 0);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-4.8, -1.4);
        ctx.lineTo(7.2, -1.4);
        ctx.lineWidth = 2.0;
        ctx.strokeStyle = hatColor;
        ctx.stroke();

        // Eye / Sunglasses
        if (state === 'beach_fun' || state === 'party') {
          ctx.fillStyle = '#020617';
          ctx.fillRect(1.0, -1.1, 3.5, 1.9);
        } else {
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(2.4, -0.4, 0.9, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
        ctx.restore();

        drawLeg(hipR, kneeR, false);
        drawArm(shR, elbR, false);

        ctx.restore();
      }

      // =========================================================================
      // SCENIC TOUR SPOT & CAMPING RENDERERS
      // 1. Mountain + Summit Viewpoint + Optional Base Tent
      // 2. Tent Campsite + Flickering Campfire + String Lights
      // 3. Tea Garden Terraces + Shade Trees + Camera Flash
      // 4. Cox's Bazar Beach + Rolling Waves + Umbrella + Beach Ball + Optional Beach Tent
      // 5. Hill Waterfall & Lagoon Picnic Spot
      // 6. Horizontal Moving Tour Bus (Drives smoothly along horizontal roads!)
      // =========================================================================
      function drawCampingTentAndFire(cx, cy, alpha, waveTick, tentPeekerMember, hasFire) {
        if (alpha <= 0.01) return;
        ctx.save();
        ctx.globalAlpha = clamp(alpha, 0, 1);
        ctx.translate(cx, cy);

        // Ground camp mat
        ctx.fillStyle = 'rgba(20, 83, 45, 0.35)';
        ctx.beginPath();
        ctx.ellipse(0, 1, 56, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Secondary small dome tent on the left
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(-36, 0, 14, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Main A-Frame / Dome Tent (তাঁবু)
        var tentGrad = ctx.createLinearGradient(-22, -30, 16, 0);
        tentGrad.addColorStop(0, '#f97316');
        tentGrad.addColorStop(1, '#ea580c');
        ctx.fillStyle = tentGrad;
        ctx.beginPath();
        ctx.moveTo(-24, 0);
        ctx.lineTo(-4, -30);
        ctx.lineTo(18, 0);
        ctx.closePath();
        ctx.fill();

        // Tent side wall (3D perspective)
        ctx.fillStyle = '#c2410c';
        ctx.beginPath();
        ctx.moveTo(-4, -30);
        ctx.lineTo(28, -22);
        ctx.lineTo(38, 0);
        ctx.lineTo(18, 0);
        ctx.closePath();
        ctx.fill();

        // Tent open dark doorway flap
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(-13, 0);
        ctx.lineTo(-4, -19);
        ctx.lineTo(5, 0);
        ctx.closePath();
        ctx.fill();

        // Warm interior lantern glow inside tent
        ctx.fillStyle = 'rgba(253, 224, 71, 0.35)';
        ctx.beginPath();
        ctx.arc(-4, -8, 6, 0, Math.PI * 2);
        ctx.fill();

        // If a group member is relaxing inside the tent, draw their cute head peeking out!
        if (tentPeekerMember) {
          ctx.fillStyle = '#fcd34d';
          ctx.beginPath();
          ctx.arc(-4, -5.5, 3.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = tentPeekerMember.hat;
          ctx.beginPath();
          ctx.arc(-4, -6.5, 3.3, Math.PI, 0);
          ctx.fill();
        }

        // Guy ropes & pegs
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(-4, -30);
        ctx.lineTo(-30, 0);
        ctx.moveTo(28, -22);
        ctx.lineTo(44, 0);
        ctx.stroke();

        // Flickering Campfire (ক্যাম্পফায়ার) in front-right of tent
        if (hasFire !== false) {
          var fx = -18, fy = 4;
          // Wood logs
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(fx - 7, fy + 1);
          ctx.lineTo(fx + 7, fy - 2);
          ctx.moveTo(fx - 6, fy - 2);
          ctx.lineTo(fx + 6, fy + 1);
          ctx.stroke();

          // Outer orange flame
          var fH1 = 11 + Math.sin(waveTick * 4.2) * 2.5;
          ctx.fillStyle = '#f97316';
          ctx.beginPath();
          ctx.moveTo(fx - 5, fy - 1);
          ctx.quadraticCurveTo(fx - 2, fy - fH1, fx, fy - fH1 - 2);
          ctx.quadraticCurveTo(fx + 3, fy - fH1, fx + 5, fy - 1);
          ctx.closePath();
          ctx.fill();

          // Inner yellow flame
          var fH2 = 7 + Math.cos(waveTick * 5.1) * 1.8;
          ctx.fillStyle = '#fde047';
          ctx.beginPath();
          ctx.moveTo(fx - 3, fy - 1);
          ctx.quadraticCurveTo(fx, fy - fH2 - 2, fx + 3, fy - 1);
          ctx.closePath();
          ctx.fill();

          // Rising glowing embers / smoke
          for (var s = 0; s < 3; s++) {
            var sy = ((waveTick * 12 + s * 7) % 18);
            var sx = fx + Math.sin(waveTick * 2 + s) * 3.5;
            ctx.fillStyle = s % 2 === 0 ? 'rgba(253, 224, 71, 0.75)' : 'rgba(203, 213, 225, 0.45)';
            ctx.beginPath();
            ctx.arc(sx, fy - 10 - sy, 1.3, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.restore();
      }

      function drawMountainSpot(cx, cy, alpha, waveTick, withCampTent, tentPeeker) {
        if (alpha <= 0.01) return;
        ctx.save();
        ctx.globalAlpha = clamp(alpha, 0, 1);
        ctx.translate(cx, cy);

        // Distant mist / clouds drifting past peak
        var cloudShift = Math.sin(waveTick * 0.4) * 12;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.beginPath();
        ctx.arc(-28 + cloudShift, -46, 8, 0, Math.PI * 2);
        ctx.arc(-20 + cloudShift, -48, 10, 0, Math.PI * 2);
        ctx.arc(-11 + cloudShift, -46, 7, 0, Math.PI * 2);
        ctx.fill();

        // Secondary left & right ridges
        ctx.fillStyle = '#065f46';
        ctx.beginPath();
        ctx.moveTo(-78, 0);
        ctx.lineTo(-34, -44);
        ctx.lineTo(12, 0);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#0f766e';
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(38, -38);
        ctx.lineTo(78, 0);
        ctx.closePath();
        ctx.fill();

        // Main Mountain Peak with flat summit plateau for hanging out!
        var grad = ctx.createLinearGradient(0, -60, 0, 0);
        grad.addColorStop(0, '#10b981');
        grad.addColorStop(0.55, '#047857');
        grad.addColorStop(1, '#064e3b');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(-64, 0);
        ctx.lineTo(-14, -56);
        ctx.lineTo(14, -56); // 28px wide flat summit viewpoint ledge!
        ctx.lineTo(64, 0);
        ctx.closePath();
        ctx.fill();

        // Winding trekking path
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(-54, -2);
        ctx.lineTo(-22, -28);
        ctx.lineTo(-4, -55);
        ctx.lineTo(24, -26);
        ctx.lineTo(52, -2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Summit viewpoint boulder & flag
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.arc(-8, -56, 4.5, Math.PI, 0);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(8, -56);
        ctx.lineTo(8, -69);
        ctx.stroke();
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(8, -69);
        ctx.lineTo(19, -65);
        ctx.lineTo(8, -61);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        // Optional Mountain Base Camp Tent!
        if (withCampTent) {
          drawCampingTentAndFire(cx + 42, cy + 2, alpha, waveTick, tentPeeker, true);
        }
      }

      function getMountainElevationAt(dx) {
        // Matches the flat summit plateau (-14..+14 -> -56px) and slopes (-64..+64)
        var adx = Math.abs(dx);
        if (adx <= 14) return -56;
        if (adx >= 64) return 0;
        return -56 * (1 - (adx - 14) / 50);
      }

      function drawTeaGardenSpot(cx, cy, alpha, flashAlpha, flashOriginX, flashOriginY, waveTick) {
        if (alpha <= 0.01) return;
        ctx.save();
        ctx.globalAlpha = clamp(alpha, 0, 1);
        ctx.translate(cx, cy);

        // Back terraced tea hills
        ctx.fillStyle = '#14532d';
        ctx.beginPath();
        ctx.moveTo(-82, 0);
        ctx.quadraticCurveTo(-42, -38, 0, -16);
        ctx.quadraticCurveTo(42, -40, 82, 0);
        ctx.closePath();
        ctx.fill();

        // Mid terraced tea hills
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.moveTo(-74, 0);
        ctx.quadraticCurveTo(-26, -26, 18, -10);
        ctx.quadraticCurveTo(50, -28, 76, 0);
        ctx.closePath();
        ctx.fill();

        // Staggered rows of lush tea bushes (2 depth tiers so characters walk among them!)
        var tier1X = [-58, -38, -18, 2, 22, 42, 60];
        ctx.fillStyle = '#16a34a';
        for (var i = 0; i < tier1X.length; i++) {
          ctx.beginPath();
          ctx.arc(tier1X[i], -10, 9.5, Math.PI, 0);
          ctx.fill();
        }

        var tier2X = [-66, -48, -28, -8, 12, 32, 52];
        ctx.fillStyle = '#22c55e';
        for (var k = 0; k < tier2X.length; k++) {
          ctx.beginPath();
          ctx.arc(tier2X[k], -2, 8.5, Math.PI, 0);
          ctx.fill();
        }

        // Shade trees
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.moveTo(-62, -2);
        ctx.lineTo(-62, -28);
        ctx.moveTo(56, -4);
        ctx.lineTo(56, -26);
        ctx.stroke();

        ctx.fillStyle = '#166534';
        ctx.beginPath();
        ctx.arc(-62, -31, 12, 0, Math.PI * 2);
        ctx.arc(56, -29, 10, 0, Math.PI * 2);
        ctx.fill();

        // Floating tea leaves
        for (var j = 0; j < 4; j++) {
          var lx = -40 + j * 26 + Math.sin(waveTick + j) * 6;
          var ly = -24 - Math.cos(waveTick * 1.2 + j) * 4;
          ctx.fillStyle = '#4ade80';
          ctx.beginPath();
          ctx.ellipse(lx, ly, 3.0, 1.5, 0.4, 0, Math.PI * 2);
          ctx.fill();
        }

        // Dynamic Camera Flash burst from whichever friend is currently taking a photo
        if (flashAlpha > 0.02) {
          ctx.save();
          ctx.globalAlpha = alpha * flashAlpha;
          var fx = flashOriginX || 28;
          var fy = (flashOriginY || -14);
          ctx.fillStyle = 'rgba(254, 240, 138, 0.72)';
          ctx.beginPath();
          ctx.moveTo(fx, fy);
          ctx.lineTo(fx - 55, fy - 24);
          ctx.lineTo(fx - 55, fy + 16);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(fx, fy, 6.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        ctx.restore();
      }

      function drawCoxsBazarSpot(cx, cy, alpha, waveTick, withBeachTent, tentPeeker) {
        if (alpha <= 0.01) return;
        ctx.save();
        ctx.globalAlpha = clamp(alpha, 0, 1);
        ctx.translate(cx, cy);

        // Wide golden sandy beach
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.moveTo(-88, 2);
        ctx.quadraticCurveTo(0, -20, 88, 2);
        ctx.lineTo(88, 8);
        ctx.lineTo(-88, 8);
        ctx.closePath();
        ctx.fill();

        // Animated Rolling Ocean Waves
        ctx.fillStyle = 'rgba(2, 132, 199, 0.80)';
        ctx.beginPath();
        ctx.moveTo(-82, 1);
        for (var wx = -82; wx <= 82; wx += 12) {
          var wy = -5 + Math.sin(wx * 0.08 + waveTick * 1.6) * 3.2;
          ctx.lineTo(wx, wy);
        }
        ctx.lineTo(82, 6);
        ctx.lineTo(-82, 6);
        ctx.closePath();
        ctx.fill();

        // White surf foam
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (var fx = -78; fx <= 78; fx += 12) {
          var fy = -3.5 + Math.cos(fx * 0.08 + waveTick * 1.6) * 2.4;
          if (fx === -78) ctx.moveTo(fx, fy);
          else ctx.lineTo(fx, fy);
        }
        ctx.stroke();

        // Coconut Palm Tree on left
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(-64, 0);
        ctx.quadraticCurveTo(-70, -19, -56, -36);
        ctx.stroke();

        ctx.strokeStyle = '#16a34a';
        ctx.lineWidth = 2.4;
        var angles = [-2.6, -2.0, -1.1, -0.4];
        for (var a = 0; a < angles.length; a++) {
          ctx.beginPath();
          ctx.moveTo(-56, -36);
          ctx.quadraticCurveTo(
            -56 + Math.cos(angles[a]) * 10,
            -36 + Math.sin(angles[a]) * 10,
            -56 + Math.cos(angles[a]) * 19,
            -36 + Math.sin(angles[a]) * 6 + 4
          );
          ctx.stroke();
        }

        // Striped Beach Umbrella & Beach Mat
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.ellipse(42, 1, 14, 3.2, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(42, 0);
        ctx.lineTo(46, -25);
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(46, -23, 14, Math.PI * 1.05, Math.PI * 1.95);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(46, -23, 14, Math.PI * 1.35, Math.PI * 1.65);
        ctx.lineTo(46, -23);
        ctx.closePath();
        ctx.fill();

        // Bouncing Beach Ball between friends
        var ballX = -10 + Math.sin(waveTick * 1.4) * 22;
        var ballY = -4 - Math.abs(Math.cos(waveTick * 2.8)) * 12;
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(ballX, ballY, 3.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(ballX - 1, ballY - 1, 1.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        if (withBeachTent) {
          drawCampingTentAndFire(cx - 28, cy - 2, alpha, waveTick, tentPeeker, false);
        }
      }

      function drawWaterfallLagoonSpot(cx, cy, alpha, waveTick, withCampTent, tentPeeker) {
        if (alpha <= 0.01) return;
        ctx.save();
        ctx.globalAlpha = clamp(alpha, 0, 1);
        ctx.translate(cx, cy);

        // Rocky cliff backdrop
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.moveTo(-65, 0);
        ctx.lineTo(-42, -48);
        ctx.lineTo(15, -48);
        ctx.lineTo(45, 0);
        ctx.closePath();
        ctx.fill();

        // Cascading Waterfall stream
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(-22, -48);
        ctx.lineTo(-6, -48);
        ctx.lineTo(2, 0);
        ctx.lineTo(-28, 0);
        ctx.closePath();
        ctx.fill();

        // Animated falling water streaks
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 1.6;
        for (var w = 0; w < 4; w++) {
          var wx = -20 + w * 5;
          var wy = -44 + ((waveTick * 18 + w * 9) % 36);
          ctx.beginPath();
          ctx.moveTo(wx, wy);
          ctx.lineTo(wx + 1, wy + 7);
          ctx.stroke();
        }

        // Turquoise lagoon pool at base
        ctx.fillStyle = 'rgba(14, 165, 233, 0.78)';
        ctx.beginPath();
        ctx.ellipse(-8, 2, 42, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Mist foam at waterfall base
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        for (var m = 0; m < 4; m++) {
          ctx.beginPath();
          ctx.arc(-22 + m * 6 + Math.sin(waveTick * 3 + m) * 2, 0, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();

        if (withCampTent) {
          drawCampingTentAndFire(cx + 44, cy + 1, alpha, waveTick, tentPeeker, true);
        }
      }

      function drawMovingTourBus(x, y, dir, alpha, boardedCount, wheelAngle) {
        if (alpha <= 0.01) return;
        ctx.save();
        ctx.globalAlpha = clamp(alpha, 0, 1);
        var bounce = Math.sin(wheelAngle * 2.0) * 0.65;
        ctx.translate(x, y + bounce);
        ctx.scale(dir, 1);

        // Road shadow
        ctx.fillStyle = 'rgba(15, 23, 42, 0.30)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 44, 3.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Exhaust smoke puffs behind bus when moving
        for (var p = 0; p < 2; p++) {
          var prog = ((wheelAngle * 3 + p * 3.1) % 6) / 6;
          ctx.fillStyle = 'rgba(148, 163, 184, ' + (0.45 * (1 - prog)) + ')';
          ctx.beginPath();
          ctx.arc(-42 - prog * 18, -5 - prog * 5, 2.2 + prog * 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Luxury Tour Coach Body
        ctx.fillStyle = '#059669';
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.roundRect(-42, -25, 84, 21, 5);
        ctx.fill();
        ctx.stroke();

        // Roof luggage rack
        ctx.strokeStyle = '#047857';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(-26, -28, 44, 3);

        // Accent stripe
        ctx.fillStyle = '#22d3ee';
        ctx.fillRect(-40, -10, 80, 2.2);

        // Passenger windows; count can vary by trip
        for (var i = 0; i < 5; i++) {
          var wx = -36 + i * 12.5;
          ctx.fillStyle = '#bae6fd';
          ctx.fillRect(wx, -22, 10, 8.8);
          if (i < boardedCount) {
            var m = groupMembers[i];
            ctx.fillStyle = '#fcd34d';
            ctx.beginPath();
            ctx.arc(wx + 5, -16, 2.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = m.hat;
            ctx.beginPath();
            ctx.arc(wx + 5, -17, 2.7, Math.PI, 0);
            ctx.fill();
          }
        }

        // Windshield
        ctx.fillStyle = '#7dd3fc';
        ctx.fillRect(30, -22, 10, 11);

        // Warm Headlight beam
        ctx.fillStyle = 'rgba(253, 224, 71, 0.38)';
        ctx.beginPath();
        ctx.moveTo(42, -8);
        ctx.lineTo(68, -14);
        ctx.lineTo(68, -2);
        ctx.closePath();
        ctx.fill();

        // Spinning Wheels with spokes
        var wheelX = [-24, 24];
        for (var w = 0; w < 2; w++) {
          ctx.save();
          ctx.translate(wheelX[w], -3.8);
          ctx.fillStyle = '#0f172a';
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, 4.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.rotate(wheelAngle);
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(-3, 0);
          ctx.lineTo(3, 0);
          ctx.moveTo(0, -3);
          ctx.lineTo(0, 3);
          ctx.stroke();
          ctx.restore();
        }

        ctx.restore();
      }

      // Travel cars and local transport (not just the same coach on every journey).
      function drawTourVehicle(x,y,dir,alpha,boarded,angle,kind) {
        if(kind==='bus' || !kind) {drawMovingTourBus(x,y,dir,alpha,boarded,angle);return;}
        ctx.save(); ctx.globalAlpha=clamp(alpha,0,1);ctx.translate(x,y+Math.sin(angle*2)*0.45);ctx.scale(dir,1);
        var body=kind==='rickshaw'?'#22c55e':kind==='cng'?'#16a34a':kind==='microbus'?'#0284c7':'#b45309';
        var w=kind==='rickshaw'?49:kind==='cng'?52:kind==='jeep'?65:74;
        ctx.fillStyle='rgba(2,6,23,.22)';ctx.beginPath();ctx.ellipse(0,1,w*.53,3,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=body;ctx.strokeStyle='#064e3b';ctx.lineWidth=1.5;
        if(kind==='rickshaw') {
          ctx.fillRect(-23,-14,43,11);ctx.strokeRect(-23,-14,43,11);
          ctx.fillStyle='#fef08a';ctx.beginPath();ctx.moveTo(-22,-15);ctx.lineTo(-12,-30);ctx.lineTo(10,-30);ctx.lineTo(22,-15);ctx.closePath();ctx.fill();
          ctx.strokeStyle='#047857';ctx.beginPath();ctx.moveTo(21,-7);ctx.lineTo(33,-14);ctx.lineTo(38,-14);ctx.stroke();
          ctx.fillStyle='#fcd34d';ctx.beginPath();ctx.arc(22,-17,3,0,7);ctx.fill();
        } else if(kind==='cng') {
          ctx.beginPath();ctx.roundRect(-28,-24,56,21,6);ctx.fill();ctx.stroke();ctx.fillStyle='#86efac';ctx.fillRect(-10,-20,15,9);ctx.fillRect(9,-20,13,9);
          ctx.fillStyle='#111827';ctx.fillRect(-24,-22,12,5);
        } else if(kind==='jeep') {
          ctx.beginPath();ctx.roundRect(-36,-18,73,15,5);ctx.fill();ctx.stroke();ctx.fillStyle='#cbd5e1';ctx.fillRect(-7,-29,31,13);ctx.fillStyle=body;ctx.fillRect(-11,-18,51,9);
          ctx.fillStyle='#7dd3fc';ctx.fillRect(-3,-27,9,8);ctx.fillRect(10,-27,10,8);
        } else {
          ctx.beginPath();ctx.roundRect(-39,-25,79,21,5);ctx.fill();ctx.stroke();ctx.fillStyle='#dbeafe';for(var k=-31;k<=23;k+=16)ctx.fillRect(k,-21,12,9);
        }
        var wheels=(kind==='rickshaw'?[-18,18]:kind==='cng'?[-19,19]:kind==='jeep'?[-26,26]:[-28,27]);
        wheels.forEach(function(px){ctx.fillStyle='#0f172a';ctx.beginPath();ctx.arc(px,-3.5,4.5,0,7);ctx.fill();ctx.strokeStyle='#e2e8f0';ctx.lineWidth=1;ctx.beginPath();ctx.arc(px,-3.5,2.2,0,7);ctx.stroke();});
        ctx.restore();
      }

      // =========================================================================
      // DYNAMIC TOUR DIRECTOR & REALISTIC MULTI-ACTIVITY STATE MACHINE
      // Ensures every tour cycle has varied spots, varied camping, natural 2D
      // roaming at each spot, and real horizontal bus driving!
      // =========================================================================
      var SPOT_POOL = [
        { type: 'sundarbans', withCamp:false, duration:9.0, label:'সুন্দরবন • বাঘ ও হরিণ' },
        { type: 'national_zoo',withCamp:false,duration:11.5,label:'জাতীয় চিড়িয়াখানা • মিরপুর' },
        { type: 'bandarban', withCamp:true,duration:9.0,label:'বান্দরবান • নীলগিরি' },
        { type: 'sajek', withCamp:true,duration:11.0,label:'সাজেক ভ্যালি' },
        { type: 'ratargul', withCamp:false,duration:9.0,label:'রাতারগুল • সিলেট' },
        { type: 'saint_martin', withCamp:false,duration:9.0,label:'সেন্ট মার্টিন দ্বীপ' },
        { type: 'srimangal', withCamp:false,duration:11.0,label:'শ্রীমঙ্গল • চা বাগান' },
        { type: 'mountain',   withCamp: false, duration: 10.5, label:'পার্বত্য দৃশ্য' },
        { type: 'tent_camp',  withCamp: true,  duration: 11.0 },
        { type: 'tea_garden', withCamp: false, duration: 10.5 },
        { type: 'coxs_bazar', withCamp: true,  duration: 11.5 },
        { type: 'mountain',   withCamp: true,  duration: 11.5 },
        { type: 'waterfall',  withCamp: true,  duration: 10.5 },
        { type: 'coxs_bazar', withCamp: false, duration: 10.5 }
      ];

      var tour = {
        mode: 'WALK_TO_SPOT', // 'WALK_TO_SPOT', 'AT_SPOT', 'BUS_PICKUP', 'BUS_DRIVE', 'BUS_DROPOFF'
        timer: 0,
        waveTick: 0,
        wpIndex: 0,
        groupX: 160,
        groupY: 500,
        spotIndex: 0,
        currentSpot: SPOT_POOL[0],
        tripNumber:0,
        spotX: 260,
        spotY: 500,
        spotAlpha: 0,
        flashAlpha: 0,
        flashX: 20,
        flashY: -15,
        tentPeeker: null,
        spotsVisitedSinceBus: 0,
        bus: {
          active: false,
          x: -90,
          y: 500,
          dir: 1,
          speed: 2.8,
          wheelAngle: 0,
          boardedCount: 0,
          targetStopX: 300,
          dropStopX: 700,
          kind:'bus'
        },
        cruiserBus: {
          // Ambient tour bus that periodically drives along the horizontal bottom highway
          x: -120,
          y: 500,
          dir: 1,
          wheelAngle: 0,
          cooldown: 6.0,
          active: false,
          kind:'rickshaw'
        }
      };

      var recentSpotTypes=[];
      function pickNextSpotConfig() {
        // Pick a spot different from the immediate previous type so it always feels fresh
        var prevType = tour.currentSpot ? tour.currentSpot.type : '';
        var candidates = SPOT_POOL.filter(function (s) { return s.type !== prevType && recentSpotTypes.indexOf(s.type)<0; });
        if(!candidates.length)candidates=SPOT_POOL.filter(function(s){return s.type!==prevType;});
        var chosen = candidates[Math.floor(Math.random() * candidates.length)] || SPOT_POOL[0];
        recentSpotTypes.push(chosen.type);
        if(recentSpotTypes.length>3)recentSpotTypes.shift();
        return {
          type: chosen.type,
          label: chosen.label || ({tea_garden:'সিলেট • চা বাগান',coxs_bazar:'কক্সবাজার সমুদ্রসৈকত',waterfall:'মাধবকুণ্ড • ঝরনা',mountain:'পাহাড়ি পর্যটন',tent_camp:'অ্যাডভেঞ্চার ক্যাম্প'}[chosen.type]||'বাংলাদেশ ভ্রমণ'),
          withCamp: Math.random() < 0.65 ? true : chosen.withCamp,
          duration: chosen.duration + randRange(-1.2, 2.2)
        };
      }

      function assignIndividualSpotActivities() {
        var stype = tour.currentSpot.type;
        var hasCamp = tour.currentSpot.withCamp || stype === 'tent_camp';
        tour.tentPeeker = null;

        // Shuffle member indices so different friends do different roles every time!
        var indices = groupMembers.map(function(_,i){return i;});
        for (var s = indices.length - 1; s > 0; s--) {
          var r = Math.floor(Math.random() * (s + 1));
          var t = indices[s];
          indices[s] = indices[r];
          indices[r] = t;
        }

        for (var i = 0; i < groupMembers.length; i++) {
          var m = groupMembers[indices[i]];
          m.inTent = false;
          m.hasMug = false;
          m.actTimer = randRange(2.0, 3.8);

          if (stype === 'mountain') {
            // In mountain spot, friends explore the summit plateau, slopes, or base camp
            if (i === 0) {
              // Climbs to the summit viewpoint ledge
              m.tx = tour.spotX + randRange(-12, 10);
              m.ty = tour.spotY;
              m.targetState = 'photo_pose';
            } else if (i === 1) {
              // Sits on summit boulder enjoying the mountain breeze
              m.tx = tour.spotX + randRange(-10, 6);
              m.ty = tour.spotY;
              m.targetState = 'sit_relax';
              m.hasMug = true;
            } else if (i === 2) {
              // Takes photos on the mountain slope/ridge
              m.tx = tour.spotX + randRange(16, 36);
              m.ty = tour.spotY;
              m.targetState = 'take_photo';
            } else if (hasCamp && i === 3) {
              // Sits by the mountain base camp tent & fire
              m.tx = tour.spotX + 26 + randRange(-8, 8);
              m.ty = tour.spotY + randRange(1, 5);
              m.targetState = 'sit_camp';
              m.hasMug = true;
            } else {
              // Hikes up and down the mountain trail
              m.tx = tour.spotX + randRange(-44, 40);
              m.ty = tour.spotY;
              m.targetState = 'climb';
            }
          } else if (stype === 'tent_camp') {
            // Dedicated Tent Camping & Bonfire hangout
            if (i === 0 || i === 1) {
              // Sit around the campfire drinking tea and chatting
              m.tx = tour.spotX - 18 + (i === 0 ? -14 : 14);
              m.ty = tour.spotY + randRange(2, 6);
              m.targetState = 'sit_camp';
              m.hasMug = true;
            } else if (i === 2 && Math.random() < 0.75) {
              // Goes inside the tent and peeks out!
              m.tx = tour.spotX - 4;
              m.ty = tour.spotY;
              m.targetState = 'in_tent';
            } else if (i === 3) {
              // Strolls around campsite taking photos
              m.tx = tour.spotX + randRange(22, 48);
              m.ty = tour.spotY + randRange(-3, 5);
              m.targetState = 'take_photo';
            } else {
              // Roams & chats around the tents
              m.tx = tour.spotX + randRange(-48, 42);
              m.ty = tour.spotY + randRange(-4, 5);
              m.targetState = 'chat';
              m.hasMug = Math.random() < 0.5;
            }
          } else if (stype === 'tea_garden') {
            // Spread out in 2D across the tea garden hills (never in a line!)
            var spreadX = (i - (groupMembers.length - 1) / 2) * 20;
            m.tx = tour.spotX + spreadX + randRange(-5, 5);
            m.ty = tour.spotY + randRange(-13, 9);
            if (i === 0) {
              m.targetState = 'take_photo';
            } else if (i === 1 || i === 2) {
              m.targetState = 'photo_pose';
            } else {
              m.targetState = Math.random() < 0.5 ? 'chat' : 'walk';
            }
          } else if (stype === 'coxs_bazar' || stype === 'waterfall' || stype === 'saint_martin' || stype === 'ratargul' || stype === 'sundarbans' || stype === 'national_zoo' || stype === 'bandarban' || stype === 'sajek' || stype === 'srimangal') {
            // Spread out across the beach / waterfall lagoon
            var bSpread = (i - (groupMembers.length - 1) / 2) * 21;
            m.tx = tour.spotX + bSpread + randRange(-5, 5);
            m.ty = tour.spotY + randRange(-13, 10);
            if (i === 0) {
              // Relaxes under beach umbrella / rock bench
              m.tx = tour.spotX + 36;
              m.ty = tour.spotY + 2;
              m.targetState = 'sit_relax';
              m.hasMug = true;
            } else if (i === 1 || i === 2) {
              m.targetState = 'beach_fun';
            } else if (i === 3) {
              m.targetState = 'take_photo';
            } else {
              m.targetState = hasCamp ? 'sit_camp' : 'photo_pose';
            }
          }
          // One or two travelers occasionally celebrate or take a group selfie.
          // A single pose replaces an existing activity: no extra sprites or particles.
          if (i === groupMembers.length-1 && Math.random() < .65) {
            m.targetState = randomOf(['selfie','dance','party']);
            m.hasMug = false;
          }
        }
      }

      // Initialize starting state on the bottom road
      function initTour() {
        var wps = getPerimeterWaypoints();
        tour.wpIndex = 0;
        tour.groupX = wps[0].x;
        tour.groupY = wps[0].y;
        adjustGroupSize();
        reshuffleWalkingFormation();
        for (var i = 0; i < groupMembers.length; i++) {
          groupMembers[i].x = tour.groupX + groupMembers[i].slotX;
          groupMembers[i].y = tour.groupY + groupMembers[i].slotY;
        }
        startNextWalkLeg();
      }

      function startNextWalkLeg() {
        tour.tripNumber++;
        if(tour.tripNumber % 2===0){adjustGroupSize();}
        if(Math.random()<.45) groupMembers.forEach(function(member){if(Math.random()<.5)changeOutfit(member);});
        var wps = getPerimeterWaypoints();
        tour.wpIndex = (tour.wpIndex + 1) % wps.length;
        var targetWp = wps[tour.wpIndex];
        tour.spotX = clamp(targetWp.x + randRange(-18, 18), 100, vw - 100);
        tour.spotY = targetWp.y;
        tour.currentSpot = pickNextSpotConfig();
        tour.spotAlpha = 0;
        tour.mode = 'WALK_TO_SPOT';
        tour.timer = 0;
        reshuffleWalkingFormation();
        for (var i = 0; i < groupMembers.length; i++) {
          groupMembers[i].inTent = false;
          groupMembers[i].hasMug = false;
        }
      }

      function startBusPickupOnRoad() {
        var wps = getPerimeterWaypoints();
        var isMob = vw < 768;
        var roadY = vh - (isMob ? 152 : 18);
        // Bus enters from left or right horizontal edge and drives to the group!
        var enterFromLeft = tour.groupX < vw * 0.65;
        tour.bus.active = true;
        var n=groupMembers.length;
        tour.bus.kind= n<=2 ? randomOf(['rickshaw','cng','jeep']) : n<=3 ? randomOf(['cng','microbus','jeep']) : n<=6 ? randomOf(['microbus','jeep','bus']) : randomOf(['bus','microbus']);
        tour.bus.dir = enterFromLeft ? 1 : -1;
        tour.bus.x = enterFromLeft ? -70 : vw + 70;
        tour.bus.y = roadY;
        tour.bus.targetStopX = clamp(tour.groupX, 110, vw - 110);
        tour.bus.dropStopX = enterFromLeft
          ? clamp(tour.bus.targetStopX + randRange(240, 420), 180, vw - 110)
          : clamp(tour.bus.targetStopX - randRange(240, 420), 110, vw - 180);
        tour.bus.boardedCount = 0;
        tour.mode = 'BUS_PICKUP';
        tour.timer = 0;
      }

      initTour();
      if (reduceMotion) {
        tour.mode='AT_SPOT';
        tour.spotAlpha=1;
        tour.spotX=Math.round(vw*.50);
        tour.spotY=Math.round(vh*.75);
        groupMembers.forEach(function(m,i){m.x=tour.spotX-36+i*12;m.y=tour.spotY;m.tx=m.x;m.ty=m.y;});
        assignIndividualSpotActivities();
        setTimeout(updateAndRender, 50);
      }


      function updateAndRender() {
        ctx.clearRect(0, 0, vw, vh);
        tour.waveTick += 0.09;
        tour.timer += 1 / 30;

        // ---------------------------------------------------------------------
        // AMBIENT PASSING TOUR BUS ON THE BOTTOM ROAD (When main bus is idle)
        // Ensures the user sees the bus smoothly driving along the road!
        // ---------------------------------------------------------------------
        var isMob = vw < 768;
        var bottomRoadY = vh - (isMob ? 152 : 18);
        if (!tour.bus.active) {
          if (!tour.cruiserBus.active) {
            tour.cruiserBus.cooldown -= 1 / 30;
            if (tour.cruiserBus.cooldown <= 0) {
              tour.cruiserBus.active = true;
              tour.cruiserBus.kind=randomOf(['bus','rickshaw','cng','jeep','microbus']);
              tour.cruiserBus.dir = Math.random() < 0.5 ? 1 : -1;
              tour.cruiserBus.x = tour.cruiserBus.dir === 1 ? -85 : vw + 85;
              tour.cruiserBus.y = bottomRoadY;
            }
          } else {
            tour.cruiserBus.x += tour.cruiserBus.dir * 2.3;
            tour.cruiserBus.wheelAngle += 0.22;
            tour.cruiserBus.y = bottomRoadY;
            drawTourVehicle(tour.cruiserBus.x, tour.cruiserBus.y, tour.cruiserBus.dir, 0.92, 1, tour.cruiserBus.wheelAngle,tour.cruiserBus.kind);
            if ((tour.cruiserBus.dir === 1 && tour.cruiserBus.x > vw + 95) ||
                (tour.cruiserBus.dir === -1 && tour.cruiserBus.x < -95)) {
              tour.cruiserBus.active = false;
              tour.cruiserBus.cooldown = randRange(9.0, 15.0);
            }
          }
        }

        // ---------------------------------------------------------------------
        // MODE 1: WALKING TOGETHER AS A 2D GROUP TOWARD THE NEXT SPOT
        // With dynamic "ekto aghe piche" spacing so they never form a stiff line!
        // ---------------------------------------------------------------------
        if (tour.mode === 'WALK_TO_SPOT') {
          var dx = tour.spotX - tour.groupX;
          var dy = tour.spotY - tour.groupY;
          var dist = Math.hypot(dx, dy);

          // Fade in the upcoming spot as the group approaches
          if (dist < 140) {
            tour.spotAlpha = clamp((140 - dist) / 65, 0, 1);
          }

          drawActiveSpotScene();

          if (dist > 8) {
            var step = 1.58;
            // Gentle winding curve when moving vertically along the left/right sides
            var perpWave = Math.abs(dy) > Math.abs(dx) ? Math.sin(tour.waveTick * 0.7) * 0.45 : 0;
            tour.groupX += (dx / dist) * step + perpWave;
            tour.groupY += (dy / dist) * step;
          }

          var moveDir = dx >= 0 ? 1 : -1;
          for (var i = 0; i < groupMembers.length; i++) {
            var m = groupMembers[i];
            // Dynamic organic sway ("ekto aghe piche")
            var dynX = Math.sin(tour.waveTick * 0.8 + i * 1.7) * 5.5;
            var dynY = Math.cos(tour.waveTick * 0.7 + i * 2.1) * 3.0;
            var targetX = tour.groupX + m.slotX * moveDir + dynX;
            var targetY = tour.groupY + m.slotY + dynY;

            var mdx = targetX - m.x;
            var mdy = targetY - m.y;
            var mdist = Math.hypot(mdx, mdy);
            if (mdist > 0.5) {
              var mspd = Math.min(mdist, 1.05 * m.speedMul);
              m.x += (mdx / mdist) * mspd;
              m.y += (mdy / mdist) * mspd;
              m.dir = mdx >= -0.1 ? moveDir : -moveDir;
              m.phase += 0.16 * m.speedMul;
              m.state = Math.abs(dy) > Math.abs(dx) * 1.4 && dy < 0 ? 'climb' : 'walk';
            }
          }

          drawGroupSortedByDepth(false);

          if (dist <= 10) {
            tour.mode = 'AT_SPOT';
            tour.timer = 0;
            tour.spotAlpha = 1;
            assignIndividualSpotActivities();
          }
        }

        // ---------------------------------------------------------------------
        // MODE 2: SPENDING TIME & ROAMING AT THE SPOT (Mountain, Camp, Tea, Cox)
        // Friends walk around inside the spot, sit by tent/fire, climb peak, take photos
        // ---------------------------------------------------------------------
        else if (tour.mode === 'AT_SPOT') {
          var spotDur = tour.currentSpot.duration;
          var isLeaving = tour.timer > spotDur;
          if (!isLeaving) {
            tour.spotAlpha = Math.min(1, tour.spotAlpha + 0.04);
          } else {
            tour.spotAlpha = Math.max(0, tour.spotAlpha - 0.03);
          }

          // Check if anyone is taking a photo to trigger camera flash
          tour.flashAlpha = Math.max(0, tour.flashAlpha - 0.06);
          tour.tentPeeker = null;

          for (var j = 0; j < groupMembers.length; j++) {
            var gm = groupMembers[j];
            gm.actTimer -= 1 / 30;
            if (gm.actTimer <= 0 && !isLeaving) {
              // Pick a new micro-activity or sub-position within the spot so animation stays fresh!
              assignSingleMemberNewSpotAction(gm, j);
            }

            var tdx = gm.tx - gm.x;
            var tdy = gm.ty - gm.y;
            var tdist = Math.hypot(tdx, tdy);

            if (tdist > 2.2) {
              gm.inTent = false;
              var walkSpd = 1.12 * gm.speedMul;
              gm.x += (tdx / tdist) * walkSpd;
              gm.y += (tdy / tdist) * walkSpd;
              gm.dir = tdx >= 0 ? 1 : -1;
              gm.state = (tour.currentSpot.type === 'mountain' && Math.abs(gm.x - tour.spotX) < 55) ? 'climb' : 'walk';
              gm.phase += 0.15;
            } else {
              // Arrived at local spot target -> perform the spot activity!
              if (gm.targetState === 'in_tent') {
                gm.inTent = true;
                tour.tentPeeker = gm;
              } else {
                gm.inTent = false;
                gm.state = gm.targetState || 'chat';
                gm.phase += 0.11;
                // Face toward the center of the spot or campfire
                gm.dir = (tour.spotX - gm.x) >= 0 ? 1 : -1;

                if (gm.state === 'take_photo' && Math.random() < 0.025) {
                  tour.flashAlpha = 1.0;
                  tour.flashX = (gm.x - tour.spotX) + gm.dir * 6;
                  tour.flashY = -16;
                }
              }
            }
          }

          drawActiveSpotScene();
          drawGroupSortedByDepth(tour.currentSpot.type === 'mountain');

          if (isLeaving && tour.spotAlpha <= 0.02) {
            tour.spotsVisitedSinceBus++;
            var wpsNow = getPerimeterWaypoints();
            var onBottomRoad = wpsNow[tour.wpIndex] && wpsNow[tour.wpIndex].zone === 'bottom';
            // Take the Tour Bus after visiting 2+ spots when near the road!
            if (tour.spotsVisitedSinceBus >= 2) {
              tour.spotsVisitedSinceBus = 0;
              startBusPickupOnRoad();
            } else {
              startNextWalkLeg();
            }
          }
        }

        // ---------------------------------------------------------------------
        // MODE 3: TOUR BUS DRIVES IN ALONG THE ROAD & PICKS UP THE 5 FRIENDS
        // ---------------------------------------------------------------------
        else if (tour.mode === 'BUS_PICKUP') {
          var b = tour.bus;
          b.y = bottomRoadY;
          var distToStop = (b.targetStopX - b.x) * b.dir;

          if (distToStop > 2) {
            // Bus is driving along the road toward the pickup point
            var spd = clamp(distToStop * 0.06, 0.9, 3.2);
            b.x += b.dir * spd;
            b.wheelAngle += spd * 0.12;
          } else {
            // Bus has stopped at the pickup spot; friends walk to the bus door and board!
            b.x = b.targetStopX;
            var doorX = b.x + b.dir * 26;
            var doorY = b.y;
            var boarded = 0;

            for (var k = 0; k < groupMembers.length; k++) {
              var bm = groupMembers[k];
              bm.inTent = false;
              var bdx = doorX - bm.x;
              var bdy = doorY - bm.y;
              var bdist = Math.hypot(bdx, bdy);
              if (bdist > 4) {
                var wSpd = 1.15 * bm.speedMul;
                bm.x += (bdx / bdist) * wSpd;
                bm.y += (bdy / bdist) * wSpd;
                bm.dir = bdx >= 0 ? 1 : -1;
                bm.state = 'walk';
                bm.phase += 0.18;
              } else {
                boarded++;
              }
            }
            b.boardedCount = boarded;

            if (boarded >= groupMembers.length) {
              tour.mode = 'BUS_DRIVE';
              tour.timer = 0;
            }
          }

          // Draw unboarded friends walking to the bus
          for (var u = 0; u < groupMembers.length; u++) {
            var um = groupMembers[u];
            var doorCheck = Math.hypot((b.x + b.dir * 26) - um.x, b.y - um.y);
            if (distToStop > 2 || doorCheck > 4) {
              drawMiniAvatar(um.x, um.y, um);
            }
          }
          drawTourVehicle(b.x, b.y, b.dir, 1, b.boardedCount, b.wheelAngle,b.kind);
        }

        // ---------------------------------------------------------------------
        // MODE 4: BUS DRIVES HORIZONTALLY ALONG THE ROAD TO THE NEXT DESTINATION
        // ---------------------------------------------------------------------
        else if (tour.mode === 'BUS_DRIVE') {
          var bd = tour.bus;
          bd.y = bottomRoadY;
          var distToDrop = (bd.dropStopX - bd.x) * bd.dir;

          if (distToDrop > 3) {
            var driveSpd = clamp(distToDrop * 0.05, 1.1, 3.4);
            bd.x += bd.dir * driveSpd;
            bd.wheelAngle += driveSpd * 0.13;
            tour.groupX = bd.x;
            tour.groupY = bd.y;
          } else {
            tour.mode = 'BUS_DROPOFF';
            tour.timer = 0;
            reshuffleWalkingFormation();
          }

          drawTourVehicle(bd.x, bd.y, bd.dir, 1, groupMembers.length, bd.wheelAngle,bd.kind);
        }

        // ---------------------------------------------------------------------
        // MODE 5: BUS DROPS OFF THE 5 FRIENDS & CONTINUES DRIVING OFF-SCREEN!
        // ---------------------------------------------------------------------
        else if (tour.mode === 'BUS_DROPOFF') {
          var br = tour.bus;
          br.y = bottomRoadY;
          var steppedOff = Math.min(groupMembers.length, Math.floor(tour.timer / 0.35));
          br.boardedCount = Math.max(0, groupMembers.length - steppedOff);

          // Once all 5 friends have stepped off, the bus drives forward off-screen!
          if (br.boardedCount === 0) {
            br.x += br.dir * 3.1;
            br.wheelAngle += 0.32;
          }

          drawTourVehicle(br.x, br.y, br.dir, 1, br.boardedCount, br.wheelAngle,br.kind);

          for (var d = 0; d < steppedOff; d++) {
            var dm = groupMembers[d];
            var targetX = tour.groupX + dm.slotX;
            var targetY = tour.groupY + dm.slotY;
            dm.x += (targetX - dm.x) * 0.12;
            dm.y += (targetY - dm.y) * 0.12;
            dm.state = 'walk';
            dm.phase += 0.15;
            drawMiniAvatar(dm.x, dm.y, dm);
          }

          if (br.boardedCount === 0 && (br.x > vw + 90 || br.x < -90)) {
            br.active = false;
            startNextWalkLeg();
          }
        }

      }

      function assignSingleMemberNewSpotAction(m, idx) {
        var stype = tour.currentSpot.type;
        var hasCamp = tour.currentSpot.withCamp || stype === 'tent_camp';
        m.actTimer = randRange(2.4, 4.5);

        var r = Math.random();
        if (stype === 'mountain') {
          if (r < 0.35) {
            // Walk along the summit or trail
            m.tx = tour.spotX + randRange(-48, 48);
            m.ty = tour.spotY;
            m.targetState = Math.abs(m.tx - tour.spotX) < 15 ? 'photo_pose' : 'climb';
          } else if (r < 0.65) {
            // Sit on the summit viewpoint ledge
            m.tx = tour.spotX + randRange(-12, 12);
            m.ty = tour.spotY;
            m.targetState = 'sit_relax';
            m.hasMug = true;
          } else if (hasCamp && r < 0.85) {
            // Hang out by the mountain base tent
            m.tx = tour.spotX + 42 + randRange(-14, 12);
            m.ty = tour.spotY + randRange(1, 5);
            m.targetState = 'sit_camp';
            m.hasMug = true;
          } else {
            m.tx = tour.spotX + randRange(-30, 30);
            m.ty = tour.spotY;
            m.targetState = 'take_photo';
          }
        } else if (stype === 'tent_camp') {
          if (r < 0.40) {
            m.tx = tour.spotX - 18 + randRange(-16, 16);
            m.ty = tour.spotY + randRange(2, 6);
            m.targetState = 'sit_camp';
            m.hasMug = true;
          } else if (r < 0.65) {
            m.tx = tour.spotX + randRange(-48, 48);
            m.ty = tour.spotY + randRange(-4, 5);
            m.targetState = 'chat';
          } else {
            m.tx = tour.spotX + randRange(-45, 45);
            m.ty = tour.spotY + randRange(-3, 5);
            m.targetState = idx % 2 === 0 ? 'take_photo' : 'photo_pose';
          }
        } else {
          // Other destinations: explore independently, photograph wildlife, rest or chat.
          m.tx = tour.spotX + randRange(-56, 56);
          m.ty = tour.spotY + randRange(-6, 6);
          var actions = stype === 'coxs_bazar'
            ? ['beach_fun', 'sit_relax', 'take_photo', 'photo_pose', 'chat']
            : (stype==='sundarbans'||stype==='national_zoo'||stype==='ratargul')
              ? ['chat','take_photo','photo_pose','sit_relax','walk']
              : ['chat', 'take_photo', 'photo_pose', 'sit_relax'];
          m.targetState = actions[Math.floor(Math.random() * actions.length)];
          if(Math.random() < .38) m.targetState = randomOf(['selfie','dance','party']);
          m.hasMug = (m.targetState === 'sit_relax');
        }
      }

      // Bangladesh tourist spots, rendered as tiny stylized vignettes that leave app controls clickable.
      function drawTourTree(x,y,wave,color){
        ctx.save();ctx.translate(x,y);ctx.fillStyle='#78532e';ctx.fillRect(-3,-44,6,43);
        ctx.fillStyle=color||'#15803d';for(var i=0;i<4;i++){ctx.beginPath();ctx.ellipse(Math.sin(wave+i)*2+(i-1.5)*9,-43+(i%2)*9,14,17,0,0,Math.PI*2);ctx.fill();}ctx.restore();
      }
      function drawTiger(x,y,wave){
        ctx.save();ctx.translate(x+Math.sin(wave*.4)*10,y);ctx.fillStyle='#f59e0b';
        ctx.beginPath();ctx.ellipse(0,-10,20,9,0,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.ellipse(21,-15,10,9,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#fff7ed';ctx.beginPath();ctx.ellipse(26,-10,7,3,0,0,7);ctx.fill();
        ctx.fillStyle='#111827';for(var i=-13;i<=13;i+=9){ctx.save();ctx.translate(i,-12);ctx.rotate(-.2);ctx.fillRect(-2,-7,3,14);ctx.restore();}
        ctx.fillStyle='#f59e0b';for(var j=-1;j<=1;j+=2){ctx.fillRect(j*12-2,-5,4,7);ctx.fillRect(j*5-2,-5,4,7);}
        ctx.strokeStyle='#f59e0b';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-17,-12);ctx.quadraticCurveTo(-34,-25+Math.sin(wave)*5,-38,-12);ctx.stroke();
        ctx.fillStyle='#111827';ctx.beginPath();ctx.arc(26,-17,1.6,0,7);ctx.fill();ctx.restore();
      }
      function drawDeer(x,y,wave){
        ctx.save();ctx.translate(x,y);ctx.fillStyle='#b45309';ctx.beginPath();ctx.ellipse(0,-11,12,7,0,0,7);ctx.fill();
        ctx.fillRect(9,-22,4,10);ctx.beginPath();ctx.ellipse(13,-24,6,4,0,0,7);ctx.fill();
        ctx.fillRect(-8,-5,3,8);ctx.fillRect(6,-5,3,8);
        ctx.strokeStyle='#78350f';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(12,-27);ctx.lineTo(9,-35);ctx.moveTo(12,-30);ctx.lineTo(17,-35);ctx.stroke();
        ctx.fillStyle='#ffedd5';for(var i=-7;i<9;i+=7){ctx.beginPath();ctx.arc(i,-14,1.5,0,7);ctx.fill();}ctx.restore();
      }
      function drawRiverBoat(x,y,wave){
        ctx.save();ctx.translate(x+Math.sin(wave*.5)*8,y+Math.cos(wave)*1.6);
        ctx.fillStyle='#854d0e';ctx.beginPath();ctx.moveTo(-34,-6);ctx.lineTo(35,-6);ctx.lineTo(25,3);ctx.lineTo(-24,3);ctx.closePath();ctx.fill();
        ctx.strokeStyle='#166534';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(0,-32);ctx.stroke();
        ctx.fillStyle='#fef08a';ctx.beginPath();ctx.moveTo(1,-29);ctx.lineTo(1,-8);ctx.lineTo(21,-8);ctx.closePath();ctx.fill();ctx.restore();
      }
      function drawSundarbansSpot(x,y,a,w){
        if(a<=.02)return;ctx.save();ctx.globalAlpha=a;ctx.translate(x,y);
        ctx.fillStyle='rgba(59,130,246,.22)';ctx.beginPath();ctx.ellipse(0,6,87,11,0,0,7);ctx.fill();
        drawTourTree(-52,0,w,'#166534');drawTourTree(52,0,w,'#15803d');drawTourTree(0,0,w*.4,'#065f46');
        // Wild tiger and spotted deer roam behind the group at a respectful distance.
        drawTiger(-15,-12,w);drawDeer(54,0,w);
        ctx.restore();
      }
      function drawNationalZooSpot(x,y,a,w){
        if(a<=.02)return;ctx.save();ctx.globalAlpha=a;ctx.translate(x,y);
        ctx.fillStyle='rgba(134,239,172,.5)';ctx.beginPath();ctx.ellipse(0,2,84,9,0,0,7);ctx.fill();
        drawTourTree(-59,0,w,'#166534');
        ctx.strokeStyle='#64748b';ctx.lineWidth=1.8;for(var i=-43;i<72;i+=11){ctx.beginPath();ctx.moveTo(i,-45);ctx.lineTo(i,0);ctx.stroke();}
        ctx.beginPath();ctx.moveTo(-44,-44);ctx.lineTo(75,-44);ctx.moveTo(-44,-6);ctx.lineTo(75,-6);ctx.stroke();
        // Elephant inside habitat. A monkey swings from the tree branch.
        ctx.fillStyle='#64748b';ctx.beginPath();ctx.ellipse(22,-18,21,13,0,0,7);ctx.fill();
        ctx.beginPath();ctx.arc(39,-23,10,0,7);ctx.fill();ctx.fillRect(11,-10,5,13);ctx.fillRect(30,-10,6,13);
        ctx.strokeStyle='#64748b';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(45,-24);ctx.quadraticCurveTo(50,-5,44,-4);ctx.stroke();
        ctx.fillStyle='#0f172a';ctx.beginPath();ctx.arc(43,-26,1.5,0,7);ctx.fill();
        ctx.fillStyle='#a16207';ctx.beginPath();ctx.arc(-50+Math.sin(w)*3,-37,4.5,0,7);ctx.fill();
        ctx.strokeStyle='#92400e';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-49,-36);ctx.quadraticCurveTo(-58,-46,-64,-40);ctx.stroke();ctx.restore();
      }
      function drawBandarbanSpot(x,y,a,w){
        drawMountainSpot(x,y,a,w,true,null);
        if(a<=.02)return;ctx.save();ctx.globalAlpha=a;ctx.translate(x,y);
        // Nilgiri observation deck and a curved hillside trail.
        ctx.strokeStyle='#92400e';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(15,-27);ctx.lineTo(57,-27);ctx.moveTo(15,-27);ctx.lineTo(15,-45);ctx.moveTo(57,-27);ctx.lineTo(57,-45);ctx.stroke();
        ctx.fillStyle='rgba(255,255,255,.7)';for(var i=0;i<4;i++){ctx.beginPath();ctx.arc(-42+i*14+Math.sin(w*.3+i)*6,-48-i%2*5,8,0,7);ctx.fill();}ctx.restore();
      }
      function drawSajekSpot(x,y,a,w){
        drawMountainSpot(x,y,a,w,true,null);
        if(a<=.02)return;ctx.save();ctx.globalAlpha=a;ctx.translate(x,y);
        // Small Sajek hill cottage and passing cloud.
        ctx.fillStyle='#a16207';ctx.fillRect(-26,-30,32,23);ctx.fillStyle='#0f766e';ctx.beginPath();ctx.moveTo(-32,-30);ctx.lineTo(-10,-49);ctx.lineTo(13,-30);ctx.fill();
        ctx.fillStyle='#fef9c3';ctx.fillRect(-6,-22,7,9);ctx.fillStyle='#ffffff';ctx.beginPath();ctx.ellipse(18+Math.sin(w*.3)*9,-52,20,5,0,0,7);ctx.fill();ctx.restore();
      }
      function drawRatargulSpot(x,y,a,w){
        if(a<=.02)return;ctx.save();ctx.globalAlpha=a;ctx.translate(x,y);
        ctx.fillStyle='rgba(14,165,233,.37)';ctx.beginPath();ctx.ellipse(0,2,91,17,0,0,7);ctx.fill();
        drawTourTree(-55,-3,w,'#15803d');drawTourTree(46,-3,w,'#166534');
        drawRiverBoat(Math.sin(w*.4)*13,-2,w);
        ctx.strokeStyle='rgba(255,255,255,.6)';ctx.lineWidth=1.7;for(var i=0;i<3;i++){ctx.beginPath();ctx.arc(-50+i*34,2,6,0,Math.PI);ctx.stroke();}ctx.restore();
      }
      function drawSaintMartinSpot(x,y,a,w){
        if(a<=.02)return;ctx.save();ctx.globalAlpha=a;ctx.translate(x,y);
        ctx.fillStyle='rgba(56,189,248,.35)';ctx.beginPath();ctx.ellipse(0,6,90,15,0,0,7);ctx.fill();
        ctx.fillStyle='#fcd34d';ctx.beginPath();ctx.ellipse(0,1,73,9,0,0,7);ctx.fill();
        for(var i=0;i<2;i++){var px=i?-50:49;ctx.strokeStyle='#92400e';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(px,-2);ctx.lineTo(px+7,-45);ctx.stroke();
          ctx.strokeStyle='#15803d';ctx.lineWidth=5;for(var f=-2;f<=2;f++){ctx.beginPath();ctx.moveTo(px+7,-45);ctx.lineTo(px+7+f*10,-57+Math.abs(f)*4);ctx.stroke();}}
        drawRiverBoat(12,-8,w);ctx.restore();
      }

      function drawActiveSpotScene() {
        var st = tour.currentSpot.type;
        var sx = tour.spotX;
        var sy = tour.spotY;
        var al = tour.spotAlpha;

        if (st === 'sundarbans') {
          drawSundarbansSpot(sx,sy,al,tour.waveTick);
        } else if (st === 'national_zoo') {
          drawNationalZooSpot(sx,sy,al,tour.waveTick);
        } else if (st === 'bandarban') {
          drawBandarbanSpot(sx,sy,al,tour.waveTick);
        } else if (st === 'sajek') {
          drawSajekSpot(sx,sy,al,tour.waveTick);
        } else if (st === 'ratargul') {
          drawRatargulSpot(sx,sy,al,tour.waveTick);
        } else if (st === 'saint_martin') {
          drawSaintMartinSpot(sx,sy,al,tour.waveTick);
        } else if (st === 'srimangal') {
          drawTeaGardenSpot(sx,sy,al,tour.flashAlpha,tour.flashX,tour.flashY,tour.waveTick);
        } else if (st === 'mountain') {
          drawMountainSpot(sx, sy, al, tour.waveTick, tour.currentSpot.withCamp, tour.tentPeeker);
        } else if (st === 'tent_camp') {
          drawCampingTentAndFire(sx, sy, al, tour.waveTick, tour.tentPeeker, true);
        } else if (st === 'tea_garden') {
          drawTeaGardenSpot(sx, sy, al, tour.flashAlpha, tour.flashX, tour.flashY, tour.waveTick);
        } else if (st === 'coxs_bazar') {
          drawCoxsBazarSpot(sx, sy, al, tour.waveTick, tour.currentSpot.withCamp, tour.tentPeeker);
        } else if (st === 'waterfall') {
          drawWaterfallLagoonSpot(sx, sy, al, tour.waveTick, tour.currentSpot.withCamp, tour.tentPeeker);
        }
      }

      function drawGroupSortedByDepth(applyMountainHeight) {
        var sorted = groupMembers.slice().sort(function (a, b) { return a.y - b.y; });
        for (var i = 0; i < sorted.length; i++) {
          var m = sorted[i];
          var elevY = 0;
          if (applyMountainHeight) {
            // If not sitting at the base camp on the right (+42), follow the mountain terrain!
            var dx = m.x - tour.spotX;
            if (!(tour.currentSpot.withCamp && m.state === 'sit_camp' && dx > 20)) {
              elevY = getMountainElevationAt(dx);
            }
          }
          drawMiniAvatar(m.x, m.y + elevY, m);
        }
      }

      // Immediately paint so phones with paused RAF still show the group on startup.
      safeRender(0, false);
      scheduleFrame();
      window.setInterval(function() {
        if (document.hidden) return;
        if (Date.now() - lastWallPaint > 180) safeRender(Date.now(), true);
        scheduleFrame();
      }, 130);
      document.addEventListener('visibilitychange', function() {
        lastRenderTime=0;
        if (!document.hidden) { safeRender(Date.now(), true); scheduleFrame(); }
      });
      window.addEventListener('pageshow', function() {
        lastRenderTime=0;safeRender(Date.now(), true);scheduleFrame();
      });
      window.addEventListener('shikkha-animation-settings',function(){
        lastRenderTime=0;
        if(!document.documentElement.classList.contains('tour-animation-off')){
          safeRender(Date.now(),true);
          scheduleFrame();
        }
      });
    })();