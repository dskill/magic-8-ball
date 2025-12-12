/**
 * Voice Effect Parameters
 * Edit these and save - changes hot-reload without restarting the app!
 */

export const effectParams = {
    pitchShift: {
        pitch: -1.5,
        windowSize: 0.1,
        delayTime: 0,
        feedback: 0
    },
    
    chorus: {
        frequency: 2.5,
        delayTime: 3.5,
        depth: 0.4,
        wet: 0.8
    },
    
    phaser: {
        frequency: 0.5,
        octaves: 3,
        baseFrequency: 800,
        wet: 0.2
    },
    
    distortion: {
        distortion: 0.95,
        wet: 0.0
    },
    
    bitcrusher: {
        bits: 4,
        wet: 0.0
    },
    
    eq: {
        low: -6,
        mid: 4,
        high: 2,
        lowFrequency: 250,
        highFrequency: 4000
    },
    
    compressor: {
        threshold: -20,
        ratio: 6,
        attack: 0.01,
        release: 0.1
    },
    
    reverb: {
        decay: 3.5,
        wet: 0.45,
        preDelay: 0.11
    },
    
    delay: {
        delayTime: 0.4,
        feedback: 0.7,
        wet: 0.1
    },
    
    // Mix levels
    vocoderOutGain: 0.0,
    dryMixGain: 0.15,
    bgMusicGain: 0.15
};
