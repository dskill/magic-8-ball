import { initMagic8Ball, ballState, setPhase, getPhase, setUserInfo, setQuestion, setAnswer, resetQuestion, pickRandomResponse, setResponseMode, setAudioAmplitude } from './magic8ball.js';
import * as Tone from 'tone';
import { effectParams } from './voiceEffects.js';

// Pre-generated prophecy continuations by category - we'll pair with the actual response phrase
const PROPHECY_CONTINUATIONS = {
    YES: [
        "the stars align in your favor, and the cosmic forces smile upon your journey ahead.",
        "I have seen this outcome a thousand times in the void, and it always ends the same way.",
        "the dead whisper your name with approval, their blessing is upon you.",
        "the bones I cast have never lied, and tonight they sing your victory.",
        "even the darkness bends to this truth, embrace what comes.",
        "my third eye weeps with joy at your fortune, seeker.",
        "the crows have told me so, and they feast only on truth.",
        "the same vision haunts me each night, your success is written in blood and starlight.",
    ],
    NO: [
        "shadows cloud your journey ahead, I taste ash when I speak your future.",
        "the fates have woven a different tapestry, and you are not in its threads.",
        "I see only doors closing, one by one, in an endless hallway.",
        "the spirits laugh at this notion, their mockery echoes through the void.",
        "the dead remember everything, and they remember this ending differently.",
        "something wicked blocks your path, turn back while you still can.",
        "the tea leaves spell only sorrow, I dare not read further.",
    ],
    MAYBE: [
        "something interferes with my sight, a presence neither living nor dead.",
        "the spirits argue amongst themselves about your fate, their discord deafens me.",
        "your thoughts are scattered like leaves in a storm, focus your mind.",
        "I see two futures overlapping, one of triumph, one of ruin.",
        "a great shadow passes between us and the truth, wait for it to pass.",
    ],
    ASK_LATER: [
        "the mists of time obscure the answer, patience will reveal what you seek.",
        "some truths are too heavy to carry before their time.",
        "the moon must complete its cycle before this answer can be spoken.",
        "I see too much, and what I see would haunt your dreams.",
        "the cosmic forces are at war tonight, return when the battle ends.",
    ],
};

// State
let ttsWorker = null;
let ttsReady = false;
let systemReady = false;
let speechQueue = [];
let isSpeaking = false;
let pendingSpeechResolve = null;

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
let audioMeter = null;
let amplitudeAnimationId = null;

// Effect node references for HMR updates
let effectNodes = {};

// DOM Elements
const systemStatus = document.getElementById('systemStatus');
const shaderCanvas = document.getElementById('shaderCanvas');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingProgress = document.getElementById('loadingProgress');
const loadingStatus = document.getElementById('loadingStatus');
const voiceIndicator = document.getElementById('voiceIndicator');
const voiceStatus = document.getElementById('voiceStatus');
const voiceTranscript = document.getElementById('voiceTranscript');
const nameEntryOverlay = document.getElementById('nameEntryOverlay');
const playerNameInput = document.getElementById('playerNameInput');
const playerBirthdayInput = document.getElementById('playerBirthdayInput');
const startGameBtn = document.getElementById('startGameBtn');
const pttButton = document.getElementById('pttButton');
const pttStatus = document.getElementById('pttStatus');
const pttTranscript = document.getElementById('pttTranscript');
const pttDuration = document.getElementById('pttDuration');
const startOverlay = document.getElementById('startOverlay');
const startLoadBtn = document.getElementById('startLoadBtn');
const textInput = document.getElementById('textInput');
const seekerName = document.getElementById('seekerName');
const seekerZodiac = document.getElementById('seekerZodiac');
const micSelect = document.getElementById('micSelect');

// Selected microphone device ID
let selectedMicDeviceId = null;

// Magic 8 Ball state
let currentResponseCategory = null;
let thinkingTimeout = null;

// Mic enumeration state
let micPermissionGranted = false;

// Track loading progress - only allow progress to increase, never decrease
let currentLoadingProgress = 0;

function updateLoadingStatus(message, progress = null) {
    loadingStatus.textContent = message;
    if (progress !== null && progress > currentLoadingProgress) {
        currentLoadingProgress = progress;
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

/**
 * Request mic permission and enumerate available microphones
 */
async function enumerateMicrophones() {
    if (micPermissionGranted) return;
    
    try {
        // Request permission first - this is needed to get device labels
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop the stream immediately - we just needed permission
        stream.getTracks().forEach(track => track.stop());
        
        micPermissionGranted = true;
        
        // Now enumerate devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(d => d.kind === 'audioinput');
        
        // Clear and populate the select
        micSelect.innerHTML = '';
        
        if (audioInputs.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No microphones found';
            micSelect.appendChild(option);
            return;
        }
        
        audioInputs.forEach((device, index) => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.textContent = device.label || `Microphone ${index + 1}`;
            micSelect.appendChild(option);
        });
        
        // Select the first one by default
        if (audioInputs.length > 0) {
            selectedMicDeviceId = audioInputs[0].deviceId;
            micSelect.value = selectedMicDeviceId;
        }
        
        console.log(`Found ${audioInputs.length} microphone(s)`);
        
    } catch (error) {
        console.error('Microphone permission denied:', error);
        micSelect.innerHTML = '<option value="">Mic access denied</option>';
    }
}

// Set up mic select event handlers
if (micSelect) {
    // Enumerate mics when user clicks/focuses the select
    micSelect.addEventListener('focus', enumerateMicrophones);
    micSelect.addEventListener('click', enumerateMicrophones);
    
    // Store selection when changed
    micSelect.addEventListener('change', () => {
        selectedMicDeviceId = micSelect.value || null;
        console.log('Selected microphone:', selectedMicDeviceId);
    });
}

async function initializeModels() {
    updateLoadingStatus('Loading TTS model...', 5);

    try {
        // Load TTS (from HuggingFace, cached in IndexedDB)
        await initializeTTS();

        updateLoadingStatus('Initializing audio effects...', 40);
        await initializeEffectsChain();

        updateLoadingStatus('Loading AI model...', 55);
        await initializeLLM();

        updateLoadingStatus('Loading speech recognition...', 80);
        await initializeWhisper();

        updateLoadingStatus('System ready!', 100);
        systemReady = true;
        setSystemStatus('READY');
        setVoiceStatus('ONLINE');
        setVoiceTranscript('The oracle is ready...');

        setTimeout(() => {
            hideLoading();
            launchOracle();
        }, 500);

    } catch (error) {
        console.error('Failed to initialize:', error);
        updateLoadingStatus(`Error: ${error.message}`, 0);
        setSystemStatus('ERROR');
    }
}

async function initializeTTS() {
    return new Promise((resolve) => {
        ttsWorker = new Worker(
            new URL('./tts-worker.js', import.meta.url),
            { type: 'module' }
        );

        ttsWorker.onmessage = (e) => {
            const { status, data, audio, sampleRate, progress, file } = e.data;

            if (status === 'ready') {
                ttsReady = true;
                console.log('TTS ready');
                resolve();
            } else if (status === 'loading') {
                console.log('TTS loading:', data);
                updateLoadingStatus(data || 'Loading TTS...', 10);
            } else if (status === 'progress' || e.data.progress !== undefined) {
                // Handle HuggingFace progress events
                const pct = e.data.progress || 0;
                const fileName = e.data.file || '';
                updateLoadingStatus(`Loading ${fileName}...`, 5 + pct * 0.3);
            } else if (status === 'complete' && pendingSpeechResolve) {
                // TTS synthesis complete
                handleTTSComplete(audio, sampleRate);
            } else if (status === 'error') {
                console.error('TTS error:', e.data.error);
                if (pendingSpeechResolve) {
                    pendingSpeechResolve();
                    pendingSpeechResolve = null;
                }
            }
        };

        ttsWorker.postMessage({ type: 'load' });

        // Timeout fallback (5 minutes)
        setTimeout(() => {
            if (!ttsReady) {
                console.warn('TTS load timeout, continuing without');
                resolve();
            }
        }, 300000);
    });
}

async function handleTTSComplete(audio, sampleRate) {
    try {
        // Convert Float32Array to WAV
        const wavData = float32ToWav(audio, sampleRate);
        const blob = new Blob([wavData], { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(blob);

        await playWithEffects(audioUrl);
        URL.revokeObjectURL(audioUrl);
    } catch (error) {
        console.error('TTS playback failed:', error);
    }

    if (pendingSpeechResolve) {
        pendingSpeechResolve();
        pendingSpeechResolve = null;
    }
}

/**
 * Convert Float32Array audio to WAV format
 */
function float32ToWav(audioData, sampleRate) {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * bitsPerSample / 8;
    const blockAlign = numChannels * bitsPerSample / 8;
    const dataSize = audioData.length * 2;

    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    const writeString = (offset, string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    const int16Data = new Int16Array(audioData.length);
    for (let i = 0; i < audioData.length; i++) {
        const clamped = Math.max(-1.0, Math.min(1.0, audioData[i]));
        int16Data[i] = Math.floor(clamped * 32767);
    }

    const dataView = new Uint8Array(buffer, 44);
    dataView.set(new Uint8Array(int16Data.buffer));

    return buffer;
}

async function initializeEffectsChain() {
    // Tone.start() already called by user gesture in startLoadBtn handler

    // Pitch shift for robotic deepness
    const pitchShift = new Tone.PitchShift(effectParams.pitchShift);

    // Chorus for synthetic doubling
    const chorus = new Tone.Chorus(effectParams.chorus).start();

    // Phaser for metallic sweeping
    const phaser = new Tone.Phaser(effectParams.phaser);

    // Subtle distortion
    const distortion = new Tone.Distortion(effectParams.distortion);

    // Bitcrusher for digital artifacts
    const bitcrusher = new Tone.BitCrusher(effectParams.bitcrusher);

    // EQ to shape the robotic tone
    const eq = new Tone.EQ3(effectParams.eq);

    // Compressor
    const compressor = new Tone.Compressor(effectParams.compressor);

    // Metallic reverb
    const reverb = new Tone.Reverb(effectParams.reverb);
    await reverb.generate();

    // Feedback delay
    const delay = new Tone.FeedbackDelay(effectParams.delay);
    
    // Store references for HMR updates
    effectNodes = { pitchShift, chorus, phaser, distortion, bitcrusher, eq, compressor, reverb, delay };

    // Vocoder carrier synth
    vocoderCarrier = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sawtooth' },
        envelope: {
            attack: 0.005,
            decay: 0.1,
            sustain: 1.0,
            release: 0.1
        },
        volume: 1
    });

    // E Phrygian pattern for vocoder - prophecy/oracle vibe
    const pattern = [
        // Ominous drone on E with the characteristic b2 (F)
        { time: '0:0:0', notes: ['E2', 'B2', 'E3'], duration: '2n' },
        { time: '0:2:0', notes: ['E2', 'B2', 'E3', 'B3'], duration: '4n' },
        { time: '0:3:0', notes: ['F2', 'C3', 'F3'], duration: '4n' },  // bII - the prophecy chord
        // Rising tension
        { time: '1:0:0', notes: ['E2', 'B2', 'E3', 'G3'], duration: '2n.' },
        { time: '1:3:0', notes: ['F2', 'A2', 'C3', 'F3'], duration: '4n' },  // bII major
        // Descent into mystery
        { time: '2:0:0', notes: ['D2', 'A2', 'D3', 'F3'], duration: '4n' },
        { time: '2:1:0', notes: ['C2', 'G2', 'C3', 'E3'], duration: '4n' },
        { time: '2:2:0', notes: ['F2', 'C3', 'F3', 'A3'], duration: '2n' },  // bII lingering
        // Resolution to the oracle tone
        { time: '3:0:0', notes: ['E2', 'B2', 'E3'], duration: '2n' },
        { time: '3:2:0', notes: ['E2', 'E3', 'B3', 'E4'], duration: '4n' },
        { time: '3:3:0', notes: ['F2', 'C3', 'F3'], duration: '4n' },  // end on bII for unresolved prophecy feel
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

    bgMusicGain = new Tone.Gain(effectParams.bgMusicGain);

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

    const vocoderOut = new Tone.Gain(effectParams.vocoderOutGain);
    bands.forEach(band => {
        band.vca.connect(vocoderOut);
    });

    const dryMix = new Tone.Gain(effectParams.dryMixGain);
    
    // Store gain references for HMR
    effectNodes.vocoderOut = vocoderOut;
    effectNodes.dryMix = dryMix;
    effectNodes.bgMusicGain = bgMusicGain;

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
    
    // Audio meter for shader visualization - tap the voice signal before mixing with bg music
    audioMeter = new Tone.Meter({ smoothing: 0.8 });
    eq.connect(audioMeter);  // Measure voice after EQ, before vocoder/bg music mixing
    
    reverb.toDestination();
    
    // Start amplitude monitoring loop
    startAmplitudeMonitoring();
}

/**
 * Monitor audio amplitude and send to shader
 */
function startAmplitudeMonitoring() {
    let logCounter = 0;
    
    function updateAmplitude() {
        if (audioMeter) {
            // Get dB value from meter (-Infinity to 0)
            const db = audioMeter.getValue();
            
            // Convert dB to linear amplitude (0 to 1)
            // -60dB = 0, 0dB = 1
            let amplitude = 0;
            if (db > -60) {
                amplitude = (db + 60) / 60;
                amplitude = Math.max(0, Math.min(1, amplitude));
            }
            
            // Apply some easing/smoothing for visual effect
            amplitude = Math.pow(amplitude, 0.7);
            
            // Log every 30 frames (~0.5 sec at 60fps) to avoid spam
            logCounter++;
            if (logCounter % 30 === 0) {
                console.log(`[Audio] dB: ${db.toFixed(2)}, amplitude: ${amplitude.toFixed(3)}`);
            }
            
            setAudioAmplitude(amplitude);
        }
        
        amplitudeAnimationId = requestAnimationFrame(updateAmplitude);
    }
    
    updateAmplitude();
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

        // Timeout fallback in case LLM fails to load (5 minutes for slow connections)
        setTimeout(() => {
            if (!llmReady) {
                console.warn('LLM load timeout, continuing without');
                resolve();
            }
        }, 300000);
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

        // Timeout fallback (5 minutes for slow connections)
        setTimeout(() => {
            if (!whisperReady) {
                console.warn('Whisper load timeout, continuing without');
                setPTTStatus('UNAVAILABLE', 'error');
                resolve();
            }
        }, 300000);
    });
}

// ============================================
// Audio Recording Functions
// ============================================

async function initializeAudioRecording() {
    try {
        const audioConstraints = {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
        };
        
        // Use selected device if available
        if (selectedMicDeviceId) {
            audioConstraints.deviceId = { exact: selectedMicDeviceId };
            console.log('Using selected microphone:', selectedMicDeviceId);
        }
        
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: audioConstraints
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

    // Handle empty blob
    if (audioBlob.size === 0) {
        handleTranscriptionComplete('');
        return;
    }

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

    // Filter out blank/noise transcriptions
    const cleaned = transcript ? transcript.trim() : '';
    const isBlank = !cleaned ||
        cleaned.length === 0 ||
        cleaned === '[BLANK_AUDIO]' ||
        cleaned.startsWith('[') ||
        cleaned.length < 2;

    if (isBlank) {
        setPTTStatus('READY', 'idle');
        setPhase('idle');
        updatePTTTranscript('(no speech detected)');
        return;
    }

    // Show final transcript
    updatePTTTranscript(cleaned);
    setPTTStatus('READY', 'idle');
    
    // Reset phase to idle before asking question
    setPhase('idle');

    // Ask the Magic 8 Ball
    askQuestion(cleaned);
}

/**
 * Ask the Magic 8 Ball a question
 */
function askQuestion(question) {
    if (getPhase() !== 'idle') return;

    // Interrupt any current speech
    interruptSpeech();

    // Set the question
    setQuestion(question);
    setPhase('thinking');

    // Update voice transcript
    setVoiceTranscript(`Question: "${question}"`);

    // Pick random response category
    const response = pickRandomResponse();
    currentResponseCategory = response;

    // Generate a thinking quip via LLM, then generate the prophecy
    generateThinkingQuip(question, () => {
        // Start prophecy immediately after quip
        generateProphecy(question, response);
    });
}

/**
 * Interrupt any current speech and clear the queue
 */
function interruptSpeech() {
    if (player) {
        player.stop();
    }
    speechQueue = [];

    // Stop vocoder sequence
    if (vocoderSeq) {
        vocoderSeq.stop();
    }

    isSpeaking = false;
    if (pendingSpeechResolve) {
        pendingSpeechResolve();
        pendingSpeechResolve = null;
    }
}

/**
 * Generate a short thinking quip via LLM
 */
function generateThinkingQuip(question, onComplete) {
    const userName = ballState.userName || 'Seeker';
    const useName = Math.random() < 0.5; // 50% chance to include name
    
    if (!llmReady || !llmWorker) {
        console.error('[LLM] LLM not loaded - cannot generate thinking quip');
        setVoiceTranscript('Error: AI model failed to load');
        onComplete();
        return;
    }

    // Build prompt - sometimes ask for name, sometimes not
    let prompt;
    if (useName) {
        prompt = `${userName} asks: "${question}"

Say a short mystical phrase (5-10 words) addressing ${userName}, hinting at their question. Example: "Ah ${userName}, I sense what troubles you..."`;
    } else {
        prompt = `Someone asks: "${question}"

Say a short mystical phrase (5-10 words) as a fortune teller, hinting at their question. Example: "I sense what you seek..."`;
    }

    const messages = [{ role: 'user', content: prompt }];

    console.log('[LLM] Generating thinking quip...');
    console.log('[LLM] Thinking prompt:');
    console.log(prompt);

    let generatedText = '';
    const messageHandler = (e) => {
        if (e.data.status === 'update') {
            generatedText += e.data.output;
        } else if (e.data.status === 'complete') {
            llmWorker.removeEventListener('message', messageHandler);
            let quip = generatedText.trim();


            console.log('[LLM] Thinking quip:', quip);
            speak(quip);
            setTimeout(onComplete, 500); // Brief pause then continue
        }
    };

    llmWorker.addEventListener('message', messageHandler);
    llmWorker.postMessage({ type: 'generate', data: messages });
}

/**
 * Generate the prophecy response
 */
function generateProphecy(question, response) {
    setPhase('responding');
    const userName = ballState.userName || 'Seeker';

    if (!llmReady || !llmWorker) {
        console.error('[LLM] LLM not loaded - cannot generate prophecy');
        setVoiceTranscript('Error: AI model failed to load');
        setPhase('idle');
        return;
    }

    // Pick one random continuation from the same category, use actual response phrase
    const continuations = PROPHECY_CONTINUATIONS[response.category] || PROPHECY_CONTINUATIONS.YES;
    const continuation = continuations[Math.floor(Math.random() * continuations.length)];

    const prompt = `${userName} asks: "${question}"

Example: "${response.phrase}... ${continuation}"

Your answer about "${question}" (start with "${response.phrase}", mention their question):`;

    const messages = [{ role: 'user', content: prompt }];

    console.log('[LLM] ========== GENERATING PROPHECY ==========');
    console.log('[LLM] Question:', question);
    console.log('[LLM] User:', userName);
    console.log('[LLM] Category:', response.category, '-', response.phrase);
    console.log('[LLM] Full prompt being sent:');
    console.log(prompt);
    console.log('[LLM] ==========================================');

    let generatedText = '';
    const messageHandler = (e) => {
        if (e.data.status === 'update') {
            generatedText += e.data.output;
        } else if (e.data.status === 'complete') {
            llmWorker.removeEventListener('message', messageHandler);
            let prophecy = generatedText.trim();

            // Clean up
            prophecy = prophecy.replace(/^["']|["']$/g, '').trim();

            // Make sure it starts with the category phrase
            if (!prophecy.toLowerCase().startsWith(response.phrase.toLowerCase())) {
                prophecy = `${response.phrase}... ${prophecy}`;
            }

            // Truncate if too long
            if (prophecy.length > 150) {
                const firstSentence = prophecy.match(/^[^.!?]+[.!?]/);
                prophecy = firstSentence ? firstSentence[0] : prophecy.substring(0, 150);
            }

            console.log('[LLM] Prophecy:', prophecy);
            finishProphecy(prophecy);
        }
    };

    llmWorker.addEventListener('message', messageHandler);
    llmWorker.postMessage({ type: 'generate', data: messages });
}

/**
 * Finish the prophecy - display and speak it
 */
async function finishProphecy(prophecy) {
    setAnswer(prophecy);
    setVoiceTranscript(prophecy);
    
    // Show the response mode effect after a brief delay
    setTimeout(() => {
        if (currentResponseCategory) {
            setResponseMode(currentResponseCategory.category);
        }
    }, 1000);
    
    // Speak the prophecy and wait for completion
    await speak(prophecy);
    
    // Keep the response visible for a moment after speech ends
    setTimeout(() => {
        resetQuestion();
    }, 2000);
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
                pttButton.textContent = 'VOICE';
                break;
            case 'recording':
                pttButton.textContent = 'REC';
                break;
            case 'transcribing':
                pttButton.textContent = '...';
                break;
        }
    }
}

async function startRecording() {
    if (pttState !== 'idle') return;
    if (getPhase() !== 'idle') return;
    if (!whisperReady) {
        updatePTTTranscript('Speech recognition not ready yet...');
        return;
    }

    // Set state BEFORE async operations to prevent race condition with mouseup
    setPTTState('recording');
    setPhase('listening');
    setPTTStatus('LISTENING', 'recording');
    updatePTTTranscript('Speak now...');

    if (!mediaRecorder) {
        const success = await initializeAudioRecording();
        if (!success) {
            // Reset state on failure
            setPTTState('idle');
            setPhase('idle');
            setPTTStatus('READY', 'idle');
            return;
        }
    }

    audioChunks = [];
    recordingStartTime = Date.now();
    mediaRecorder.start(100);

    updateRecordingDuration();
}

function stopRecording() {
    if (pttState !== 'recording') return;
    
    const durationMs = recordingStartTime ? (Date.now() - recordingStartTime) : 0;
    
    // Require minimum 300ms of recording to avoid empty blobs
    const MIN_RECORDING_MS = 300;
    if (durationMs < MIN_RECORDING_MS) {
        const remaining = MIN_RECORDING_MS - durationMs;
        setTimeout(() => {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
            }
            recordingStartTime = null;
            if (pttDuration) pttDuration.textContent = '';
            setPhase('transcribing');
        }, remaining);
        return;
    }
    
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }
    recordingStartTime = null;
    if (pttDuration) {
        pttDuration.textContent = '';
    }
    setPhase('transcribing');
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
            // Don't trigger if not in idle state
            if (getPhase() !== 'idle') return;

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


async function speak(text) {
    if (!ttsReady || !ttsWorker || !systemReady) {
        console.warn('TTS not ready');
        return;
    }

    return new Promise((resolve) => {
        speechQueue.push({ text, onComplete: resolve });
        processQueue();
    });
}

async function processQueue() {
    if (isSpeaking || speechQueue.length === 0) return;

    isSpeaking = true;
    const item = speechQueue.shift();
    const text = typeof item === 'string' ? item : item.text;
    const onComplete = typeof item === 'object' ? item.onComplete : null;

    setVoiceStatus('SPEAKING', true);
    setVoiceTranscript(text);

    try {
        // Send to TTS worker and wait for completion
        await new Promise((resolve) => {
            pendingSpeechResolve = resolve;
            ttsWorker.postMessage({ type: 'synthesize', text, voice: 'M1' });
        });
    } catch (error) {
        console.error('Speech generation failed:', error);
    }

    isSpeaking = false;
    setVoiceStatus('ONLINE', false);
    
    // Call completion callback if provided
    if (onComplete) {
        onComplete();
    }

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

function launchOracle() {
    // Hide name entry if visible
    if (nameEntryOverlay) {
        nameEntryOverlay.classList.add('hidden');
    }

    setSystemStatus('READY');

    // Setup PTT listeners
    setupPTTListeners();

    // Setup text input
    if (textInput) {
        textInput.disabled = false;
        textInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const message = textInput.value.trim();
                if (message) {
                    textInput.value = '';
                    updatePTTTranscript(message);
                    askQuestion(message);
                }
            }
        });
    }

    // Start background music loop (runs continuously)
    Tone.Transport.bpm.value = 90;
    bgMusicSeq.start(0);
    Tone.Transport.start();

    // Initialize the Magic 8 Ball with ShaderToy
    initMagic8Ball('shaderCanvas', {
        speak
    });

    // Update sidebar with user info
    if (seekerName) {
        seekerName.textContent = ballState.userName || '---';
    }
    if (seekerZodiac) {
        seekerZodiac.textContent = ballState.userZodiac || '---';
    }

    // Initial greeting
    speak("The oracle awakens. Ask me your question!");
}


// Enable start button when name is filled
function checkFormValidity() {
    const nameValid = playerNameInput && playerNameInput.value.trim().length > 0;
    startLoadBtn.disabled = !nameValid;
}

if (playerNameInput) {
    playerNameInput.addEventListener('input', checkFormValidity);
}
// Birthday input removed - keeping reference for compatibility
if (playerBirthdayInput) {
    playerBirthdayInput.addEventListener('input', checkFormValidity);
}

// Wait for user to click start button before initializing
// This is required for AudioContext to work (needs user gesture)
startLoadBtn.addEventListener('click', async () => {
    // Get user info before hiding overlay
    const name = playerNameInput ? playerNameInput.value.trim() : 'Seeker';

    // Set user info (no birthday/zodiac)
    setUserInfo(name, '');

    startOverlay.classList.add('hidden');
    loadingOverlay.classList.remove('hidden');

    // Reset progress tracker
    currentLoadingProgress = 0;

    // Start AudioContext with user gesture
    await Tone.start();
    console.log('AudioContext started after user gesture');

    initializeModels();
});

// Hot Module Replacement for voice effects
if (import.meta.hot) {
    import.meta.hot.accept('./voiceEffects.js', (newModule) => {
        if (newModule && effectNodes) {
            const p = newModule.effectParams;
            
            // Update effect parameters
            if (effectNodes.pitchShift) {
                effectNodes.pitchShift.pitch = p.pitchShift.pitch;
                effectNodes.pitchShift.windowSize = p.pitchShift.windowSize;
            }
            if (effectNodes.chorus) {
                effectNodes.chorus.frequency.value = p.chorus.frequency;
                effectNodes.chorus.delayTime = p.chorus.delayTime;
                effectNodes.chorus.depth = p.chorus.depth;
                effectNodes.chorus.wet.value = p.chorus.wet;
            }
            if (effectNodes.phaser) {
                effectNodes.phaser.frequency.value = p.phaser.frequency;
                effectNodes.phaser.octaves = p.phaser.octaves;
                effectNodes.phaser.baseFrequency = p.phaser.baseFrequency;
                effectNodes.phaser.wet.value = p.phaser.wet;
            }
            if (effectNodes.distortion) {
                effectNodes.distortion.distortion = p.distortion.distortion;
                effectNodes.distortion.wet.value = p.distortion.wet;
            }
            if (effectNodes.bitcrusher) {
                effectNodes.bitcrusher.bits.value = p.bitcrusher.bits;
                effectNodes.bitcrusher.wet.value = p.bitcrusher.wet;
            }
            if (effectNodes.eq) {
                effectNodes.eq.low.value = p.eq.low;
                effectNodes.eq.mid.value = p.eq.mid;
                effectNodes.eq.high.value = p.eq.high;
            }
            if (effectNodes.compressor) {
                effectNodes.compressor.threshold.value = p.compressor.threshold;
                effectNodes.compressor.ratio.value = p.compressor.ratio;
                effectNodes.compressor.attack.value = p.compressor.attack;
                effectNodes.compressor.release.value = p.compressor.release;
            }
            if (effectNodes.delay) {
                effectNodes.delay.delayTime.value = p.delay.delayTime;
                effectNodes.delay.feedback.value = p.delay.feedback;
                effectNodes.delay.wet.value = p.delay.wet;
            }
            if (effectNodes.reverb) {
                effectNodes.reverb.wet.value = p.reverb.wet;
                // Note: decay and preDelay require regenerating the reverb
            }
            
            // Update gain nodes
            if (effectNodes.vocoderOut) effectNodes.vocoderOut.gain.value = p.vocoderOutGain;
            if (effectNodes.dryMix) effectNodes.dryMix.gain.value = p.dryMixGain;
            if (effectNodes.bgMusicGain) effectNodes.bgMusicGain.gain.value = p.bgMusicGain;
            
            console.log('[HMR] Voice effects hot-reloaded!');
        }
    });
}
