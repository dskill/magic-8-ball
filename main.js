import { loadTextToSpeech, loadVoiceStyle, writeWavFile } from './helper.js';
import * as Tone from 'tone';

// State
let tts = null;
let cfgs = null;
let currentStyle = null;
let currentStylePath = 'assets/voice_styles/M1.json';

// Tone.js DSP chain
let player = null;
let effectsChain = null;

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

        showStatus('Ready to generate speech!', 'success');
        generateBtn.disabled = false;

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
            wet: 0.25
        });

        // Bitcrusher for digital/robotic artifacts
        const bitcrusher = new Tone.BitCrusher({
            bits: 6,
            wet: 0.02
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
            delayTime: 0.08,
            feedback: 0.15,
            wet: 0.5
        });

        // Chain: input -> pitchShift -> chorus -> phaser -> distortion ->
        //        chebyshev -> bitcrusher -> eq -> compressor -> delay -> reverb -> output
        effectsChain = {
            input: pitchShift,
            nodes: [pitchShift, chorus, phaser, distortion, chebyshev, bitcrusher, eq, compressor, delay, reverb]
        };

        // Connect the chain
        pitchShift.connect(chorus);
        chorus.connect(phaser);
        phaser.connect(distortion);
        distortion.connect(chebyshev);
        chebyshev.connect(bitcrusher);
        bitcrusher.connect(eq);
        eq.connect(compressor);
        compressor.connect(delay);
        delay.connect(reverb);
        reverb.toDestination();
    }

    // Create player and connect to effects chain
    player = new Tone.Player(audioUrl).connect(effectsChain.input);

    // Wait for buffer to load then play
    await Tone.loaded();
    player.start();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
