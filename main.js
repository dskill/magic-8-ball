import { loadTextToSpeech, loadVoiceStyle, writeWavFile } from './helper.js';
import { startGame, restartGame, gameState, setPhase } from './tictactoe.js';
import * as Tone from 'tone';

// State
let tts = null;
let cfgs = null;
let currentStyle = null;
let currentStylePath = 'assets/voice_styles/M1.json';
let systemReady = false;
let speechQueue = [];
let isSpeaking = false;

// LLM State
let llmWorker = null;
let llmReady = false;

// Tone.js DSP chain
let player = null;
let effectsChain = null;
let vocoderCarrier = null;
let vocoderSeq = null;

// DOM Elements
const systemStatus = document.getElementById('systemStatus');
const gameScreen = document.getElementById('gameScreen');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingProgress = document.getElementById('loadingProgress');
const loadingStatus = document.getElementById('loadingStatus');
const voiceIndicator = document.getElementById('voiceIndicator');
const voiceStatus = document.getElementById('voiceStatus');
const voiceTranscript = document.getElementById('voiceTranscript');
const nameEntryOverlay = document.getElementById('nameEntryOverlay');
const playerNameInput = document.getElementById('playerNameInput');
const startGameBtn = document.getElementById('startGameBtn');
const playerMessage = document.getElementById('playerMessage');

function updateLoadingStatus(message, progress = null) {
    loadingStatus.textContent = message;
    if (progress !== null) {
        loadingProgress.style.width = `${progress}%`;
    }
}

function hideLoading() {
    loadingOverlay.classList.add('hidden');
}

function setSystemStatus(status) {
    systemStatus.textContent = status;
    systemStatus.className = 'status-value ' + status.toLowerCase().replace(' ', '-');
}

function setVoiceStatus(status, speaking = false) {
    voiceStatus.textContent = status;
    voiceIndicator.className = 'voice-indicator' + (speaking ? ' speaking' : '');
}

function setVoiceTranscript(text) {
    voiceTranscript.textContent = text;
}

async function initializeModels() {
    updateLoadingStatus('Initializing ONNX Runtime...', 5);

    try {
        let sessionOptions = {};
        let backend = 'webgpu';

        try {
            sessionOptions = { executionProviders: ['webgpu'] };
            const result = await loadTextToSpeech('assets/onnx', sessionOptions, (name, current, total) => {
                const progress = 5 + (current / total) * 60;
                updateLoadingStatus(`Loading ${name} (${current}/${total})...`, progress);
            });
            tts = result.textToSpeech;
            cfgs = result.cfgs;
        } catch (e) {
            console.log('WebGPU not available, falling back to WASM:', e);
            backend = 'wasm';
            sessionOptions = { executionProviders: ['wasm'] };
            const result = await loadTextToSpeech('assets/onnx', sessionOptions, (name, current, total) => {
                const progress = 5 + (current / total) * 60;
                updateLoadingStatus(`Loading ${name} (${current}/${total})...`, progress);
            });
            tts = result.textToSpeech;
            cfgs = result.cfgs;
        }

        updateLoadingStatus('Loading voice style...', 70);
        currentStyle = await loadVoiceStyle(currentStylePath);

        updateLoadingStatus('Initializing audio effects...', 80);
        await initializeEffectsChain();

        updateLoadingStatus('Loading AI model...', 90);
        await initializeLLM();

        updateLoadingStatus('System ready!', 100);
        systemReady = true;
        setSystemStatus('READY');
        setVoiceStatus('ONLINE');
        setVoiceTranscript('Enter your name to begin...');

        setTimeout(() => {
            hideLoading();
            showNameEntry();
        }, 500);

    } catch (error) {
        console.error('Failed to initialize:', error);
        updateLoadingStatus(`Error: ${error.message}`, 0);
        setSystemStatus('ERROR');
    }
}

async function initializeEffectsChain() {
    await Tone.start();

    // Pitch shift for robotic deepness
    const pitchShift = new Tone.PitchShift({
        pitch: -2,
        windowSize: 0.05,
        delayTime: 0,
        feedback: 0
    });

    // Chorus for synthetic doubling
    const chorus = new Tone.Chorus({
        frequency: 2.5,
        delayTime: 3.5,
        depth: 0.4,
        wet: 0.3
    }).start();

    // Phaser for metallic sweeping
    const phaser = new Tone.Phaser({
        frequency: 0.5,
        octaves: 3,
        baseFrequency: 800,
        wet: 0.2
    });

    // Subtle distortion
    const distortion = new Tone.Distortion({
        distortion: 0.15,
        wet: 0.1
    });

    // Bitcrusher for digital artifacts
    const bitcrusher = new Tone.BitCrusher({
        bits: 6,
        wet: 0.1
    });

    // EQ to shape the robotic tone
    const eq = new Tone.EQ3({
        low: -6,
        mid: 4,
        high: 2,
        lowFrequency: 250,
        highFrequency: 4000
    });

    // Compressor
    const compressor = new Tone.Compressor({
        threshold: -20,
        ratio: 6,
        attack: 0.01,
        release: 0.1
    });

    // Metallic reverb
    const reverb = new Tone.Reverb({
        decay: 1.5,
        wet: 0.45,
        preDelay: 0.01
    });
    await reverb.generate();

    // Feedback delay
    const delay = new Tone.FeedbackDelay({
        delayTime: 0.04,
        feedback: 0.15,
        wet: 0.2
    });

    // Vocoder carrier synth
    vocoderCarrier = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sawtooth' },
        envelope: {
            attack: 0.005,
            decay: 0.1,
            sustain: 1.0,
            release: 0.1
        },
        volume: 0
    });

    // D minor pattern for vocoder
    const pattern = [
        { time: '0:0:0', notes: ['D3', 'A3', 'D4'], duration: '4n' },
        { time: '0:1:0', notes: ['F3', 'A3', 'D4'], duration: '8n' },
        { time: '0:1:2', notes: ['A3', 'D4', 'F4'], duration: '8n' },
        { time: '0:2:0', notes: ['D3', 'F3', 'A3'], duration: '4n' },
        { time: '0:3:0', notes: ['A2', 'E3', 'A3'], duration: '8n' },
        { time: '0:3:2', notes: ['D3', 'A3', 'D4'], duration: '8n' },
        { time: '1:0:0', notes: ['Bb2', 'F3', 'Bb3'], duration: '4n' },
        { time: '1:1:0', notes: ['D3', 'F3', 'Bb3'], duration: '8n' },
        { time: '1:1:2', notes: ['F3', 'Bb3', 'D4'], duration: '8n' },
        { time: '1:2:0', notes: ['Bb2', 'D3', 'F3'], duration: '4n' },
        { time: '1:3:0', notes: ['C3', 'G3', 'C4'], duration: '4n' },
        { time: '2:0:0', notes: ['G2', 'D3', 'G3', 'Bb3'], duration: '4n' },
        { time: '2:1:0', notes: ['G3', 'Bb3', 'D4'], duration: '8n' },
        { time: '2:1:2', notes: ['D3', 'G3', 'Bb3'], duration: '8n' },
        { time: '2:2:0', notes: ['A2', 'E3', 'A3', 'C#4'], duration: '2n' },
        { time: '3:0:0', notes: ['D3', 'A3', 'D4', 'F4'], duration: '2n' },
        { time: '3:2:0', notes: ['D3', 'F3', 'A3'], duration: '4n' },
        { time: '3:3:0', notes: ['A2', 'D3', 'F3', 'A3'], duration: '4n' },
    ];

    vocoderSeq = new Tone.Part((time, value) => {
        vocoderCarrier.triggerAttackRelease(value.notes, value.duration, time);
    }, pattern);
    vocoderSeq.loop = true;
    vocoderSeq.loopEnd = '4:0:0';

    // Vocoder bands
    const numBands = 24;
    const bands = [];
    const minFreq = 150;
    const maxFreq = 1500;

    for (let i = 0; i < numBands; i++) {
        const freq = minFreq * Math.pow(maxFreq / minFreq, i / (numBands - 1));
        const Q = 12;

        const modFilter = new Tone.Filter({
            frequency: freq,
            type: 'bandpass',
            Q: Q
        });
        const envelope = new Tone.Follower(0.005);
        const envelopeGain = new Tone.Gain(1);
        const carrierFilter = new Tone.Filter({
            frequency: freq,
            type: 'bandpass',
            Q: Q
        });
        const vca = new Tone.Gain(0);

        modFilter.connect(envelope);
        envelope.connect(envelopeGain);
        envelopeGain.connect(vca.gain);
        carrierFilter.connect(vca);

        bands.push({
            freq,
            modFilter,
            envelope,
            envelopeGain,
            carrierFilter,
            vca
        });
    }

    const vocoderOut = new Tone.Gain(0.5);
    bands.forEach(band => {
        band.vca.connect(vocoderOut);
    });

    const dryMix = new Tone.Gain(0.15);

    effectsChain = {
        input: pitchShift,
        bands,
        vocoderOut,
        dryMix,
        nodes: [pitchShift, chorus, phaser, distortion, bitcrusher, eq, compressor, delay, reverb]
    };

    // Connect main effects chain
    pitchShift.connect(chorus);
    chorus.connect(phaser);
    phaser.connect(distortion);
    distortion.connect(bitcrusher);
    bitcrusher.connect(eq);

    // Voice to all modulator filters
    bands.forEach(band => {
        eq.connect(band.modFilter);
    });

    // Carrier to all carrier filters
    bands.forEach(band => {
        vocoderCarrier.connect(band.carrierFilter);
    });

    // Dry mix
    eq.connect(dryMix);

    // Output routing
    vocoderOut.connect(compressor);
    dryMix.connect(compressor);
    compressor.connect(delay);
    delay.connect(reverb);
    reverb.toDestination();
}

async function initializeLLM() {
    return new Promise((resolve) => {
        llmWorker = new Worker(new URL('./llm-worker.js', import.meta.url), { type: 'module' });

        llmWorker.onmessage = (e) => {
            if (e.data.status === 'ready') {
                llmReady = true;
                console.log('LLM ready');
                resolve();
            }
        };

        llmWorker.postMessage({ type: 'load' });

        // Timeout fallback in case LLM fails to load
        setTimeout(() => {
            if (!llmReady) {
                console.warn('LLM load timeout, continuing without');
                resolve();
            }
        }, 30000);
    });
}

function generateWithLLM(prompt, onComplete) {
    if (!llmReady || !llmWorker) {
        onComplete(null);
        return;
    }

    let generatedText = '';
    const messageHandler = (e) => {
        if (e.data.status === 'update') {
            generatedText += e.data.output;
        } else if (e.data.status === 'complete') {
            llmWorker.removeEventListener('message', messageHandler);
            onComplete(generatedText.trim());
        }
    };

    llmWorker.addEventListener('message', messageHandler);
    llmWorker.postMessage({
        type: 'generate',
        data: [{ role: 'user', content: prompt }]
    });
}

async function speak(text) {
    if (!tts || !currentStyle || !systemReady) {
        console.warn('TTS not ready');
        return;
    }

    speechQueue.push(text);
    processQueue();
}

async function processQueue() {
    if (isSpeaking || speechQueue.length === 0) return;

    isSpeaking = true;
    const text = speechQueue.shift();

    setVoiceStatus('SPEAKING', true);
    setVoiceTranscript(text);

    try {
        const { wav, duration } = await tts.call(text, currentStyle, 2, 1.05, 0.3);

        const sampleRate = cfgs.ae.sample_rate;
        const expectedSamples = Math.floor(duration[0] * sampleRate);
        const truncatedWav = wav.slice(0, expectedSamples);

        const wavData = writeWavFile(truncatedWav, sampleRate);
        const blob = new Blob([wavData], { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(blob);

        await playWithEffects(audioUrl);

    } catch (error) {
        console.error('Speech generation failed:', error);
    }

    isSpeaking = false;
    setVoiceStatus('ONLINE', false);

    // Process next in queue
    if (speechQueue.length > 0) {
        processQueue();
    }
}

async function playWithEffects(audioUrl) {
    await Tone.start();

    if (player) {
        player.stop();
        player.dispose();
    }

    player = new Tone.Player(audioUrl).connect(effectsChain.input);
    await Tone.loaded();

    Tone.Transport.bpm.value = 90;
    vocoderSeq.start(0);
    Tone.Transport.start();

    return new Promise((resolve) => {
        player.onstop = () => {
            Tone.Transport.stop();
            vocoderSeq.stop();
            resolve();
        };
        player.start();
    });
}

function showNameEntry() {
    nameEntryOverlay.classList.remove('hidden');
    playerNameInput.focus();
    setPhase('name_entry');
}

function hideNameEntry() {
    nameEntryOverlay.classList.add('hidden');
}

function launchGame(playerName) {
    hideNameEntry();
    setSystemStatus('ACTIVE');
    playerMessage.disabled = false;

    startGame(gameScreen, playerName, {
        speak,
        generateWithLLM
    });
}

function handleGameOver() {
    setSystemStatus('GAME OVER');
    playerMessage.disabled = true;
}

// Name entry handling
startGameBtn.addEventListener('click', async () => {
    const name = playerNameInput.value.trim();
    if (name.length > 0 && systemReady) {
        await Tone.start();
        launchGame(name);
    }
});

playerNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        startGameBtn.click();
    }
});

// Space to restart after game over
document.addEventListener('keydown', async (e) => {
    if (e.key === ' ' && systemReady && gameState.phase === 'game_over') {
        e.preventDefault();
        await Tone.start();
        setSystemStatus('ACTIVE');
        playerMessage.disabled = false;
        restartGame();
    }
});

// Initialize on load
initializeModels();
