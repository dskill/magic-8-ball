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

async function hasFp16() {
    try {
        const adapter = await navigator.gpu.requestAdapter();
        return adapter.features.has('shader-f16');
    } catch (e) {
        return false;
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

        // Use q4f16 for WebGPU (quantized, fast)
        this.model ??= AutoModelForCausalLM.from_pretrained(this.model_id, {
            dtype: 'q4f16',
            device: 'webgpu',
            progress_callback,
        });

        return Promise.all([this.tokenizer, this.model]);
    }
}

async function generate(messages) {
    const [tokenizer, model] = await TextGenerationPipeline.getInstance();

    const inputs = tokenizer.apply_chat_template(messages, {
        add_generation_prompt: true,
        return_dict: true,
        // Enable thinking mode - we'll parse out the response after </think>
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
        max_new_tokens: 1024,  // Plenty of room for thinking + response
        do_sample: true,
        temperature: 0.7,
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
