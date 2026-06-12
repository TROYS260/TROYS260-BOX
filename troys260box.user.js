// ==UserScript==
// @name         TROYS260 BOX
// @namespace    https://github.com/TROYS260/TROYS260-BOX
// @version      1.4.2
// @description  Autocura Inteligente y Ráfaga de Bufos compacta y personalizada al 100% para TROYS260. Incluye Timer 5:22, Candado, Fix de Renderizado y Auto-Stop.
// @author       TROYS260
// @match        https://universe.flyff.com/*
// @grant        none
// @icon         https://universe.flyff.com/storage/img/favicon.png
// ==/UserScript==

(function () {
    'use strict';

    let isMinimized = false;
    let isLocked = false; 
    let worker = null;
    let isHealRunning = false;
    let timerInterval = null; 

    const HEAL_TARGET_KEY = '5';   
    const HEAL_AOE_KEY = '6';      

    const ATAL_BUFOS_CODE = 'BracketLeft'; 
    const ATAL_CURA_CODES = ['Quote', 'BracketRight']; 
    const ATAL_MINIMIZE_CODE = 'F10'; 

    const bufoSequence = [
        { key: 'F1', delay: 1500 }, { key: 'F1', delay: 1500 }, { key: 'F2', delay: 1500 },
        { key: 'F3', delay: 3000 }, { key: 'F4', delay: 4000 }, { key: 'F5', delay: 1500 },
        { key: 'F6', delay: 1500 }, { key: 'F7', delay: 4000 }, { key: 'F8', delay: 4000 },
        { key: 'F9', delay: 1500 }, { key: 'F12', delay: 1600 }, { key: '1', delay: 1400 },
        { key: '2', delay: 1400 }, { key: '3', delay: 1400 }
    ];

    const workerCode = `
        let burstTimers = [];
        let healTimeout = null;
        let isHealActive = false;
        function getHumanizedDelay() { return Math.floor(Math.random() * (1400 - 600 + 1)) + 600; }
        self.onmessage = function(e) {
            if (e.data.action === 'startBurst') {
                let seq = e.data.sequence; let currentIdx = 0;
                function executeNextBufo() {
                    if (currentIdx >= seq.length) { self.postMessage({ action: 'finishBurst' }); return; }
                    let item = seq[currentIdx];
                    self.postMessage({ action: 'pressKey', key: item.key });
                    currentIdx++;
                    let t = setTimeout(executeNextBufo, item.delay);
                    burstTimers.push(t);
                }
                executeNextBufo();
            } else if (e.data.action === 'stopBurst') { burstTimers.forEach(t => clearTimeout(t)); burstTimers = []; }
            else if (e.data.action === 'startHeal') {
                isHealActive = true;
                function loopHeal() {
                    if (!isHealActive) return;
                    self.postMessage({ action: 'pressKey', key: e.data.targetKey });
                    healTimeout = setTimeout(loopHeal, getHumanizedDelay());
                }
                loopHeal();
            } else if (e.data.action === 'stopHeal') { isHealActive = false; clearTimeout(healTimeout); }
        };
    `;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    worker = new Worker(URL.createObjectURL(blob));

    // --- LÓGICA DE DETECCIÓN DE MOVIMIENTO (RESTAURADA Y EXTENDIDA) ---
    const detectMovementAndStop = (e) => {
        if (isHealRunning) {
            // Teclas de movimiento
            if (['w', 'a', 's', 'd', 'W', 'A', 'S', 'D', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                const h = document.getElementById('btn-action-heal');
                if (h) stopHeal(h);
            }
        }
    };
    window.addEventListener('keydown', detectMovementAndStop, true);
    
    // Detección de clic en el juego para detener cura
    window.addEventListener('mousedown', (e) => {
        if (isHealRunning && e.target.tagName === 'CANVAS') {
            const h = document.getElementById('btn-action-heal');
            if (h) stopHeal(h);
        }
    }, true);
    // ------------------------------------------------------------------

    const startTimer = (duration) => {
        if (timerInterval) clearInterval(timerInterval);
        let t = duration;
        const disp = document.getElementById('timer-display');
        timerInterval = setInterval(() => {
            let m = Math.floor(t / 60);
            let s = t % 60;
            disp.innerText = `${m}:${s.toString().padStart(2, '0')}`;
            if (t <= 30 && t > 0) {
                disp.style.color = (t % 2 === 0) ? '#ff4d4d' : 'white';
                if ([30, 20, 10, 5, 4, 3, 2, 1].includes(t)) {
                    const ctx = new (window.AudioContext || window.webkitAudioContext)();
                    const osc = ctx.createOscillator();
                    osc.connect(ctx.destination);
                    osc.start(); osc.stop(ctx.currentTime + 0.1);
                }
            } else { disp.style.color = '#eee'; }
            if (--t < 0) { clearInterval(timerInterval); disp.innerText = "0:00"; }
        }, 1000);
    };

    const documentStyle = document.createElement('style');
    documentStyle.innerHTML = `
        .header-btn { cursor: pointer; color: #888; font-size: 14px; transition: color 0.2s; font-weight: bold; }
        .header-btn:hover { color: #fff; }
        .section-container { border: 1px solid #1e3d23; border-radius: 8px; padding: 10px; margin-bottom: 12px; background: rgba(15, 25, 18, 0.6); }
        .section-title-premium { color: #4ef06d; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.8px; display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
        .btn-premium { width: 100%; padding: 8px 0; color: #fff; border: 1px solid #222; border-radius: 6px; font-weight: bold; font-size: 11px; cursor: pointer; text-align: center; }
        .btn-p-green { background: linear-gradient(to bottom, #2bb649, #197a2d); border-color: #218838; }
        .btn-p-red { background: linear-gradient(to bottom, #dc3545, #a71d2a); border-color: #bd2130; }
    `;
    document.head.appendChild(documentStyle);

    const restoreFocus = () => { const g = document.querySelector('canvas'); if (g) g.focus(); };
    const pressKey = (k) => {
        const g = document.querySelector('canvas');
        if (!g) return;
        let c = k.startsWith('F') ? k : "Digit" + k;
        g.dispatchEvent(new KeyboardEvent('keydown', { key: k, code: c, bubbles: true }));
        setTimeout(() => g.dispatchEvent(new KeyboardEvent('keyup', { key: k, code: c, bubbles: true })), 20);
    };

    worker.onmessage = function(e) {
        if (e.data.action === 'pressKey') { 
            pressKey(e.data.key); 
            if (e.data.key === '2') startTimer(322);
        } 
        else if (e.data.action === 'finishBurst') { const b = document.getElementById('btn-action-burst'); if (b) stopBurst(b); }
    };

    const stopBurst = (btn) => { worker.postMessage({ action: 'stopBurst' }); btn.innerText = "ACTIVAR BUFOS"; btn.className = "btn-premium btn-p-green"; restoreFocus(); };
    const startBurst = (btn) => { btn.innerText = "PARAR"; btn.className = "btn-premium btn-p-red"; restoreFocus(); worker.postMessage({ action: 'startBurst', sequence: bufoSequence }); };
    const stopHeal = (btn) => { worker.postMessage({ action: 'stopHeal' }); isHealRunning = false; btn.innerText = "ACTIVAR CURA"; btn.className = "btn-premium btn-p-green"; restoreFocus(); };
    const startHeal = (btn) => { isHealRunning = true; btn.innerText = "PARAR CURA"; btn.className = "btn-premium btn-p-red"; restoreFocus(); worker.postMessage({ action: 'startHeal', targetKey: HEAL_TARGET_KEY }); };

    const toggleMinimize = () => {
        if (!isMinimized) { 
            body.style.display = 'none'; 
            container.style.width = '160px'; 
            container.querySelector('#fs-minimize').innerText = '+'; 
            isMinimized = true; 
        } else { 
            body.style.display = 'block'; 
            container.style.width = '235px'; 
            container.querySelector('#fs-minimize').innerText = '−'; 
            isMinimized = false; 
        }
    };

    const toggleLock = () => {
        isLocked = !isLocked;
        container.querySelector('#fs-lock').innerText = isLocked ? '🔒' : '🔓';
    };

    const detectHotkeys = (e) => {
        if (e.target.tagName === 'INPUT') return;
        if (e.code === ATAL_BUFOS_CODE) { const b = document.getElementById('btn-action-burst'); if(b) b.classList.contains('btn-p-green') ? startBurst(b) : stopBurst(b); }
        else if (ATAL_CURA_CODES.includes(e.code)) { const h = document.getElementById('btn-action-heal'); if(h) h.classList.contains('btn-p-green') ? startHeal(h) : stopHeal(h); }
        else if (e.code === ATAL_MINIMIZE_CODE) toggleMinimize();
    };
    window.addEventListener('keydown', detectHotkeys, true);

    const container = document.createElement('div');
    container.id = 'fs-container';
    Object.assign(container.style, { position: 'fixed', top: '40px', right: '40px', width: '235px', backgroundColor: '#0c100d', color: '#eee', borderRadius: '10px', border: '1px solid #28a745', zIndex: '10000', fontFamily: 'Segoe UI', fontSize: '11px', userSelect: 'none' });
    container.innerHTML = `
        <div id="fs-header" style="padding: 10px; background: #0f1410; cursor: move; border-radius: 9px 9px 0 0; display: flex; justify-content: center; border-bottom: 1px solid #1e3d23; font-weight: bold; color: #4ef06d;">
            <span>TROYS260 V1.4.2</span>
            <div style="position: absolute; right: 10px; display: flex; gap: 8px;">
                <span id="fs-lock" class="header-btn">🔓</span>
                <span id="fs-minimize" class="header-btn">−</span>
                <span id="fs-close" class="header-btn">✕</span>
            </div>
        </div>
        <div id="fs-body" style="padding: 12px; background: #0c100d;">
            <div class="section-container"><div class="section-title-premium">🕊️ RÁFAGA DE BUFOS</div><button id="btn-action-burst" class="btn-premium btn-p-green">ACTIVAR BUFOS</button></div>
            <div class="section-container"><div class="section-title-premium" style="color: #4ed9f0;">💚 AUTOCURA</div><button id="btn-action-heal" class="btn-premium btn-p-green">ACTIVAR CURA</button></div>
            <div class="section-container">
                <div class="section-title-premium" style="color: #f0c94e;">⏳ TIEMPO DE BUFO</div>
                <div id="timer-display" style="text-align:center; padding:5px; background:#1a241b; border:1px solid #333; color:#eee; border-radius:3px; font-weight:bold; font-size: 14px;">0:00</div>
            </div>
        </div>
    `;
    document.body.appendChild(container);

    const body = container.querySelector('#fs-body');
    container.querySelector('#btn-action-burst').onclick = function() { this.classList.contains('btn-p-green') ? startBurst(this) : stopBurst(this); };
    container.querySelector('#btn-action-heal').onclick = function() { this.classList.contains('btn-p-green') ? startHeal(this) : stopHeal(this); };
    container.querySelector('#fs-minimize').onclick = toggleMinimize;
    container.querySelector('#fs-lock').onclick = toggleLock;
    container.querySelector('#fs-close').onclick = () => { worker.terminate(); container.remove(); };

    let drag = false, offset = [0, 0];
    container.querySelector('#fs-header').onmousedown = (e) => { 
        if (!e.target.classList.contains('header-btn') && !isLocked) { 
            drag = true; offset = [container.offsetLeft - e.clientX, container.offsetTop - e.clientY]; 
        } 
    };
    document.addEventListener('mousemove', (e) => { if (drag) { container.style.left = (e.clientX + offset[0]) + 'px'; container.style.top = (e.clientY + offset[1]) + 'px'; } });
    document.addEventListener('mouseup', () => drag = false);
})();
