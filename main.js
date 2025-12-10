import { loadTextToSpeech, loadVoiceStyle, writeWavFile } from './helper.js';
import * as Tone from 'tone';

// State
let tts = null;
let cfgs = null;
let currentStyle = null;
let currentStylePath = 'assets/voice_styles/M1.json';

// LLM Worker
let llmWorker = null;
let llmReady = false;
let pendingLLMCallback = null;

// Tone.js DSP chain
let player = null;
let effectsChain = null;
let vocoderCarrier = null;
let vocoderSeq = null;

// DOM Elements
const statusBox = document.getElementById('status');
const statusText = document.getElementById('statusText');
const backendBadge = document.getElementById('backendBadge');
const voiceStyleSelect = document.getElementById('voiceStyle');
const textInput = document.getElementById('textInput');
const stepsInput = document.getElementById('steps');
const speedInput = document.getElementById('speed');
const generateBtn = document.getElementById('generateBtn');
const errorBox = document.getElementById('errorBox');
const resultsDiv = document.getElementById('results');
const placeholder = document.getElementById('placeholder');

function showStatus(message, type = 'info') {
    statusText.textContent = message;
    statusBox.className = 'status-box';
    if (type === 'success') statusBox.classList.add('success');
    if (type === 'error') statusBox.classList.add('error');
}

function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.add('active');
    showStatus('Error occurred', 'error');
}

function clearError() {
    errorBox.textContent = '';
    errorBox.classList.remove('active');
}

function showBackend(backend) {
    backendBadge.textContent = backend;
    backendBadge.classList.add('visible');
}

async function initializeModels() {
    showStatus('Initializing ONNX Runtime...');

    try {
        // Try WebGPU first, fall back to WASM
        let sessionOptions = {};
        let backend = 'webgpu';

        try {
            sessionOptions = { executionProviders: ['webgpu'] };
            const result = await loadTextToSpeech('assets/onnx', sessionOptions, (name, current, total) => {
                showStatus(`Loading ${name} (${current}/${total})...`);
            });
            tts = result.textToSpeech;
            cfgs = result.cfgs;
            showBackend('WebGPU');
        } catch (e) {
            console.log('WebGPU not available, falling back to WASM:', e);
            backend = 'wasm';
            sessionOptions = { executionProviders: ['wasm'] };
            const result = await loadTextToSpeech('assets/onnx', sessionOptions, (name, current, total) => {
                showStatus(`Loading ${name} (${current}/${total})...`);
            });
            tts = result.textToSpeech;
            cfgs = result.cfgs;
            showBackend('WebAssembly');
        }

        showStatus('Loading voice style...');
        currentStyle = await loadVoiceStyle(currentStylePath);

        showStatus('TTS Ready! Loading LLM...', 'success');
        generateBtn.disabled = false;

        // Start loading the LLM
        initializeLLM();

    } catch (error) {
        console.error('Failed to initialize:', error);
        showError(`Failed to initialize: ${error.message}`);
    }
}

async function loadStyleFromJSON(path) {
    showStatus('Loading voice style...');
    try {
        currentStyle = await loadVoiceStyle(path);
        currentStylePath = path;
        showStatus('Ready to generate speech!', 'success');
    } catch (error) {
        showError(`Failed to load voice style: ${error.message}`);
    }
}

async function generateSpeech() {
    clearError();

    const text = textInput.value.trim();
    if (!text) {
        showError('Please enter some text to synthesize.');
        return;
    }

    if (!tts || !currentStyle) {
        showError('Models not loaded yet. Please wait.');
        return;
    }

    generateBtn.disabled = true;
    placeholder.classList.add('generating');
    placeholder.querySelector('.results-placeholder-icon').textContent = '⏳';
    placeholder.querySelector('p').textContent = 'Generating speech...';

    const totalStep = parseInt(stepsInput.value) || 5;
    const speed = parseFloat(speedInput.value) || 1.2;

    const startTime = performance.now();

    try {
        showStatus('Generating speech...');

        const { wav, duration } = await tts.call(text, currentStyle, totalStep, speed, 0.3, (step, total) => {
            showStatus(`Denoising step ${step}/${total}...`);
        });

        const endTime = performance.now();
        const generationTime = ((endTime - startTime) / 1000).toFixed(2);
        const audioDuration = duration[0].toFixed(2);
        const rtf = (generationTime / duration[0]).toFixed(3);

        // Truncate WAV to actual duration
        const sampleRate = cfgs.ae.sample_rate;
        const expectedSamples = Math.floor(duration[0] * sampleRate);
        const truncatedWav = wav.slice(0, expectedSamples);

        // Create WAV file
        const wavData = writeWavFile(truncatedWav, sampleRate);
        const blob = new Blob([wavData], { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(blob);

        // Display result
        displayResult(text, audioUrl, {
            generationTime,
            audioDuration,
            rtf,
            characters: text.length
        });

        showStatus(`Generated ${audioDuration}s of audio in ${generationTime}s (RTF: ${rtf})`, 'success');

    } catch (error) {
        console.error('Generation failed:', error);
        showError(`Generation failed: ${error.message}`);
        placeholder.querySelector('.results-placeholder-icon').textContent = '🔊';
        placeholder.querySelector('p').textContent = 'Generated audio will appear here';
    } finally {
        generateBtn.disabled = false;
        placeholder.classList.remove('generating');
    }
}

function displayResult(text, audioUrl, stats) {
    placeholder.classList.add('hidden');

    // Remove any existing result
    const existingResult = document.querySelector('.result-item');
    if (existingResult) existingResult.remove();

    const resultHtml = `
        <div class="result-item">
            <div class="result-text-container">
                <div class="result-text-label">Synthesized Text</div>
                <div class="result-text">${escapeHtml(text)}</div>
            </div>
            <div class="result-info">
                <div class="info-item">
                    <span>Generation Time</span>
                    <strong>${stats.generationTime}s</strong>
                </div>
                <div class="info-item">
                    <span>Audio Duration</span>
                    <strong>${stats.audioDuration}s</strong>
                </div>
                <div class="info-item">
                    <span>Real-Time Factor</span>
                    <strong>${stats.rtf}</strong>
                </div>
                <div class="info-item">
                    <span>Characters</span>
                    <strong>${stats.characters}</strong>
                </div>
            </div>
            <div class="result-player">
                <audio controls src="${audioUrl}"></audio>
            </div>
            <div class="result-actions">
                <button onclick="downloadAudio('${audioUrl}')">Download WAV</button>
            </div>
        </div>
    `;

    resultsDiv.insertAdjacentHTML('beforeend', resultHtml);

    // Play through Tone.js DSP chain
    playWithEffects(audioUrl);
}

async function playWithEffects(audioUrl) {
    // Ensure Tone.js audio context is started (required after user interaction)
    await Tone.start();

    // Dispose previous player if exists
    if (player) {
        player.stop();
        player.dispose();
    }

    // Create effects chain if not exists (GLaDOS/Portal robotic voice)
    if (!effectsChain) {
        // Pitch shift down slightly for that robotic deepness
        const pitchShift = new Tone.PitchShift({
            pitch: -2,
            windowSize: 0.05,
            delayTime: 0,
            feedback: 0
        });

        // Chorus for that synthetic doubling effect
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

        // Subtle distortion for digital grit
        const distortion = new Tone.Distortion({
            distortion: 0.15,
            wet: 0.1
        });

        // Chebyshev waveshaper for harmonic richness
        const chebyshev = new Tone.Chebyshev({
            order: 30,
            wet: 0.0
        });

        // Bitcrusher for digital/robotic artifacts
        const bitcrusher = new Tone.BitCrusher({
            bits: 6,
            wet: 0.1
        });

        // EQ to shape the robotic tone - boost mids, cut lows
        const eq = new Tone.EQ3({
            low: -6,
            mid: 4,
            high: 2,
            lowFrequency: 250,
            highFrequency: 4000
        });

        // Compressor to even out the sound
        const compressor = new Tone.Compressor({
            threshold: -20,
            ratio: 6,
            attack: 0.01,
            release: 0.1
        });

        // Small metallic reverb
        const reverb = new Tone.Reverb({
            decay: 1.5,
            wet: 0.45,
            preDelay: 0.01
        });
        await reverb.generate();

        // Feedback delay for robotic echo
        const delay = new Tone.FeedbackDelay({
            delayTime: 0.04,
            feedback: 0.15,
            wet: 0.2
        });

        // ========== TRUE CHANNEL VOCODER ==========
        // A vocoder works by:
        // 1. Analyzing the voice (modulator) into frequency bands
        // 2. Extracting the amplitude envelope of each band
        // 3. Applying those envelopes to filter the carrier signal
        // The result: carrier provides pitch, voice provides formants/timbre

        // Create carrier synth
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

        // Musical pattern in D minor
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

        // Vocoder bands - focused on human voice range
        // Fundamental: 85-255 Hz (male-female), Formants: 300-3500 Hz
        const numBands = 24;
        const bands = [];
        const minFreq = 150;
        const maxFreq = 1500;

        // Create vocoder channel for each frequency band
        for (let i = 0; i < numBands; i++) {
            // Logarithmic frequency distribution
            const freq = minFreq * Math.pow(maxFreq / minFreq, i / (numBands - 1));
            const Q = 12; // Narrow bands for better resolution

            // MODULATOR PATH (voice): bandpass -> envelope follower
            const modFilter = new Tone.Filter({
                frequency: freq,
                type: 'bandpass',
                Q: Q
            });
            const envelope = new Tone.Follower(0.005); // Fast follower
            const envelopeGain = new Tone.Gain(1); // Boost envelope signal

            // CARRIER PATH: bandpass -> gain (controlled by envelope)
            const carrierFilter = new Tone.Filter({
                frequency: freq,
                type: 'bandpass',
                Q: Q
            });
            const vca = new Tone.Gain(0); // VCA - voltage controlled amp

            // Connect modulator analysis chain
            modFilter.connect(envelope);
            envelope.connect(envelopeGain);
            envelopeGain.connect(vca.gain); // Envelope controls VCA gain

            // Connect carrier synthesis chain
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

        // Output mixer for all vocoder bands
        const vocoderOut = new Tone.Gain(0.5);

        // Connect all VCAs to output
        bands.forEach(band => {
            band.vca.connect(vocoderOut);
        });

        // Dry voice mix
        const dryMix = new Tone.Gain(0.15);

        // Carrier direct (for debugging - set to 0 normally)
        const carrierDirect = new Tone.Gain(0).toDestination();
        vocoderCarrier.connect(carrierDirect);

        // Store vocoder bands
        effectsChain = {
            input: pitchShift,
            bands,
            vocoderOut,
            dryMix,
            nodes: [pitchShift, chorus, phaser, distortion, chebyshev, bitcrusher, eq, compressor, delay, reverb]
        };

        // Connect main effects chain (for voice processing before vocoder)
        pitchShift.connect(chorus);
        chorus.connect(phaser);
        phaser.connect(distortion);
        distortion.connect(chebyshev);
        chebyshev.connect(bitcrusher);
        bitcrusher.connect(eq);

        // Voice (after EQ) goes to all modulator filters
        bands.forEach(band => {
            eq.connect(band.modFilter);
        });

        // Carrier goes to all carrier filters
        bands.forEach(band => {
            vocoderCarrier.connect(band.carrierFilter);
        });

        // Also send some dry voice
        eq.connect(dryMix);

        // Vocoder output and dry mix go to compressor
        vocoderOut.connect(compressor);
        dryMix.connect(compressor);

        compressor.connect(delay);
        delay.connect(reverb);
        reverb.toDestination();
    }

    // Create player and connect to effects chain
    player = new Tone.Player(audioUrl).connect(effectsChain.input);

    // Wait for buffer to load then play
    await Tone.loaded();

    // Set tempo for the vocoder pattern
    Tone.Transport.bpm.value = 90;

    // Start the vocoder carrier sequence
    vocoderSeq.start(0);
    Tone.Transport.start();

    // Start the voice
    player.start();

    // Stop the vocoder when audio ends
    player.onstop = () => {
        Tone.Transport.stop();
        vocoderSeq.stop();
    };
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// LLM Functions
function initializeLLM() {
    showStatus('Initializing Qwen3 0.6B LLM...');

    llmWorker = new Worker(new URL('./llm-worker.js', import.meta.url), {
        type: 'module'
    });

    llmWorker.onmessage = (e) => {
        const { status, data, output, tps, numTokens } = e.data;

        switch (status) {
            case 'loading':
                showStatus(data);
                break;

            case 'initiate':
                if (e.data.file) {
                    showStatus(`Downloading ${e.data.file}...`);
                }
                break;

            case 'progress':
                // Progress reports loaded/total bytes
                if (e.data.file && e.data.loaded !== undefined && e.data.total !== undefined) {
                    const percent = Math.round((e.data.loaded / e.data.total) * 100);
                    const loadedMB = (e.data.loaded / 1024 / 1024).toFixed(1);
                    const totalMB = (e.data.total / 1024 / 1024).toFixed(1);
                    showStatus(`Loading ${e.data.file}: ${loadedMB}/${totalMB} MB (${percent}%)`);
                }
                break;

            case 'done':
                if (e.data.file) {
                    showStatus(`Loaded ${e.data.file}`);
                }
                break;

            case 'ready':
                llmReady = true;
                showStatus('LLM ready! Generating random sentence...', 'success');
                generateRandomSentence();
                break;

            case 'start':
                showStatus('LLM generating...');
                break;

            case 'update':
                // Streaming token update
                if (pendingLLMCallback) {
                    pendingLLMCallback.onUpdate(output, tps, numTokens);
                }
                break;

            case 'complete':
                if (pendingLLMCallback) {
                    pendingLLMCallback.onComplete(output);
                    pendingLLMCallback = null;
                }
                break;
        }
    };

    llmWorker.postMessage({ type: 'load' });
}

function generateText(prompt, onUpdate, onComplete) {
    if (!llmReady) {
        console.error('LLM not ready yet');
        return;
    }

    pendingLLMCallback = { onUpdate, onComplete };

    const messages = [
        { role: 'user', content: prompt }
    ];

    llmWorker.postMessage({ type: 'generate', data: messages });
}

function generateRandomSentence() {
    let generatedText = '';

    generateText(
        'Generate a single short creative sentence (10-20 words) for a text-to-speech demo. Just output the sentence, nothing else.',
        (token, tps, numTokens) => {
            generatedText += token;
            textInput.value = generatedText;
            if (tps) {
                showStatus(`Generating: ${numTokens} tokens (${tps.toFixed(1)} tok/s)`);
            }
        },
        (fullOutput) => {
            // Clean up the output - remove any markdown, quotes, etc.
            let cleanText = generatedText.trim();
            cleanText = cleanText.replace(/^["']|["']$/g, ''); // Remove surrounding quotes
            cleanText = cleanText.replace(/^\*+|\*+$/g, ''); // Remove asterisks
            textInput.value = cleanText;
            showStatus('Ready to generate speech!', 'success');
        }
    );
}

// Global download function
window.downloadAudio = function(url) {
    const a = document.createElement('a');
    a.href = url;
    a.download = 'supertonic-speech.wav';
    a.click();
};

// Event listeners
voiceStyleSelect.addEventListener('change', (e) => {
    loadStyleFromJSON(e.target.value);
});

generateBtn.addEventListener('click', generateSpeech);

// Allow Enter key in textarea to generate (Shift+Enter for newline)
textInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!generateBtn.disabled) {
            generateSpeech();
        }
    }
});

// Initialize on load
initializeModels();
