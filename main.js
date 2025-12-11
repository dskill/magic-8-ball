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

// Whisper/PTT State
let whisperWorker = null;
let whisperReady = false;
let mediaRecorder = null;
let audioChunks = [];
let audioContext = null;
let pttState = 'idle'; // 'idle' | 'recording' | 'transcribing'
let currentTranscript = '';
let recordingStartTime = null;

// Tone.js DSP chain
let player = null;
let effectsChain = null;
let vocoderCarrier = null;
let vocoderSeq = null;
let bgMusicSynth = null;
let bgMusicSeq = null;
let bgMusicGain = null;

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
const pttButton = document.getElementById('pttButton');
const pttStatus = document.getElementById('pttStatus');
const pttTranscript = document.getElementById('pttTranscript');
const pttDuration = document.getElementById('pttDuration');

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

        updateLoadingStatus('Loading AI model...', 85);
        await initializeLLM();

        updateLoadingStatus('Loading speech recognition...', 95);
        await initializeWhisper();

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

    // Background music synth - same pattern, quieter, loops continuously
    bgMusicSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: {
            attack: 0.1,
            decay: 0.3,
            sustain: 0.4,
            release: 0.8
        },
        volume: -18
    });

    bgMusicGain = new Tone.Gain(0.15);

    bgMusicSeq = new Tone.Part((time, value) => {
        bgMusicSynth.triggerAttackRelease(value.notes, value.duration, time);
    }, pattern);
    bgMusicSeq.loop = true;
    bgMusicSeq.loopEnd = '4:0:0';

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

    // Carrier to all carrier filters (both vocoder carrier and background music)
    bands.forEach(band => {
        vocoderCarrier.connect(band.carrierFilter);
        bgMusicSynth.connect(band.carrierFilter);
    });

    // Background music direct output (quiet ambient loop)
    bgMusicSynth.connect(bgMusicGain);
    bgMusicGain.connect(compressor);

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

async function initializeWhisper() {
    return new Promise((resolve) => {
        whisperWorker = new Worker(
            new URL('./whisper-worker.js', import.meta.url),
            { type: 'module' }
        );

        whisperWorker.onmessage = (e) => {
            if (e.data.status === 'ready') {
                whisperReady = true;
                console.log('Whisper ready');
                setPTTStatus('READY', 'idle');
                updatePTTTranscript('Hold SPACE or click button to speak...');
                resolve();
            } else if (e.data.status === 'loading') {
                console.log('Whisper loading:', e.data.data);
            }
        };

        whisperWorker.postMessage({ type: 'load' });

        // Timeout fallback
        setTimeout(() => {
            if (!whisperReady) {
                console.warn('Whisper load timeout, continuing without');
                setPTTStatus('UNAVAILABLE', 'error');
                resolve();
            }
        }, 60000);
    });
}

// ============================================
// Audio Recording Functions
// ============================================

async function initializeAudioRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                channelCount: 1,
                sampleRate: 16000,
                echoCancellation: true,
                noiseSuppression: true,
            }
        });

        mediaRecorder = new MediaRecorder(stream, {
            mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm',
        });

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                audioChunks.push(e.data);
            }
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            audioChunks = [];
            await processAudioForWhisper(audioBlob);
        };

        // Create AudioContext for decoding
        audioContext = new AudioContext({ sampleRate: 16000 });

        return true;
    } catch (error) {
        console.error('Microphone access denied:', error);
        setPTTStatus('MIC ERROR', 'error');
        return false;
    }
}

async function processAudioForWhisper(audioBlob) {
    setPTTState('transcribing');
    setPTTStatus('PROCESSING...', 'processing');

    try {
        // Decode audio blob to ArrayBuffer
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Get mono channel data
        let audioData;
        if (audioBuffer.numberOfChannels === 2) {
            const left = audioBuffer.getChannelData(0);
            const right = audioBuffer.getChannelData(1);
            audioData = new Float32Array(left.length);
            const SCALING_FACTOR = Math.sqrt(2);
            for (let i = 0; i < left.length; i++) {
                audioData[i] = SCALING_FACTOR * (left[i] + right[i]) / 2;
            }
        } else {
            audioData = audioBuffer.getChannelData(0);
        }

        // Resample to 16kHz if needed
        if (audioBuffer.sampleRate !== 16000) {
            audioData = resampleAudio(audioData, audioBuffer.sampleRate, 16000);
        }

        // Send to Whisper worker
        sendToWhisper(audioData);

    } catch (error) {
        console.error('Audio processing error:', error);
        setPTTState('idle');
        setPTTStatus('READY', 'idle');
        updatePTTTranscript('Audio processing failed. Try again.');
    }
}

function resampleAudio(audioData, fromRate, toRate) {
    const ratio = fromRate / toRate;
    const newLength = Math.round(audioData.length / ratio);
    const result = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
        const srcIndex = i * ratio;
        const srcIndexFloor = Math.floor(srcIndex);
        const srcIndexCeil = Math.min(srcIndexFloor + 1, audioData.length - 1);
        const t = srcIndex - srcIndexFloor;
        result[i] = audioData[srcIndexFloor] * (1 - t) + audioData[srcIndexCeil] * t;
    }

    return result;
}

// ============================================
// Whisper Worker Communication
// ============================================

function sendToWhisper(audioData) {
    if (!whisperReady || !whisperWorker) {
        console.warn('Whisper not ready');
        handleTranscriptionComplete('');
        return;
    }

    currentTranscript = '';

    const messageHandler = (e) => {
        const { status, text, error } = e.data;

        if (status === 'update') {
            currentTranscript = text;
            updatePTTTranscript(text);
        } else if (status === 'complete') {
            whisperWorker.removeEventListener('message', messageHandler);
            handleTranscriptionComplete(text);
        } else if (status === 'error') {
            whisperWorker.removeEventListener('message', messageHandler);
            console.error('Whisper error:', error);
            handleTranscriptionComplete('');
        }
    };

    whisperWorker.addEventListener('message', messageHandler);
    whisperWorker.postMessage({ type: 'transcribe', data: audioData });
}

function handleTranscriptionComplete(transcript) {
    setPTTState('idle');

    if (!transcript || transcript.trim().length === 0) {
        setPTTStatus('READY', 'idle');
        updatePTTTranscript('(no speech detected)');
        return;
    }

    // Show final transcript
    updatePTTTranscript(transcript);
    setPTTStatus('READY', 'idle');

    // Send to LLM and get robot response
    sendToRobot(transcript);
}

function sendToRobot(message) {
    if (!systemReady) {
        speak("My systems are still warming up. Try again in a moment.");
        return;
    }

    // Update the voice transcript to show what user said
    setVoiceTranscript(`You said: "${message}"`);

    // Free-form conversation - robot responds to whatever you say
    const weakness = gameState.emotionalWeakness;
    const emotionalContext = weakness
        ? `Your secret emotional weakness is: ${weakness.name} (${weakness.description}).`
        : '';

    const gameContext = gameState.phase === 'playing'
        ? `You are currently playing tic-tac-toe against ${gameState.playerName}. The game is in progress.`
        : gameState.phase === 'game_over'
        ? `The tic-tac-toe game just ended. ${gameState.winner === 'X' ? 'The human won.' : gameState.winner === 'O' ? 'You won.' : 'It was a draw.'}`
        : '';

    const prompt = `You are an arrogant robot with a retro computer personality. ${emotionalContext} ${gameContext}

The human said: "${message}"

Respond naturally in character. Keep it under 20 words:`;

    console.log('[PTT] Sending to LLM:', message);

    if (llmReady && llmWorker) {
        generateWithLLM(prompt, (response) => {
            if (response) {
                // Parse thinking tags if present
                let cleaned = response;
                const thinkEnd = cleaned.indexOf('</think>');
                if (thinkEnd !== -1) {
                    cleaned = cleaned.substring(thinkEnd + 8).trim();
                }
                // Remove quotes
                cleaned = cleaned.replace(/^["']|["']$/g, '').trim();
                // Limit length
                if (cleaned.length > 200) {
                    const firstSentence = cleaned.match(/^[^.!?]+[.!?]/);
                    cleaned = firstSentence ? firstSentence[0] : cleaned.substring(0, 200);
                }
                console.log('[PTT] Robot response:', cleaned);
                if (cleaned) {
                    speak(cleaned);
                }
            } else {
                speak("I heard you, but my response circuits malfunctioned.");
            }
        });
    } else {
        speak("My language processors are offline. I cannot respond.");
    }
}

// ============================================
// PTT State Management
// ============================================

function setPTTState(state) {
    pttState = state;
    updatePTTUI();
}

function setPTTStatus(text, mode = 'idle') {
    if (pttStatus) {
        pttStatus.textContent = text;
        pttStatus.className = 'ptt-status ptt-status-' + mode;
    }
}

function updatePTTTranscript(text) {
    if (pttTranscript) {
        pttTranscript.textContent = text || 'Hold SPACE or click button to speak...';
    }
}

function updatePTTUI() {
    if (pttButton) {
        pttButton.classList.remove('ptt-idle', 'ptt-recording', 'ptt-transcribing');
        pttButton.classList.add('ptt-' + pttState);

        switch (pttState) {
            case 'idle':
                pttButton.innerHTML = '<span class="ptt-icon">🎤</span> PUSH TO TALK';
                break;
            case 'recording':
                pttButton.innerHTML = '<span class="ptt-icon">🔴</span> LISTENING...';
                break;
            case 'transcribing':
                pttButton.innerHTML = '<span class="ptt-icon">⏳</span> PROCESSING...';
                break;
        }
    }
}

async function startRecording() {
    if (pttState !== 'idle') return;
    if (!whisperReady) {
        updatePTTTranscript('Speech recognition not ready yet...');
        return;
    }

    if (!mediaRecorder) {
        const success = await initializeAudioRecording();
        if (!success) return;
    }

    audioChunks = [];
    recordingStartTime = Date.now();
    mediaRecorder.start(100);

    setPTTState('recording');
    setPTTStatus('LISTENING', 'recording');
    updatePTTTranscript('Speak now...');

    updateRecordingDuration();
}

function stopRecording() {
    if (pttState !== 'recording') return;
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }
    recordingStartTime = null;
    if (pttDuration) {
        pttDuration.textContent = '';
    }
}

function updateRecordingDuration() {
    if (pttState !== 'recording' || !recordingStartTime) return;

    const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
    if (pttDuration) {
        pttDuration.textContent = `${elapsed}s`;
    }

    requestAnimationFrame(updateRecordingDuration);
}

// ============================================
// PTT Event Listeners
// ============================================

function setupPTTListeners() {
    // Spacebar push-to-talk
    document.addEventListener('keydown', (e) => {
        if (e.key === ' ' && pttState === 'idle') {
            // Don't trigger if typing in an input
            if (document.activeElement?.tagName === 'INPUT') return;
            // Don't trigger during game over (let existing restart handler work)
            if (gameState.phase === 'game_over') return;

            e.preventDefault();
            startRecording();
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.key === ' ' && pttState === 'recording') {
            e.preventDefault();
            stopRecording();
        }
    });

    // Button handlers
    if (pttButton) {
        // Mouse
        pttButton.addEventListener('mousedown', (e) => {
            e.preventDefault();
            startRecording();
        });
        pttButton.addEventListener('mouseup', (e) => {
            e.preventDefault();
            stopRecording();
        });
        pttButton.addEventListener('mouseleave', () => {
            if (pttState === 'recording') stopRecording();
        });

        // Touch
        pttButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            startRecording();
        });
        pttButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            stopRecording();
        });
    }
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

    // Start vocoder carrier for speech (transport already running for bg music)
    vocoderSeq.start(Tone.Transport.seconds);

    return new Promise((resolve) => {
        player.onstop = () => {
            // Stop vocoder carrier but keep transport running for bg music
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

    // Setup PTT listeners
    setupPTTListeners();

    // Start background music loop (runs continuously)
    Tone.Transport.bpm.value = 90;
    bgMusicSeq.start(0);
    Tone.Transport.start();

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
