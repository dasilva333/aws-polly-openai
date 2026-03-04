const { PollyClient, SynthesizeSpeechCommand } = require('@aws-sdk/client-polly');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

const polly = new PollyClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

/**
 * Generates an MP3 file from SSML.
 * 
 * @param {string} text The base text to synthesize (for logging purposes)
 * @param {string} ssmlBody The SSML content to be wrapped in <speak> tags
 * @param {string} filename Output mp3 filename
 */
async function testVoiceConfig(text, ssmlBody, engine, filename) {
    const ssml = `<speak version="1.1" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
        ${ssmlBody}
    </speak>`;

    const params = {
        Text: ssml,
        OutputFormat: 'mp3',
        VoiceId: 'Ivy',
        Engine: engine,
        TextType: 'ssml'
    };

    try {
        console.log(`Generating ${filename} [Engine: ${engine}]...`);
        const command = new SynthesizeSpeechCommand(params);
        const response = await polly.send(command);

        const stream = response.AudioStream;
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }

        fs.writeFileSync(filename, Buffer.concat(chunks));
        console.log(`Saved: ${filename}`);
    } catch (error) {
        console.error(`Error generating ${filename}:`, error.name, error.message);
    }
}

async function runTests() {
    const testText = "Hello! I am Ivy. This is a test of my voice using the standard engine to see if I can change my pitch.";

    // 1. Baseline Standard Engine
    await testVoiceConfig(testText, testText, "standard", "ivy_std_baseline.mp3");

    // 2. Standard Engine with Rate & DRC (to compare against Neural)
    await testVoiceConfig(testText, `<amazon:effect name="drc"><prosody rate="110%">${testText}</prosody></amazon:effect>`, "standard", "ivy_std_drc_110.mp3");

    // 3. Pitch changes (Standard engine SHOULD support this)
    await testVoiceConfig(testText, `<prosody pitch="+5%">${testText}</prosody>`, "standard", "ivy_std_pitch_up5.mp3");
    await testVoiceConfig(testText, `<prosody pitch="+10%">${testText}</prosody>`, "standard", "ivy_std_pitch_up10.mp3");
    await testVoiceConfig(testText, `<prosody pitch="-5%">${testText}</prosody>`, "standard", "ivy_std_pitch_down5.mp3");

    console.log("All tests complete!");
}

runTests();
