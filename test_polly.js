const http = require('http');
const fs = require('fs');

const data = JSON.stringify({
    model: "tts-1",
    input: "*The quick brown fox jumps over the lazy dog.* The quick brown fox jumps over the lazy dog.",
    voice: "Ivy",
    speed: 1.0
});

const options = {
    hostname: 'localhost',
    port: 8090,
    path: '/v1/audio/speech',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

console.log('--- Testing AWS Polly Proxy ---');
const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);

    if (res.statusCode !== 200) {
        res.on('data', d => process.stdout.write(d));
        return;
    }

    const fileStream = fs.createWriteStream('polly_test_output.mp3');
    res.pipe(fileStream);

    fileStream.on('finish', () => {
        console.log('Audio saved to polly_test_output.mp3');
        process.exit(0);
    });
});

req.on('error', (error) => {
    console.error('Error:', error);
});

req.write(data);
req.end();
