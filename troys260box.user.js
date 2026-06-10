// ==UserScript==
// @name         TROYS260 V1.4.0
// @namespace    https://github.com/TROYS260/TROYS260-BOX
// @version      1.4.0
// @description  Lógica 1.1.3 + Temporizador 5:22 + Alertas
// @author       TROYS260
// @match        https://universe.flyff.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    let worker = null;
    let timerInterval = null;

    const bufoSequence = [
        { key: 'F1', delay: 1500 }, { key: 'F1', delay: 1500 }, { key: 'F2', delay: 1500 },
        { key: 'F3', delay: 3000 }, { key: 'F4', delay: 4000 }, { key: 'F5', delay: 1500 },
        { key: 'F6', delay: 1500 }, { key: 'F7', delay: 4000 }, { key: 'F8', delay: 4000 },
        { key: 'F9', delay: 1500 }, { key: 'F12', delay: 1600 }, { key: '1', delay: 1400 },
        { key: '2', delay: 1400 }, { key: '3', delay: 1400 }
    ];

    const workerCode = `
        let burstTimers = [];
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
        };
    `;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    worker = new Worker(URL.createObjectURL(blob));

    const pressKey = (keyCommand) => {
        const gameCanvas = document.querySelector('canvas');
        if (!gameCanvas) return;
        let code = keyCommand.startsWith('F') ? keyCommand : "Digit" + keyCommand;
        const eventConfig = { key: keyCommand, code: code, bubbles: true, cancelable: true, keyCode: keyCommand.charCodeAt(0), view: window };
        gameCanvas.dispatchEvent(new KeyboardEvent('keydown', eventConfig));
        setTimeout(() => { gameCanvas.dispatchEvent(new KeyboardEvent('keyup', eventConfig)); }, 20);
    };

    const startTimer = (duration) => {
        if (timerInterval) clearInterval(timerInterval);
        let timer = duration;
        const display = document.getElementById('timer-display');
        timerInterval = setInterval(() => {
            let m = Math.floor(timer / 60);
            let s = timer % 60;
            display.innerText = `${m}:${s.toString().padStart(2, '0')}`;
            if (timer <= 30 && timer > 0) {
                display.style.color = (timer % 2 === 0) ? '#ff4d4d' : 'white';
                if ([30, 20, 10, 5, 4, 3, 2, 1].includes(timer)) {
                    const ctx = new (window.AudioContext || window.webkitAudioContext)();
                    const osc = ctx.createOscillator();
                    osc.connect(ctx.destination);
                    osc.start(); osc.stop(ctx.currentTime + 0.1);
                }
            } else { display.style.color = 'white'; }
            if (--timer < 0) { clearInterval(timerInterval); display.innerText = "0:00"; }
        }, 1000);
    };

    worker.onmessage = function(e) {
        if (e.data.action === 'pressKey') { 
            pressKey(e.data.key); 
            if (e.data.key === '2') startTimer(322);
        } else if (e.data.action === 'finishBurst') { const b = document.getElementById('btn-action-burst'); if(b) stopBurst(b); }
    };

    const stopBurst = (btn) => { worker.postMessage({ action: 'stopBurst' }); btn.innerText = "ACTIVAR BUFOS"; btn.style.background = "#2bb649"; };
    const startBurst = (btn) => { btn.innerText = "PARAR"; btn.style.background = "#dc3545"; worker.postMessage({ action: 'startBurst', sequence: bufoSequence }); };

    const container = document.createElement('div');
    Object.assign(container.style, { position: 'fixed', top: '40px', right: '40px', width: '235px', backgroundColor: '#0c100d', color: '#eee', borderRadius: '10px', border: '1px solid #28a745', zIndex: '99999', fontFamily: 'Segoe UI', fontSize: '11px' });
    container.innerHTML = `
        <div id="fs-header" style="padding: 10px; background: #0f1410; border-radius: 9px 9px 0 0; border-bottom: 1px solid #28a745; cursor: move; display: flex; justify-content: space-between;">
            <span style="font-weight:bold; color: #4ef06d; letter-spacing: 1px;">TROYS260</span>
        </div>
        <div style="padding: 10px;">
            <button id="btn-action-burst" style="width:100%; padding:6px; cursor:pointer; background:#2bb649; color:white; border:none; border-radius:3px; font-weight:bold;">ACTIVAR BUFOS</button>
            <div id="timer-display" style="margin-top:8px; text-align:center; padding:5px; background:#1a241b; border:1px solid #333; color:white; border-radius:3px; font-weight:bold; transition: 0.3s;">0:00</div>
        </div>
    `;
    document.body.appendChild(container);

    container.querySelector('#btn-action-burst').onclick = function() { this.innerText === "ACTIVAR BUFOS" ? startBurst(this) : stopBurst(this); };
})();
