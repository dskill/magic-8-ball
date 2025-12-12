/**
 * ShaderToy shaders for Magic 8 Ball
 * BufferA: "Creation by Silexars" with noise distortion
 * Image: ASCII conversion shader with response text mode
 */

// BufferA - Animated plasma effect with simplex noise
export const bufferAShader = `
precision mediump float;

#define TWOPI 6.28318530718

vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
    return mod289(((x * 34.0) + 10.0) * x);
}

vec4 taylorInvSqrt(vec4 r) {
    return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    // First corner
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    // Other corners
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = vec3(1.0) - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = vec4(1.0) - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    // Normalise gradients
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    // Mix final noise value
    vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;

    return 105.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

// http://www.pouet.net/prod.php?which=57245
// If you intend to reuse this shader, please add credits to 'Danilo Guanabara'

#define t iTime
#define r iResolution.xy

void mainImage( out vec4 fragColor, in vec2 fragCoord ){
    vec3 c;
    float l, z = t;
    
    vec2 uv0 = fragCoord.xy / r;
    
    // Audio-reactive parameters
    float amp = iAudioAmplitude;
    
    // Base values + audio modulation
    float noiseStrength = 0.16 + amp * 0.005;      // More distortion when speaking
    float noiseScale = 0.001 + amp * 0.00002;      // Larger noise scale when speaking
    float speed = 0.1 + amp * 0.05;               // Faster animation when speaking
    float swirlIntensity = 1.0 + amp * .3;      // More intense swirl when speaking
    
    float noiseTime = iTime * speed;

    float noise = snoise(vec3(
        (fragCoord.x - iResolution.x/2.) * noiseScale,
        (fragCoord.y - iResolution.y/2.) * noiseScale,
        noiseTime
    ));
    
    uv0.x = fract(uv0).x + noiseStrength * sin(noise * TWOPI);
    uv0.y = fract(uv0).y + noiseStrength * cos(noise * TWOPI);
    
    //
    
    for(int i = 0; i < 3; i++) {
        vec2 uv, p = uv0;
        uv = p;
        p -= .5;
        p.x *= r.x / r.y;
        z += .03;
        l = length(p);
        // Audio-reactive swirl intensity
        uv += p / l * (sin(z)+1.)*abs(sin(l*9.-z-z)) * swirlIntensity;
        c[i] = .05/length(mod(uv,1.)-.5);
    }
    
    // Boost brightness slightly when speaking
    c *= (1.0 + amp * 0.5);
    
    fragColor=vec4(c/l,t);
}
`;

// Image shader - ASCII conversion with response text mode
// Fork of "Creation by Silexars" by Danguafer
// Bitmap to ASCII fragment shader by movAX13h, September 2013
export const imageShader = `
// 5x5 bitmap character function (original with horizontal flip)
float character(int n, vec2 p)
{
    p = floor(p*vec2(-4.0, 4.0) + 2.5);
    if (clamp(p.x, 0.0, 4.0) == p.x)
    {
        if (clamp(p.y, 0.0, 4.0) == p.y)	
        {
            int a = int(round(p.x) + 5.0 * round(p.y));
            if (((n >> a) & 1) == 1) return 1.0;
        }	
    }
    return 0.0;
}

// Character function without flips (for response text)
// Uses positive X (no horizontal flip) and negative Y (correct vertical orientation)
float characterNoFlip(int n, vec2 p)
{
    p = floor(p*vec2(4.0, -4.0) + 2.5);
    if (clamp(p.x, 0.0, 4.0) == p.x)
    {
        if (clamp(p.y, 0.0, 4.0) == p.y)	
        {
            int a = int(round(p.x) + 5.0 * round(p.y));
            if (((n >> a) & 1) == 1) return 1.0;
        }	
    }
    return 0.0;
}

// Letter bitmaps (5x5 grid encoded as int)
// For characterNoFlip: bit index = x + 5*y
// x=0 is left column, y=0 is top row
const int CHAR_Y = 4329809;    // Y
const int CHAR_E = 31505471;   // E  
const int CHAR_S = 16267326;   // S
const int CHAR_N = 18667121;   // N
const int CHAR_O = 15255086;   // O
const int CHAR_M = 18405233;   // M
const int CHAR_A = 18415150;   // A
const int CHAR_B = 16301615;   // B
const int CHAR_L = 31491105;   // L
const int CHAR_T = 4329631;    // T
const int CHAR_R = 25345583;   // R

// Get character for "YES" (length 3)
int getYesChar(int idx) {
    if (idx == 0) return CHAR_Y;
    if (idx == 1) return CHAR_E;
    return CHAR_S;
}

// Get character for "NO" (length 2)
int getNoChar(int idx) {
    if (idx == 0) return CHAR_N;
    return CHAR_O;
}

// Get character for "MAYBE" (length 5)
int getMaybeChar(int idx) {
    if (idx == 0) return CHAR_M;
    if (idx == 1) return CHAR_A;
    if (idx == 2) return CHAR_Y;
    if (idx == 3) return CHAR_B;
    return CHAR_E;
}

// Get character for "LATER" (length 5)
int getLaterChar(int idx) {
    if (idx == 0) return CHAR_L;
    if (idx == 1) return CHAR_A;
    if (idx == 2) return CHAR_T;
    if (idx == 3) return CHAR_E;
    return CHAR_R;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 pix = fragCoord.xy;
    vec3 col = texture(iChannel0, floor(pix/32.0)*32.0/iResolution.xy).rgb;	
    
    float gray = 0.3 * col.r + 0.59 * col.g + 0.11 * col.b;
        
    int n = 4096;
    
    // Check if we're in response mode
    if (iResponseMode > 0) {
        // Calculate which character in the pattern based on x position
        // Each character cell is 32 pixels wide
        int charCell = int(floor(pix.x / 32.0));
        
        // Get the appropriate character based on response mode
        if (iResponseMode == 1) {
            // YES - 3 characters
            int idx = int(mod(float(charCell), 3.0));
            n = getYesChar(idx);
        } else if (iResponseMode == 2) {
            // NO - 2 characters  
            int idx = int(mod(float(charCell), 2.0));
            n = getNoChar(idx);
        } else if (iResponseMode == 3) {
            // MAYBE - 5 characters
            int idx = int(mod(float(charCell), 5.0));
            n = getMaybeChar(idx);
        } else if (iResponseMode == 4) {
            // LATER - 5 characters
            int idx = int(mod(float(charCell), 5.0));
            n = getLaterChar(idx);
        }
    } else {
        // Normal ASCII mode - character based on brightness
        // full character set including A-Z and 0-9
        if (gray > 0.0233) n = 4096;
        if (gray > 0.0465) n = 131200;
        if (gray > 0.0698) n = 4329476;
        if (gray > 0.0930) n = 459200;
        if (gray > 0.1163) n = 4591748;
        if (gray > 0.1395) n = 12652620;
        if (gray > 0.1628) n = 14749828;
        if (gray > 0.1860) n = 18393220;
        if (gray > 0.2093) n = 15239300;
        if (gray > 0.2326) n = 17318431;
        if (gray > 0.2558) n = 32641156;
        if (gray > 0.2791) n = 18393412;
        if (gray > 0.3023) n = 18157905;
        if (gray > 0.3256) n = 17463428;
        if (gray > 0.3488) n = 14954572;
        if (gray > 0.3721) n = 13177118;
        if (gray > 0.3953) n = 6566222;
        if (gray > 0.4186) n = 16269839;
        if (gray > 0.4419) n = 18444881;
        if (gray > 0.4651) n = 18400814;
        if (gray > 0.4884) n = 33061392;
        if (gray > 0.5116) n = 15255086;
        if (gray > 0.5349) n = 32045584;
        if (gray > 0.5581) n = 18405034;
        if (gray > 0.5814) n = 15022158;
        if (gray > 0.6047) n = 15018318;
        if (gray > 0.6279) n = 16272942;
        if (gray > 0.6512) n = 18415153;
        if (gray > 0.6744) n = 32641183;
        if (gray > 0.6977) n = 32540207;
        if (gray > 0.7209) n = 18732593;
        if (gray > 0.7442) n = 18667121;
        if (gray > 0.7674) n = 16267326;
        if (gray > 0.7907) n = 32575775;
        if (gray > 0.8140) n = 15022414;
        if (gray > 0.8372) n = 15255537;
        if (gray > 0.8605) n = 32032318;
        if (gray > 0.8837) n = 32045617;
        if (gray > 0.9070) n = 33081316;
        if (gray > 0.9302) n = 32045630;
        if (gray > 0.9535) n = 33061407;
        if (gray > 0.9767) n = 11512810;
    }
    
    vec2 p = mod(pix/16.0, 2.0) - vec2(1.0);
    
    // In response mode, use non-flipped character rendering
    if (iResponseMode > 0) {
        col = col * characterNoFlip(n, p);
    } else {
        // Normal mode: click for B&W, otherwise colored (uses original flipped rendering)
        if (iMouse.z > 0.5) col = vec3(character(n, p));
        else col = col * character(n, p);
    }
    
    fragColor = vec4(col, 1.0);
}
`;
