// ==UserScript==
// @name         TROYS260 BOX V1.2.2
// @namespace    https://github.com/TROYS260/TROYS260-BOX
// @version      1.2.2
// @description  Cura, Bufos, Temporizador y bloqueo de posición (candado)
// @author       TROYS260
// @match        https://universe.flyff.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    let isLocked = false;
    let isMinimized = false;
    let worker = null;
    let isHealRunning = false;
    let timeLeft = 0;
    let timerInterval = null;

    const BUFO_LIMIT = 322;
    const ATAL_BUFOS_CODE = 'BracketLeft';
    const ATAL_CURA_CODES = ['Quote', 'BracketRight'];
    const ATAL_MINIMIZE_CODE = 'F10';

    // --- LÓGICA DE SONIDO ---
    function playAlertSound() {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const beep = (time) => {
            const osc = audioCtx.createOscillator();
            osc.type = 'sine'; osc.frequency.setValueAtTime(600, audioCtx.currentTime + time);
            osc.connect(audioCtx.destination); osc.start(audioCtx.currentTime + time);
            osc.stop(audioCtx.currentTime + time + 0.2);
        };
        beep(0); beep(0.4); beep(0.8);
    }

    // --- LÓGICA DE TEMPORIZADOR ---
    function updateUI() {
        const btn = document.getElementById('btn-time-display');
        if (btn) {
            const min = Math.floor(timeLeft / 60);
            const sec = timeLeft % 60;
            btn.innerText = `${min}:${sec.toString().padStart(2, '0')}`;
        }
    }

    // --- UI Y CREACIÓN DEL MENÚ ---
    const container = document.createElement('div');
    Object.assign(container.style, { position: 'fixed', top: '40px', right: '40px', width: '235px', backgroundColor: '#0c100d', color: '#eee', borderRadius: '10px', border: '1px solid #28a745', zIndex: '10000', fontFamily: 'Segoe UI' });
    container.innerHTML = `
        <div id="fs-header" style="padding: 10px; background: #0f1410; border-radius: 9px 9px 0 0; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #28a745; font-weight: bold; color: #4ef06d; cursor: move;">
            <span>TROYS260 BOX V1.2.2</span>
            <div>
                <span id="fs-lock" style="cursor:pointer; margin-right:8px;">🔓</span>
                <span id="fs-minimize" style="cursor:pointer; margin-right:8px;">−</span>
                <span id="fs-close" style="cursor:pointer;">✕</span>
            </div>
        </div>
        <div id="fs-body" style="padding: 12px;">
            <div class="section-container" style="border: 1px solid #1e3d23; padding: 10px; margin-bottom: 10px; background: rgba(15, 25, 18, 0.6);">
                <div style="color: #4ef06d; font-size: 11px; font-weight: bold; margin-bottom: 5px;">🕊️ RÁFAGA DE BUFOS</div>
                <button id="btn-action-burst" style="width:100%; padding: 8px; cursor:pointer; background:#2bb649; color:white; border:none; border-radius:5px; font-weight:bold;">ACTIVAR BUFOS</button>
            </div>
            <div class="section-container" style="border: 1px solid #1e3d23; padding: 10px; margin-bottom: 10px; background: rgba(15, 25, 18, 0.6);">
                <div style="color: #4ed9f0; font-size: 11px; font-weight: bold; margin-bottom: 5px;">💚 AUTOCURA INTELIGENTE</div>
                <button id="btn-action-heal" style="width:100%; padding: 8px; cursor:pointer; background:#2bb649; color:white; border:none; border-radius:5px; font-weight:bold;">ACTIVAR CURA</button>
            </div>
            <div class="section-container" style="border: 1px solid #1e3d23; padding: 10px; background: rgba(15, 25, 18, 0.6);">
                <div style="color: #f0c94e; font-size: 11px; font-weight: bold; margin-bottom: 5px;">⏱️ TIEMPO DE BUFOS</div>
                <div id="btn-time-display" style="width:100%; padding: 8px; text-align:center; background:#1a241b; border: 1px solid #333; color:white; border-radius:5px; font-weight:bold;">0:00</div>
            </div>
        </div>
    `;
    document.body.appendChild(container);

    // --- LÓGICA DE MOVIMIENTO CON CANDADO ---
    let drag = false, offset = [0, 0];
    const header = container.querySelector('#fs-header');
    header.onmousedown = (e) => {
        if (isLocked || e.target.tagName === 'SPAN') return;
        drag = true; offset = [container.offsetLeft - e.clientX, container.offsetTop - e.clientY];
    };
    document.addEventListener('mousemove', (e) => { if (drag) { container.style.left = (e.clientX + offset[0]) + 'px'; container.style.top = (e.clientY + offset[1]) + 'px'; container.style.right = 'auto'; } });
    document.addEventListener('mouseup', () => drag = false);

    // --- CONTROLES (Candado, Minimizar, Cerrar) ---
    container.querySelector('#fs-lock').onclick = function() {
        isLocked = !isLocked;
        this.innerText = isLocked ? '🔒' : '🔓';
        header.style.cursor = isLocked ? 'default' : 'move';
    };
    
    container.querySelector('#fs-minimize').onclick = () => {
        isMinimized = !isMinimized;
        container.querySelector('#fs-body').style.display = isMinimized ? 'none' : 'block';
        container.querySelector('#fs-minimize').innerText = isMinimized ? '+' : '−';
    };

    container.querySelector('#fs-close').onclick = () => container.remove();

    // Listener para iniciar tiempo con tecla '2'
    window.addEventListener('keydown', (e) => {
        if (e.key === '2') {
            if (timerInterval) clearInterval(timerInterval);
            timeLeft = BUFO_LIMIT;
            updateUI();
            timerInterval = setInterval(() => {
                timeLeft--; updateUI();
                if (timeLeft <= 30 && timeLeft > 0 && timeLeft % 2 === 0) playAlertSound(); // Alerta simple
                if (timeLeft <= 0) clearInterval(timerInterval);
            }, 1000);
        }
    });
})();
