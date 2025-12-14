import {
    AutoTokenizer,
    AutoModelForCausalLM,
    TextStreamer,
    StoppingCriteria,
} from '@huggingface/transformers';

class CallbackTextStreamer extends TextStreamer {
    constructor(tokenizer, cb) {
        super(tokenizer, {
            skip_prompt: true,
            skip_special_tokens: true,
        });
        this.cb = cb;
    }

    on_finalized_text(text) {
        this.cb(text);
    }
}

class InterruptableStoppingCriteria extends StoppingCriteria {
    constructor() {
        super();
        this.interrupted = false;
    }

    interrupt() {
        this.interrupted = true;
    }

    reset() {
        this.interrupted = false;
    }

    _call(input_ids, scores) {
        return new Array(input_ids.length).fill(this.interrupted);
    }
}

const stopping_criteria = new InterruptableStoppingCriteria();

async function checkWebGPUSupport() {
    try {
        if (!navigator.gpu) {
            console.log('[LLM] WebGPU not available');
            return { available: false, hasFp16: false };
        }
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            console.log('[LLM] No WebGPU adapter found');
            return { available: false, hasFp16: false };
        }
        const hasFp16 = adapter.features.has('shader-f16');
        console.log('[LLM] WebGPU available, fp16:', hasFp16);
        return { available: true, hasFp16 };
    } catch (e) {
        console.log('[LLM] WebGPU check failed:', e.message);
        return { available: false, hasFp16: false };
    }
}

class TextGenerationPipeline {
    static model_id = 'onnx-community/Qwen3-0.6B-ONNX';
    static model = null;
    static tokenizer = null;

    static async getInstance(progress_callback = null) {
        this.tokenizer ??= AutoTokenizer.from_pretrained(this.model_id, {
            progress_callback,
        });

        if (!this.model) {
            const gpu = await checkWebGPUSupport();
            
            if (gpu.available && gpu.hasFp16) {
                // Best case: WebGPU with fp16 support
                console.log('[LLM] Using WebGPU with q4f16');
                this.model = AutoModelForCausalLM.from_pretrained(this.model_id, {
                    dtype: 'q4f16',
                    device: 'webgpu',
                    progress_callback,
                });
            } else if (gpu.available) {
                // WebGPU available but no fp16 - use fp32
                console.log('[LLM] Using WebGPU with fp32 (no fp16 support)');
                this.model = AutoModelForCausalLM.from_pretrained(this.model_id, {
                    dtype: 'fp32',
                    device: 'webgpu',
                    progress_callback,
                });
            } else {
                // Fallback to WASM - let transformers.js auto-select compatible dtype
                // Safari's WASM doesn't support q4 quantization
                console.log('[LLM] Falling back to WASM');
                this.model = AutoModelForCausalLM.from_pretrained(this.model_id, {
                    device: 'wasm',
                    progress_callback,
                });
            }
        }

        return Promise.all([this.tokenizer, this.model]);
    }
}

async function generate(messages) {
    const [tokenizer, model] = await TextGenerationPipeline.getInstance();

    const inputs = tokenizer.apply_chat_template(messages, {
        add_generation_prompt: true,
        return_dict: true,
        enable_thinking: false,
    });

    let startTime;
    let numTokens = 0;
    const cb = (output) => {
        startTime ??= performance.now();

        let tps;
        if (numTokens++ > 0) {
            tps = numTokens / (performance.now() - startTime) * 1000;
        }
        self.postMessage({
            status: 'update',
            output, tps, numTokens,
        });
    }

    const streamer = new CallbackTextStreamer(tokenizer, cb);

    self.postMessage({ status: 'start' });

    const outputs = await model.generate({
        ...inputs,
        max_new_tokens: 128,
        do_sample: true,
        temperature: 0.7,
        top_p: 0.9,
        streamer,
        stopping_criteria,
    });

    const outputText = tokenizer.batch_decode(outputs, { skip_special_tokens: true });

    self.postMessage({
        status: 'complete',
        output: outputText,
    });
}

async function load() {
    self.postMessage({
        status: 'loading',
        data: 'Loading Qwen3 0.6B model...'
    });

    const [tokenizer, model] = await TextGenerationPipeline.getInstance(x => {
        self.postMessage(x);
    });

    self.postMessage({
        status: 'loading',
        data: 'Compiling WebGPU shaders...'
    });

    // Warm up with a simple generation
    const inputs = tokenizer('Hi');
    await model.generate({ ...inputs, max_new_tokens: 1 });

    self.postMessage({ status: 'ready' });
}

self.addEventListener('message', async (e) => {
    const { type, data } = e.data;

    switch (type) {
        case 'load':
            load();
            break;

        case 'generate':
            stopping_criteria.reset();
            generate(data);
            break;

        case 'interrupt':
            stopping_criteria.interrupt();
            break;

        case 'reset':
            stopping_criteria.reset();
            break;
    }
});
