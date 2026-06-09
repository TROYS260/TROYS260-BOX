// ==UserScript==
// @name         TROYS260 BOX
// @namespace    https://github.com/TROYS260/TROYS260-BOX
// @version      1.1.3-Oficial
// @description  Autocura Inteligente y Ráfaga de Bufos compacta y personalizada al 100% para TROYS260.
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

    const HEAL_TARGET_KEY = '5';   
    const HEAL_AOE_KEY = '6';      

    // --- CONFIGURACIÓN DE ATAJOS FÍSICOS ---
    const ATAL_BUFOS_CODE = 'BracketLeft'; // Tecla al lado de la P
    const ATAL_CURA_CODES = ['Quote', 'BracketRight']; // Tecla al lado de la Ñ
    const ATAL_MINIMIZE_CODE = 'F10'; // Tu tecla para minimizar/maximizar

    // Secuencia con los tiempos perfectos asignados
    const bufoSequence = [
        { key: 'F1', delay: 1500 },
        { key: 'F1', delay: 1500 },
        { key: 'F2', delay: 1500 },
        { key: 'F3', delay: 3000 }, // 3 segundos para Stone Skin
        { key: 'F4', delay: 4000 }, // 4 segundos
        { key: 'F5', delay: 1500 },
        { key: 'F6', delay: 1500 },
        { key: 'F7', delay: 4000 }, // 4 segundos
        { key: 'F8', delay: 4000 }, // 4 segundos
        { key: 'F9', delay: 1500 },
        { key: 'F12', delay: 1600 },
        { key: '1', delay: 1400 },
        { key: '2', delay: 1400 },
        { key: '3', delay: 1400 }
    ];

    // --- WEB WORKER OPTIMIZADO ---
    const workerCode = `
        let burstTimers = [];
        let healTimeout = null;
        let isHealActive = false;

        function getHumanizedDelay() {
            return Math.floor(Math.random() * (1400 - 600 + 1)) + 600;
        }

        function getRandomTargetCount() { return Math.floor(Math.random() * (28 - 14 + 1)) + 14; }
        function getRandomAoECount() { return Math.floor(Math.random() * (3 - 1 + 1)) + 1; }

        self.onmessage = function(e) {
            if (e.data.action === 'startBurst') {
                let seq = e.data.sequence;
                let currentIdx = 0;

                function executeNextBufo() {
                    if (currentIdx >= seq.length) {
                        self.postMessage({ action: 'finishBurst' });
                        return;
                    }
                    
                    let item = seq[currentIdx];
                    self.postMessage({ action: 'pressKey', key: item.key });
                    
                    currentIdx++;
                    let t = setTimeout(executeNextBufo, item.delay);
                    burstTimers.push(t);
                }
                executeNextBufo();
            } 
            else if (e.data.action === 'stopBurst') { 
                burstTimers.forEach(t => clearTimeout(t));
                burstTimers = []; 
            }
            
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
            } 
            else if (e.data.action === 'stopHeal') { 
                isHealActive = false;
                if (healTimeout) { clearTimeout(healTimeout); healTimeout = null; } 
            }
        };
    `;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    worker = new Worker(URL.createObjectURL(blob));

    // --- Inyección de Estilos UI ---
    const documentStyle = document.createElement('style');
    documentStyle.innerHTML = `
        .header-btn { cursor: pointer; color: #888; font-size: 14px; transition: color 0.2s; font-weight: bold; }
        .header-btn:hover { color: #fff; }
        .section-container { border: 1px solid #1e3d23; border-radius: 8px; padding: 10px; margin-bottom: 12px; background: rgba(15, 25, 18, 0.6); }
        .section-title-premium { color: #4ef06d; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.8px; display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
        .btn-premium { width: 100%; padding: 8px 0; color: #fff; border: 1px solid #222; border-radius: 6px; font-weight: bold; font-size: 11px; cursor: pointer; text-align: center; }
        .btn-p-green { background: linear-gradient(to bottom, #2bb649, #197a2d); border-color: #218838; }
        .btn-p-green:hover { background: linear-gradient(to bottom, #32cd53, #1f9439); }
        .btn-p-red { background: linear-gradient(to bottom, #dc3545, #a71d2a); border-color: #bd2130; }
        .btn-p-red:hover { background: linear-gradient(to bottom, #e4606d, #bd2130); }
    `;
    document.head.appendChild(documentStyle);

    const restoreFocus = () => { const gameCanvas = document.querySelector('canvas'); if (gameCanvas) { gameCanvas.focus(); } };

    const pressKey = (keyCommand) => {
        const gameCanvas = document.querySelector('canvas');
        if (!gameCanvas) return;
        let cleanKey = keyCommand.trim().toUpperCase(); 
        let code = cleanKey.startsWith('F') ? cleanKey : "Digit" + cleanKey;
        const eventConfig = { key: cleanKey, code: code, bubbles: true, cancelable: true, keyCode: cleanKey.charCodeAt(0), view: window };
        gameCanvas.dispatchEvent(new KeyboardEvent('keydown', eventConfig));
        setTimeout(() => { gameCanvas.dispatchEvent(new KeyboardEvent('keyup', eventConfig)); }, 20);
    };

    worker.onmessage = function(e) {
        if (e.data.action === 'pressKey') { pressKey(e.data.key); } 
        else if (e.data.action === 'finishBurst') { const burstBtn = document.getElementById('btn-action-burst'); if (burstBtn) stopBurst(burstBtn); }
    };

    const stopBurst = (btn) => { worker.postMessage({ action: 'stopBurst' }); btn.innerText = "ACTIVAR BUFOS"; btn.className = "btn-premium btn-p-green"; restoreFocus(); };
    const startBurst = (btn) => { btn.innerText = "PARAR"; btn.className = "btn-premium btn-p-red"; restoreFocus(); worker.postMessage({ action: 'startBurst', sequence: bufoSequence }); };
    
    const stopHeal = (btn) => { worker.postMessage({ action: 'stopHeal' }); isHealRunning = false; btn.innerText = "ACTIVAR CURA"; btn.className = "btn-premium btn-p-green"; restoreFocus(); };
    const startHeal = (btn) => { isHealRunning = true; btn.innerText = "PARAR CURA"; btn.className = "btn-premium btn-p-red"; restoreFocus(); worker.postMessage({ action: 'startHeal', targetKey: HEAL_TARGET_KEY, aoeKey: HEAL_AOE_KEY }); };

    const toggleMinimize = () => {
        if (!isMinimized) { body.style.display = 'none'; container.style.width = '160px'; container.querySelector('#fs-minimize').innerText = '+'; isMinimized = true; } 
        else { body.style.display = 'flex'; container.style.width = '235px'; container.querySelector('#fs-minimize').innerText = '−'; isMinimized = false; }
        restoreFocus();
    };

    const detectMovementAndStop = (e) => {
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;
        let shouldStop = false;
        if (e.type === 'keydown' && ['W', 'A', 'S', 'D'].includes(e.key.toUpperCase())) shouldStop = true;
        if (e.type === 'mousedown' && e.target.tagName.toLowerCase() === 'canvas') shouldStop = true;
        if (shouldStop && isHealRunning) { const healBtn = document.getElementById('btn-action-heal'); if (healBtn) stopHeal(healBtn); }
    };

    const detectHotkeys = (e) => {
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;
        if (e.type === 'keydown') {
            if (e.code === ATAL_BUFOS_CODE) { e.preventDefault(); const burstBtn = document.getElementById('btn-action-burst'); if (burstBtn) burstBtn.classList.contains('btn-p-green') ? startBurst(burstBtn) : stopBurst(burstBtn); }
            else if (ATAL_CURA_CODES.includes(e.code)) { e.preventDefault(); const healBtn = document.getElementById('btn-action-heal'); if (healBtn) healBtn.classList.contains('btn-p-green') ? startHeal(healBtn) : stopHeal(healBtn); }
            else if (e.code === ATAL_MINIMIZE_CODE) { e.preventDefault(); toggleMinimize(); }
        }
    };

    window.addEventListener('keydown', detectMovementAndStop, true);
    window.addEventListener('mousedown', detectMovementAndStop, true);
    window.addEventListener('keydown', detectHotkeys, true);

    const container = document.createElement('div');
    Object.assign(container.style, { position: 'fixed', top: '40px', right: '40px', width: '235px', backgroundColor: '#0c100d', color: '#eee', borderRadius: '10px', border: '1px solid #28a745', zIndex: '10000', fontFamily: 'Segoe UI, Arial, sans-serif', fontSize: '11px', userSelect: 'none' });
    container.innerHTML = `
        <div id="fs-header" style="padding: 10px; background: linear-gradient(to bottom, #1a241b, #0f1410); cursor: move; border-radius: 9px 9px 0 0; display: flex; justify-content: center; align-items: center; border-bottom: 1px solid #1e3d23; font-weight: bold; color: #4ef06d; position: relative;">
            <span>TROYS260 BOX - V1.1.3</span>
            <div style="position: absolute; right: 10px; display: flex; gap: 8px;">
                <span id="fs-minimize" class="header-btn">−</span>
                <span id="fs-close" class="header-btn">✕</span>
            </div>
        </div>
        <div id="fs-body" style="padding: 12px; display: flex; flex-direction: column; background: #0c100d;">
            <div class="section-container"><div class="section-title-premium">🕊️ RÁFAGA DE BUFOS</div><button id="btn-action-burst" class="btn-premium btn-p-green">ACTIVAR BUFOS</button></div>
            <div class="section-container" style="border-color: #1e373d; background: rgba(15, 23, 25, 0.6);"><div class="section-title-premium" style="color: #4ed9f0;">💚 AUTOCURA INTELIGENTE</div><button id="btn-action-heal" class="btn-premium btn-p-green">ACTIVAR CURA</button></div>
        </div>
    `;
    document.body.appendChild(container);

    const body = container.querySelector('#fs-body');
    container.querySelector('#btn-action-burst').onclick = function() { this.classList.contains('btn-p-green') ? startBurst(this) : stopBurst(this); };
    container.querySelector('#btn-action-heal').onclick = function() { this.classList.contains('btn-p-green') ? startHeal(this) : stopHeal(this); };
    
    container.querySelector('#fs-minimize').onclick = () => { toggleMinimize(); };

    container.querySelector('#fs-close').onclick = () => {
        worker.postMessage({ action: 'stopBurst' }); worker.postMessage({ action: 'stopHeal' }); worker.terminate();
        window.removeEventListener('keydown', detectMovementAndStop, true); window.removeEventListener('keydown', detectHotkeys, true); container.remove();
    };

    let drag = false, offset = [0, 0];
    container.querySelector('#fs-header').onmousedown = (e) => { if (!e.target.classList.contains('header-btn')) { drag = true; offset = [container.offsetLeft - e.clientX, container.offsetTop - e.clientY]; } };
    document.addEventListener('mousemove', (e) => { if (drag) { container.style.left = (e.clientX + offset[0]) + 'px'; container.style.top = (e.clientY + offset[1]) + 'px'; container.style.right = 'auto'; } });
    document.addEventListener('mouseup', () => drag = false);
})();
