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

const profiles = require('./profiles');
const profile = profiles.catgirl;

// Assuming server.js is in the same directory, we can copy the logic here to test it independently
// Or we just redefine it here to ensure we generate exactly what the server would output
function convertToSSML(text) {
    // 0. Emoticon & Vocalization sanitation (Matches server.js sanitizePollyText)
    text = text.replace(/\bHR\b/g, 'H.R.');
    text = text.replace(/\bIT\b/g, 'I.T.');
    const hmphRegex = /\b(m+p+h+|h+u*m+p*[hf]+|h+u+h+m+p+|h+o+m+p+)\b/gi;
    if (profile.hmph) text = text.replace(hmphRegex, profile.hmph);

    if (profile.emoticons) {
        profile.emoticons.forEach(rule => {
            text = text.replace(rule.pattern, rule.replacement);
        });
    }

    let processed = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

    processed = processed.replace(/\*([^*]+)\*/g, '<break time="400ms"/><prosody rate="x-slow" volume="soft"> $1 </prosody><break time="400ms"/>');
    processed = processed.replace(/~/g, () => {
        const repeat = Math.random() > 0.5 ? 'nyan' : 'nyan nyan';
        return ` <break time="200ms"/> ${repeat} `;
    });
    processed = processed.replace(/(\([^)]+\)|\[[^\]]+\])/g, '<prosody volume="x-soft" rate="fast"> $1 </prosody>');
    processed = processed.replace(/\.\.\./g, '<break time="600ms"/> ');

    processed = processed.replace(/\b([A-Z]{2,})\b/g, (match) => {
        return `<prosody volume="x-loud" rate="fast">${match.toLowerCase()}</prosody>`;
    });

    return `<speak version="1.1" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
        <amazon:effect name="drc">
            <prosody rate="110%">
                ${processed}
            </prosody>
        </amazon:effect>
    </speak>`;
}

async function runPhase1Test() {
    const rawText = "0_0 Oh, Richy... giggle. 0_0 Aww, Richy! Come back!";

    const ssml = convertToSSML(rawText);

    console.log("\n----- GENERATED SSML -----");
    console.log(ssml);
    console.log("\n--------------------------");

    const params = {
        Text: ssml,
        OutputFormat: 'mp3',
        VoiceId: 'Ivy',
        Engine: 'neural',
        TextType: 'ssml'
    };

    try {
        console.log("Generating sample_phase1_final.mp3...");
        const response = await polly.send(new SynthesizeSpeechCommand(params));
        const stream = response.AudioStream;
        const chunks = [];
        for await (const chunk of stream) { chunks.push(chunk); }
        fs.writeFileSync("sample_phase1_final.mp3", Buffer.concat(chunks));
        console.log("Saved: sample_phase1_final.mp3");

    } catch (error) {
        console.error("Error generating sample:", error.name, error.message);
    }
}

runPhase1Test();
