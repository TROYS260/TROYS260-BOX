// ==UserScript==
// @name         TROYS260 ELITE BOX
// @namespace    https://github.com/TROYS260/TROYS260-BOX
// @version      1.1.3
// @description  Lógica original 1.1.3 con diseño optimizado.
// @author       TROYS260
// @match        https://universe.flyff.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    let isMinimized = false;
    let isLocked = false;
    let worker = null;
    let isHealRunning = false;

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
        function getRandomTargetCount() { return Math.floor(Math.random() * (28 - 14 + 1)) + 14; }
        function getRandomAoECount() { return Math.floor(Math.random() * (3 - 1 + 1)) + 1; }
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
        else if (e.data.action === 'finishBurst') { const b = document.getElementById('btn-action-burst'); if(b) stopBurst(b); }
    };

    const restoreFocus = () => { const c = document.querySelector('canvas'); if (c) c.focus(); };
    const stopBurst = (btn) => { worker.postMessage({ action: 'stopBurst' }); btn.innerText = "ACTIVAR BUFOS"; btn.style.background = "#2bb649"; restoreFocus(); };
    const startBurst = (btn) => { btn.innerText = "PARAR"; btn.style.background = "#dc3545"; restoreFocus(); worker.postMessage({ action: 'startBurst', sequence: bufoSequence }); };
    const stopHeal = (btn) => { worker.postMessage({ action: 'stopHeal' }); isHealRunning = false; btn.innerText = "ACTIVAR CURA"; btn.style.background = "#2bb649"; restoreFocus(); };
    const startHeal = (btn) => { isHealRunning = true; btn.innerText = "PARAR CURA"; btn.style.background = "#dc3545"; restoreFocus(); worker.postMessage({ action: 'startHeal', targetKey: HEAL_TARGET_KEY, aoeKey: HEAL_AOE_KEY }); };

    const detectMovementAndStop = (e) => {
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;
        if (['W', 'A', 'S', 'D'].includes(e.key?.toUpperCase()) || (e.type === 'mousedown' && e.target.tagName === 'CANVAS')) {
            if (isHealRunning) { const h = document.getElementById('btn-action-heal'); if (h) stopHeal(h); }
        }
    };

    const detectHotkeys = (e) => {
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;
        if (e.code === ATAL_BUFOS_CODE) { e.preventDefault(); const b = document.getElementById('btn-action-burst'); if(b) b.innerText === "ACTIVAR BUFOS" ? startBurst(b) : stopBurst(b); }
        else if (ATAL_CURA_CODES.includes(e.code)) { e.preventDefault(); const h = document.getElementById('btn-action-heal'); if(h) h.innerText === "ACTIVAR CURA" ? startHeal(h) : stopHeal(h); }
        else if (e.code === ATAL_MINIMIZE_CODE) { e.preventDefault(); const b = document.getElementById('fs-body'); b.style.display = b.style.display === 'none' ? 'block' : 'none'; }
    };

    window.addEventListener('keydown', detectMovementAndStop, true);
    window.addEventListener('mousedown', detectMovementAndStop, true);
    window.addEventListener('keydown', detectHotkeys, true);

    const container = document.createElement('div');
    Object.assign(container.style, { position: 'fixed', top: '40px', right: '40px', width: '235px', backgroundColor: '#0c100d', color: '#eee', borderRadius: '10px', border: '1px solid #28a745', zIndex: '99999', fontFamily: 'Segoe UI', fontSize: '11px', userSelect: 'none' });
    container.innerHTML = `
        <div id="fs-header" style="padding: 10px; background: #0f1410; border-radius: 9px 9px 0 0; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #28a745; cursor: move;">
            <span style="font-weight:bold; color: #4ef06d;">TROYS260 ELITE BOX</span>
            <div style="cursor:pointer; display:flex; gap:10px; font-size:14px; color:#4ef06d;">
                <span id="fs-lock" title="Bloquear">🔓</span>
                <span id="fs-minimize" title="Minimizar">➖</span>
                <span id="fs-close" title="Cerrar">✕</span>
            </div>
        </div>
        <div id="fs-body" style="padding: 10px;">
            <div style="margin-bottom:8px;"><button id="btn-action-burst" style="width:100%; padding:6px; cursor:pointer; background:#2bb649; color:white; border:none; border-radius:3px; font-weight:bold;">ACTIVAR BUFOS</button></div>
            <div style="margin-bottom:8px;"><button id="btn-action-heal" style="width:100%; padding:6px; cursor:pointer; background:#2bb649; color:white; border:none; border-radius:3px; font-weight:bold;">ACTIVAR CURA</button></div>
            <div style="text-align:center; padding:5px; background:#1a241b; border:1px solid #333; color:white; border-radius:3px; font-weight:bold;">0:00</div>
        </div>
    `;
    document.body.appendChild(container);

    container.querySelector('#fs-header').onmousedown = (e) => {
        if(isLocked || e.target.id === 'fs-lock' || e.target.id === 'fs-minimize' || e.target.id === 'fs-close') return;
        let offset = [container.offsetLeft - e.clientX, container.offsetTop - e.clientY];
        const move = (e) => { container.style.left = (e.clientX + offset[0]) + 'px'; container.style.top = (e.clientY + offset[1]) + 'px'; container.style.right = 'auto'; };
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', () => document.removeEventListener('mousemove', move));
    };

    container.querySelector('#fs-lock').onclick = function() { isLocked = !isLocked; this.innerText = isLocked ? '🔒' : '🔓'; };
    container.querySelector('#fs-minimize').onclick = function() { 
        const b = document.getElementById('fs-body'); 
        b.style.display = b.style.display === 'none' ? 'block' : 'none'; 
        this.innerText = b.style.display === 'none' ? '➕' : '➖';
    };
    container.querySelector('#fs-close').onclick = () => container.remove();

    container.querySelector('#btn-action-burst').onclick = function() { this.innerText === "ACTIVAR BUFOS" ? startBurst(this) : stopBurst(this); };
    container.querySelector('#btn-action-heal').onclick = function() { this.innerText === "ACTIVAR CURA" ? startHeal(this) : stopHeal(this); };
})();
                                                    
