// ==================== AUDIO NOTIFICATION SYSTEM ====================
let audioContext = null;
let audioInitialized = false;

function initAudioSystem() {
    if (audioInitialized) return;
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioInitialized = true;
        console.log("Audio system initialized");
        createFallbackSounds();
    } catch (error) {
        console.log("AudioContext not supported, using fallback:", error);
        createFallbackSounds();
    }
}

function createFallbackSounds() {
    const successAudio = document.getElementById('notification-success');
    if (successAudio) successAudio.src = createBeepSound(800, 0.3);
    const warningAudio = document.getElementById('notification-warning');
    if (warningAudio) warningAudio.src = createBeepSound(600, 0.2);
    const errorAudio = document.getElementById('notification-error');
    if (errorAudio) errorAudio.src = createBeepSound(400, 0.5);
    const buttonClickAudio = document.getElementById('button-click-sound');
    if (buttonClickAudio) buttonClickAudio.src = createBeepSound(600, 0.1);
}

function createBeepSound(frequency, duration) {
    const sampleRate = 44100;
    const channels = 1;
    const samples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(buffer);
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * channels * 2, true);
    view.setUint16(32, channels * 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, samples * 2, true);
    const amplitude = 0.3;
    for (let i = 0; i < samples; i++) {
        const time = i / sampleRate;
        const sample = Math.sin(2 * Math.PI * frequency * time) * amplitude;
        const intSample = Math.max(-1, Math.min(1, sample)) * 32767;
        view.setInt16(44 + i * 2, intSample, true);
    }
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return 'data:audio/wav;base64,' + btoa(binary);
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
}

function playClickSound() {
    try {
        if (!audioInitialized) initAudioSystem();
        if (audioContext && audioContext.state === 'suspended') audioContext.resume();
        if (audioContext && audioContext.state === 'running') {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.frequency.value = 600;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
            oscillator.onended = () => {
                oscillator.disconnect();
                gainNode.disconnect();
            };
        } else {
            const buttonClickAudio = document.getElementById('button-click-sound');
            if (buttonClickAudio) {
                buttonClickAudio.currentTime = 0;
                buttonClickAudio.play().catch(e => console.log("Audio play failed:", e));
            }
        }
    } catch (error) { console.log("Click sound play failed:", error); }
}

function playSuccessSound() {
    try {
        if (!audioInitialized) initAudioSystem();
        if (audioContext && audioContext.state === 'suspended') audioContext.resume();
        if (audioContext && audioContext.state === 'running') {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
            oscillator.onended = () => {
                oscillator.disconnect();
                gainNode.disconnect();
            };
        } else {
            const successAudio = document.getElementById('notification-success');
            if (successAudio) {
                successAudio.currentTime = 0;
                successAudio.play().catch(e => console.log("Audio play failed:", e));
            }
        }
    } catch (error) { console.log("Sound play failed:", error); }
}

function playWarningSound() {
    try {
        if (!audioInitialized) initAudioSystem();
        if (audioContext && audioContext.state === 'suspended') audioContext.resume();
        if (audioContext && audioContext.state === 'running') {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.frequency.value = 600;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + 0.2);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.35);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.35);
            oscillator.onended = () => {
                oscillator.disconnect();
                gainNode.disconnect();
            };
        } else {
            const warningAudio = document.getElementById('notification-warning');
            if (warningAudio) {
                warningAudio.currentTime = 0;
                warningAudio.play().catch(e => console.log("Audio play failed:", e));
            }
        }
    } catch (error) { console.log("Warning sound failed:", error); }
}

function playErrorSound() {
    try {
        if (!audioInitialized) initAudioSystem();
        if (audioContext && audioContext.state === 'suspended') audioContext.resume();
        if (audioContext && audioContext.state === 'running') {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.frequency.value = 400;
            oscillator.type = 'sawtooth';
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.4, audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.6);
            oscillator.onended = () => {
                oscillator.disconnect();
                gainNode.disconnect();
            };
        } else {
            const errorAudio = document.getElementById('notification-error');
            if (errorAudio) {
                errorAudio.currentTime = 0;
                errorAudio.play().catch(e => console.log("Audio play failed:", e));
            }
        }
    } catch (error) { console.log("Error sound failed:", error); }
}

document.addEventListener('click', function initAudioOnInteraction() {
    if (!audioInitialized) {
        initAudioSystem();
        document.removeEventListener('click', initAudioOnInteraction);
    }
}, { once: true });
