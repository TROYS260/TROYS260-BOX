// ==UserScript==
// @name         TROYS260 BOX V1.2.0
// @namespace    https://github.com/TROYS260/TROYS260-BOX
// @version      1.2.0
// @description  Cura, Bufos y Temporizador de Bufos (5:22) con alerta sonora
// @author       TROYS260
// @match        https://universe.flyff.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // --- CONFIGURACIÓN ---
    const BUFO_LIMIT = 322; // 5 minutos y 22 segundos en segundos
    let timeLeft = 0;
    let timerInterval = null;

    // --- FUNCIÓN DE SONIDO (BEEP REPETITIVO) ---
    function playAlertSound() {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Función para emitir un pitido individual
        const beep = (time) => {
            const osc = audioCtx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, audioCtx.currentTime + time);
            osc.connect(audioCtx.destination);
            osc.start(audioCtx.currentTime + time);
            osc.stop(audioCtx.currentTime + time + 0.2);
        };

        // Hacemos 3 pitidos seguidos
        beep(0);   // Primer pitido
        beep(0.4); // Segundo pitido
        beep(0.8); // Tercer pitido
    }

    // --- LÓGICA DEL TEMPORIZADOR ---
    function startTimer() {
        if (timerInterval) clearInterval(timerInterval);
        timeLeft = BUFO_LIMIT;
        updateUI();
        timerInterval = setInterval(() => {
            timeLeft--;
            updateUI();
            
            // Lógica de alerta a los 30 segundos
            if (timeLeft <= 30 && timeLeft > 0) {
                const btn = document.getElementById('btn-time-bufos');
                if (btn) btn.style.background = (timeLeft % 2 === 0) ? '#8b0000' : '#1a241b';
                if (timeLeft === 30) playAlertSound();
            }
            
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                const btn = document.getElementById('btn-time-bufos');
                if (btn) btn.style.background = '#1a241b'; // Reset color
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

    // --- DETECCIÓN DE LA TECLA 2 ---
    window.addEventListener('keydown', (e) => {
        if (e.key === '2') {
            startTimer();
        }
    });

    // ... [Aquí iría tu lógica original de ráfaga de bufos y cura] ...

})();
