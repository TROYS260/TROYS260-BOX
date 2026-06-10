// ==UserScript==
// @name         TROYS260 BOX V1.2.0
// @namespace    https://github.com/TROYS260/TROYS260-BOX
// @version      1.2.0
// @description  Autocura Inteligente, Ráfaga de Bufos y Temporizador de Bufos (5:22)
// @author       TROYS260
// @match        https://universe.flyff.com/*
// @grant        none
// @icon         https://universe.flyff.com/storage/img/favicon.png
// ==/UserScript==

(function () {
    'use strict';

    let isMinimized = false;
    let worker = null;
    let isHealRunning = false;
    let timeLeft = 0;
    let timerInterval = null;

    const HEAL_TARGET_KEY = '5';   
    const HEAL_AOE_KEY = '6';      
    const BUFO_LIMIT = 322; // 5m 22s

    // --- CONFIGURACIÓN DE ATAJOS FÍSICOS ---
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

    // --- LÓGICA DE SONIDO ---
    function playAlertSound() {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const beep = (time) => {
            const osc = audioCtx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, audioCtx.currentTime + time);
            osc.connect(audioCtx.destination);
            osc.start(audioCtx.currentTime + time);
            osc.stop(audioCtx.currentTime + time + 0.2);
        };
        beep(0); beep(0.4); beep(0.8);
    }

    // --- LÓGICA DEL TEMPORIZADOR ---
    function startTimer() {
        if (timerInterval) clearInterval(timerInterval);
        timeLeft = BUFO_LIMIT;
        updateUI();
        timerInterval = setInterval(() => {
            timeLeft--;
            updateUI();
            if (timeLeft <= 30 && timeLeft > 0) {
                const btn = document.getElementById('btn-time-bufos');
                if (btn) btn.style.background = (timeLeft % 2 === 0) ? '#8b0000' : '#1a241b';
                if (timeLeft === 30) playAlertSound();
            }
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                const btn = document.getElementById('btn-time-bufos');
                if (btn) btn.style.background = '#1a241b';
            }
        }, 1000);
    }

    function updateUI() {
        const btn = document.getElementById('btn-time-bufos');
        if (btn) {
            const min = Math.floor(timeLeft / 60);
            const sec = timeLeft % 60;
            btn.innerText = `TIEMPO DE BUFOS: ${min}:${sec.toString().padStart(2, '0')}`;
        }
    }

    // --- WEB WORKER (MANTIENE LA PC LIGERA) ---
    const workerCode = `
        let burstTimers = [];
        let healTimeout = null;
        let isHealActive = false;
        function getHumanizedDelay() { return Math.floor(Math.random() * (1400 - 600 + 1)) + 600; }
        function getRandomTargetCount() { return Math.floor(Math.random() * (28 - 14 + 1)) + 14; }
        function getRandomAoECount() { return Math.floor(Math.random() * (3 - 1 + 1)) + 1; }
        self.onmessage = function(e) {
            if (e.data.action === 'startBurst') {
                let seq = e.data.sequence;
                let currentIdx = 0;
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
                setTimeout(() => {
                    let targetCount = getRandomTargetCount(); let aoeCount = 0; let currentMode = 'target';
                    function loopHeal() {
                        if (!isHealActive) return;
                        if (currentMode === 'target') {
                            if (targetCount > 0) { self.postMessage({ action: 'pressKey', key: e.data.targetKey }); targetCount--; } 
                            else { aoeCount = getRandomAoECount(); currentMode = 'aoe'; }
                        } else {
                            if (aoeCount > 0) { self.postMessage({ action: 'pressKey', key: e.data.aoeKey }); aoeCount--; } 
                            else { targetCount = getRandomTargetCount(); currentMode = 'target'; }
                        }
                        healTimeout = setTimeout(loopHeal, getHumanizedDelay());
                    }
                    loopHeal();
                }, 0);
            } else if (e.data.action === 'stopHeal') { isHealActive = false; if (healTimeout) { clearTimeout(healTimeout); healTimeout = null; } }
        };
    `;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    worker = new Worker(URL.createObjectURL(blob));

    // --- ESTILOS E INTERFAZ ---
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

    const restoreFocus = () => { const canvas = document.querySelector('canvas'); if (canvas) canvas.focus(); };
    const pressKey = (keyCommand) => {
        const canvas = document.querySelector('canvas');
        if (!canvas) return;
        let cleanKey = keyCommand.trim().toUpperCase(); 
        let code = cleanKey.startsWith('F') ? cleanKey : "Digit" + cleanKey;
        const config = { key: cleanKey, code: code, bubbles: true, cancelable: true, keyCode: cleanKey.charCodeAt(0), view: window };
        canvas.dispatchEvent(new KeyboardEvent('keydown', config));
        setTimeout(() => canvas.dispatchEvent(new KeyboardEvent('keyup', config)), 20);
    };

    worker.onmessage = function(e) {
        if (e.data.action === 'pressKey') pressKey(e.data.key);
        else if (e.data.action === 'finishBurst') { const btn = document.getElementById('btn-action-burst'); if (btn) stopBurst(btn); }
    };

    const stopBurst = (btn) => { worker.postMessage({ action: 'stopBurst' }); btn.innerText = "ACTIVAR BUFOS"; btn.className = "btn-premium btn-p-green"; restoreFocus(); };
    const startBurst = (btn) => { btn.innerText = "PARAR"; btn.className = "btn-premium btn-p-red"; restoreFocus(); worker.postMessage({ action: 'startBurst', sequence: bufoSequence }); };
    const stopHeal = (btn) => { worker.postMessage({ action: 'stopHeal' }); isHealRunning = false; btn.innerText = "ACTIVAR CURA"; btn.className = "btn-premium btn-p-green"; restoreFocus(); };
    const startHeal = (btn) => { isHealRunning = true; btn.innerText = "PARAR CURA"; btn.className = "btn-premium btn-p-red"; restoreFocus(); worker.postMessage({ action: 'startHeal', targetKey: HEAL_TARGET_KEY, aoeKey: HEAL_AOE_KEY }); };

    // --- EVENTOS Y UI ---
    window.addEventListener('keydown', (e) => {
        if (e.key === '2') startTimer();
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
        if (e.type === 'keydown' && ATAL_CURA_CODES.includes(e.code)) { e.preventDefault(); const btn = document.getElementById('btn-action-heal'); if (btn) btn.classList.contains('btn-p-green') ? startHeal(btn) : stopHeal(btn); }
        if (e.code === ATAL_BUFOS_CODE) { e.preventDefault(); const btn = document.getElementById('btn-action-burst'); if (btn) btn.classList.contains('btn-p-green') ? startBurst(btn) : stopBurst(btn); }
    }, true);

    const container = document.createElement('div');
    Object.assign(container.style, { position: 'fixed', top: '40px', right: '40px', width: '235px', backgroundColor: '#0c100d', color: '#eee', borderRadius: '10px', border: '1px solid #28a745', zIndex: '10000', fontFamily: 'Segoe UI, Arial' });
    container.innerHTML = `
        <div id="fs-header" style="padding: 10px; background: #0f1410; border-radius: 9px 9px 0 0; text-align: center; font-weight: bold; color: #4ef06d;">TROYS260 BOX V1.2.0</div>
        <div style="padding: 12px;">
            <div class="section-container"><div class="section-title-premium">🕊️ RÁFAGA DE BUFOS</div><button id="btn-action-burst" class="btn-premium btn-p-green">ACTIVAR BUFOS</button></div>
            <div class="section-container"><div class="section-title-premium" style="color: #4ed9f0;">💚 AUTOCURA INTELIGENTE</div><button id="btn-action-heal" class="btn-premium btn-p-green">ACTIVAR CURA</button></div>
            <div class="section-container"><div class="section-title-premium" style="color: #f0c94e;">⏱️ TIEMPO DE BUFOS</div><div id="btn-time-bufos" class="btn-premium" style="background:#1a241b; border: 1px solid #333;">TIEMPO DE BUFOS: 0:00</div></div>
        </div>
    `;
    document.body.appendChild(container);

    container.querySelector('#btn-action-burst').onclick = function() { this.classList.contains('btn-p-green') ? startBurst(this) : stopBurst(this); };
    container.querySelector('#btn-action-heal').onclick = function() { this.classList.contains('btn-p-green') ? startHeal(this) : stopHeal(this); };
})();
