// ==UserScript==
// @name         TROYS260 BOX V1.2.9
// @namespace    https://github.com/TROYS260/TROYS260-BOX
// @version      1.2.9
// @description  Autocura, Bufos y Temporizador - Candado, Minimizar y X en línea
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
    let timeLeft = 0;
    let timerInterval = null;

    const HEAL_TARGET_KEY = '5';   
    const HEAL_AOE_KEY = '6';      
    const ATAL_BUFOS_CODE = 'BracketLeft'; 
    const ATAL_CURA_CODES = ['Quote', 'BracketRight'];
    const ATAL_MINIMIZE_CODE = 'F10'; 
    const BUFO_LIMIT = 322;

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
                    let item = seq[currentIdx]; self.postMessage({ action: 'pressKey', key: item.key });
                    currentIdx++; burstTimers.push(setTimeout(executeNextBufo, item.delay));
                }
                executeNextBufo();
            } else if (e.data.action === 'stopBurst') { burstTimers.forEach(t => clearTimeout(t)); burstTimers = []; }
            else if (e.data.action === 'startHeal') {
                isHealActive = true;
                function loopHeal() {
                    if (!isHealActive) return;
                    self.postMessage({ action: 'pressKey', key: '5' }); 
                    healTimeout = setTimeout(loopHeal, getHumanizedDelay());
                }
                loopHeal();
            } else if (e.data.action === 'stopHeal') { isHealActive = false; if (healTimeout) clearTimeout(healTimeout); }
        };
    `;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    worker = new Worker(URL.createObjectURL(blob));

    const container = document.createElement('div');
    Object.assign(container.style, { position: 'fixed', top: '40px', right: '40px', width: '235px', backgroundColor: '#0c100d', color: '#eee', borderRadius: '10px', border: '1px solid #28a745', zIndex: '10000', fontFamily: 'Segoe UI', fontSize: '11px', userSelect: 'none' });
    
    container.innerHTML = `
        <div id="fs-header" style="padding: 10px; background: #0f1410; border-radius: 9px 9px 0 0; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e3d23; color: #4ef06d; cursor: move;">
            <span style="font-weight:bold;">TROYS260 V1.2.9</span>
            <div id="fs-controls" style="cursor: pointer; display: flex; gap: 10px; align-items: center; font-size: 14px; color: #4ef06d;">
                <span id="fs-lock" title="Bloquear posición">🔓</span>
                <span id="fs-minimize" title="Minimizar">➖</span>
                <span id="fs-close" title="Cerrar">❌</span>
            </div>
        </div>
        <div id="fs-body" style="padding: 12px;">
            <div style="margin-bottom: 10px;"><div style="color:#4ef06d; font-weight:bold; margin-bottom:5px;">🕊️ RÁFAGA DE BUFOS</div><button id="btn-burst" style="width:100%; padding:8px; cursor:pointer; background:#2bb649; border:none; color:white; border-radius:4px; font-weight:bold;">ACTIVAR BUFOS</button></div>
            <div style="margin-bottom: 10px;"><div style="color:#4ed9f0; font-weight:bold; margin-bottom:5px;">💚 AUTOCURA INTELIGENTE</div><button id="btn-heal" style="width:100%; padding:8px; cursor:pointer; background:#2bb649; border:none; color:white; border-radius:4px; font-weight:bold;">ACTIVAR CURA</button></div>
            <div><div style="color:#f0c94e; font-weight:bold; margin-bottom:5px;">⏱️ TIEMPO DE BUFOS</div><div id="btn-time-display" style="width:100%; padding:8px; text-align:center; background:#1a241b; border:1px solid #333; color:white; border-radius:4px; font-weight:bold;">0:00</div></div>
        </div>
    `;
    document.body.appendChild(container);

    const header = document.getElementById('fs-header');
    header.onmousedown = (e) => {
        if (isLocked || ['fs-lock', 'fs-minimize', 'fs-close'].includes(e.target.id)) return;
        let drag = true; 
        let offset = [container.offsetLeft - e.clientX, container.offsetTop - e.clientY];
        const move = (e) => { container.style.left = (e.clientX + offset[0]) + 'px'; container.style.top = (e.clientY + offset[1]) + 'px'; container.style.right = 'auto'; };
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', () => { document.removeEventListener('mousemove', move); });
    };

    document.getElementById('fs-lock').onclick = function() { isLocked = !isLocked; this.innerText = isLocked ? '🔒' : '🔓'; };
    document.getElementById('fs-minimize').onclick = function() { 
        isMinimized = !isMinimized; 
        document.getElementById('fs-body').style.display = isMinimized ? 'none' : 'block'; 
        this.innerText = isMinimized ? '➕' : '➖';
    };
    document.getElementById('fs-close').onclick = () => container.remove();

    const pressKey = (key) => {
        const canvas = document.querySelector('canvas');
        if (!canvas) return;
        let code = key.startsWith('F') ? key : "Digit" + key;
        canvas.dispatchEvent(new KeyboardEvent('keydown', { key: key, code: code, bubbles: true }));
        setTimeout(() => canvas.dispatchEvent(new KeyboardEvent('keyup', { key: key, code: code, bubbles: true })), 20);
    };

    worker.onmessage = (e) => { if (e.data.action === 'pressKey') pressKey(e.data.key); };

    window.addEventListener('keydown', (e) => {
        if (e.key === '2') {
            if (timerInterval) clearInterval(timerInterval);
            timeLeft = BUFO_LIMIT;
            timerInterval = setInterval(() => {
                timeLeft--;
                const min = Math.floor(timeLeft / 60);
                const sec = timeLeft % 60;
                document.getElementById('btn-time-display').innerText = \`\${min}:\${sec.toString().padStart(2, '0')}\`;
                if (timeLeft <= 0) clearInterval(timerInterval);
            }, 1000);
        }
    });
})();
