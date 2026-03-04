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

const testWords = [
    "howmf",
    "houmf",
    "hawmf",
    "hahmf",
    "heumf",
    "homf",
    "haumf",
    "humff"
];

async function runMphTest() {
    let ssmlContent = testWords.map((word, index) => {
        return `Number ${index + 1}. <break time="200ms"/> ${word}. <break time="600ms"/>`;
    }).join(' ');

    const finalSSML = `<speak version="1.1" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
        <amazon:effect name="drc">
            <prosody rate="110%">
                Here is the blind test for the sound. <break time="800ms"/>
                ${ssmlContent}
            </prosody>
        </amazon:effect>
    </speak>`;

    console.log("----- GENERATED SSML -----");
    console.log(finalSSML);

    const params = {
        Text: finalSSML,
        OutputFormat: 'mp3',
        VoiceId: 'Ivy',
        Engine: 'neural',
        TextType: 'ssml'
    };

    try {
        console.log("Generating test_mph_sounds.mp3...");
        const response = await polly.send(new SynthesizeSpeechCommand(params));
        const stream = response.AudioStream;
        const chunks = [];
        for await (const chunk of stream) { chunks.push(chunk); }
        fs.writeFileSync("test_mph_sounds.mp3", Buffer.concat(chunks));
        console.log("Saved: test_mph_sounds.mp3");

    } catch (error) {
        console.error("Error generating sample:", error.name, error.message);
    }
}

runMphTest();
