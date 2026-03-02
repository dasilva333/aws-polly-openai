const express = require('express');
const { PollyClient, SynthesizeSpeechCommand } = require('@aws-sdk/client-polly');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
const port = 8090;

app.use(cors());
app.use(express.json());

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
    const stripped = input.replace(EMOJI_REGEX, ' ');
    if (stripped !== input) {
        console.log(`[${new Date().toISOString()}] Polly removed emoji from input.`);
    }
    const normalized = stripped.replace(/\s+/g, ' ').trim();
    console.log(`[${new Date().toISOString()}] Polly sanitized input: ${normalized}`);
    return normalized;
}

/**
 * Converts text into SSML, wrapping *asterisk blocks* with prosody effects.
 */
function convertToSSML(text) {
    // Escape XML special characters
    let processed = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

    // Wrap *narrative* with a dramatic pause and x-slow rate
    processed = processed.replace(/\*([^*]+)\*/g, '<break time="400ms"/><prosody rate="x-slow" volume="soft"> $1 </prosody><break time="400ms"/>');

    // Handle ~ (Tilde) -> Pause + "glitch"
    processed = processed.replace(/~/g, ' <break time="200ms"/> glitch ');

    return `<speak version="1.1" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">${processed}</speak>`;
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
