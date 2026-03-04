const express = require('express');
const { PollyClient, SynthesizeSpeechCommand } = require('@aws-sdk/client-polly');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
const port = 8090;

app.use(cors());
app.use(express.json());

const profiles = require('./profiles');

// Profile Initialization
let activeProfileName = 'catgirl';
const args = process.argv.slice(2);
const profileArg = args.find(arg => arg.startsWith('--profile='));
if (profileArg) {
    activeProfileName = profileArg.split('=')[1];
}

const profile = profiles[activeProfileName] || profiles.catgirl;
console.log(`[${new Date().toISOString()}] Starting with profile: ${activeProfileName}`);

// AWS Polly Client Setup
const polly = new PollyClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

const EMOJI_REGEX = /[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Emoji}\uFE0F]+/gu;

function sanitizePollyText(input) {
    if (!input) return '';
    console.log(`[${new Date().toISOString()}] Polly raw input: ${input}`);

    let processed = input;

    // Replace variations of "hmph", "mph", "mmph", "humpf", "hoomp" with the profile's specified sound
    // - m+p+h+: mph, mmph
    // - h+u*m+p*[hf]+: humf, hmph, humph, hmpf, humpf
    // - h+u+h+m+p+: huhmp
    // - h+o+m+p+: hoomp
    const hmphRegex = /\b(m+p+h+|h+u*m+p*[hf]+|h+u+h+m+p+|h+o+m+p+)\b/gi;
    if (profile.hmph) {
        processed = processed.replace(hmphRegex, profile.hmph);
    }

    // Apply profile-specific emoticon replacements
    if (profile.emoticons) {
        profile.emoticons.forEach(rule => {
            processed = processed.replace(rule.pattern, rule.replacement);
        });
    }

    const stripped = processed.replace(EMOJI_REGEX, ' ');
    if (stripped !== processed) {
        console.log(`[${new Date().toISOString()}] Polly removed emoji from input.`);
    }
    const normalized = stripped.replace(/\s+/g, ' ').trim();
    console.log(`[${new Date().toISOString()}] Polly sanitized input: ${normalized}`);
    return normalized;
}

/**
 * Converts text into SSML, applying emotional formatting and a global baseline.
 */
function convertToSSML(text) {
    // 1. Escape XML special characters
    let processed = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

    // 2. PHASE 1 EFFECTS & FORMATTING

    // *narrative* -> Dynamic settings from profile
    const nr = profile.narrative.rate;
    const nv = profile.narrative.volume;
    processed = processed.replace(/\*([^*]+)\*/g, `<break time="400ms"/><prosody rate="${nr}" volume="${nv}"> $1 </prosody><break time="400ms"/>`);

    // ~ (Tilde) -> Random choice from profile
    processed = processed.replace(/~/g, () => {
        const choices = profile.tilde;
        const choice = choices[Math.floor(Math.random() * choices.length)];
        return ` <break time="200ms"/> ${choice} `;
    });

    // (text) or [text] -> Mutters / Inner thoughts (Very soft, slightly faster)
    processed = processed.replace(/(\([^)]+\)|\[[^\]]+\])/g, '<prosody volume="x-soft" rate="fast"> $1 </prosody>');

    // ... (Ellipsis) -> Dramatic pause
    processed = processed.replace(/\.\.\./g, '<break time="600ms"/> ');

    // ALL CAPS words (Yelling) -> Loud, emphatic (excluding single letters like 'I' or 'A')
    processed = processed.replace(/\b([A-Z]{2,})\b/g, (match) => {
        return `<prosody volume="x-loud" rate="fast">${match.toLowerCase()}</prosody>`;
    });

    // We removed the aggressive sentence splitting for ! and ? because breaking the string
    // apart into SSML chunks was causing the Neural engine to stutter and repeat syllables.

    // Instead, we just make isolated exclamation marks slightly punchier by slowing the word 
    // right before it using regex, if we wanted to. For now, Neural handles ! well enough naturally.

    // 3. GLOBAL BASELINE
    // Apply 110% speed to match fast reading and apply DRC for laptop-friendly podcast presence.
    return `<speak version="1.1" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
        <amazon:effect name="drc">
            <prosody rate="110%">
                ${processed}
            </prosody>
        </amazon:effect>
    </speak>`;
}

/**
 * AWS Polly Speech Synthesis
 */
async function synthesizeSpeechPolly(text, voiceId, engine = 'neural', textType = 'ssml') {
    const params = {
        Text: text,
        OutputFormat: 'mp3',
        VoiceId: voiceId,
        Engine: engine,
        TextType: textType
    };

    try {
        const command = new SynthesizeSpeechCommand(params);
        const response = await polly.send(command);

        // Convert stream to Buffer
        const stream = response.AudioStream;
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        return Buffer.concat(chunks);
    } catch (error) {
        console.error('Polly Error:', error);
        throw error;
    }
}

/**
 * OpenAI-Compatible Endpoint
 */
app.post('/v1/audio/speech', async (req, res) => {
    const { input } = req.body;
    if (typeof input !== 'string' || !input.trim()) {
        return res.status(400).json({ error: 'Invalid input text' });
    }
    const sanitized = sanitizePollyText(input);

    try {
        const ssml = convertToSSML(sanitized);
        const voiceId = 'Ivy';
        const engine = 'neural';

        console.log(` Generating speech via SSML (Voice: ${voiceId})`);
        const buffer = await synthesizeSpeechPolly(ssml, voiceId, engine, 'ssml');

        res.set({
            'Content-Type': 'audio/mpeg'
        });
        res.send(buffer);

    } catch (error) {
        console.error('Synthesis Error:', error);
        res.status(500).json({ error: 'Polly Synthesis Failed', details: error.message });
    }
});

app.listen(port, () => {
    console.log(`AWS Polly TTS server listening on port ${port}`);
});
