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

/**
 * Converts text into SSML, wrapping *asterisk blocks* with prosody effects.
 */
function convertToSSML(text) {
    // Escape XML special characters
    const escapedText = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

    // Wrap *narrative* with a dramatic pause and x-slow rate
    const ssmlContent = escapedText.replace(/\*([^*]+)\*/g, '<break time="400ms"/><prosody rate="x-slow" volume="soft"> $1 </prosody><break time="400ms"/>');

    return `<speak version="1.1" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">${ssmlContent}</speak>`;
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
    const { input, voice } = req.body;
    console.log(`[${new Date().toISOString()}] Received request: "${input.substring(0, 50)}..."`);

    try {
        const ssml = convertToSSML(input);
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
