# OpenClaw AWS Polly TTS Bridge

A lightweight Express server that provides an OpenAI-compatible `/v1/audio/speech` endpoint for AWS Polly, designed specifically for use with OpenClaw.

## Features
- **OpenAI Compatibility**: Seamlessly drops into any application expecting the OpenAI TTS API.
- **SSML Narrative Narration**: Automatically detects text inside `*asterisks*` and applies prosody effects (slower rate, softer volume) to create distinct "narrative" voices.
- **Neural Engine Support**: Optimized for high-quality AWS Polly Neural voices.

## 🛠️ Setup & Installation

### 1. AWS Credentials
To use this bridge, you need an AWS IAM user with `AmazonPollyFullAccess`.
- Go to the [AWS Management Console](https://console.aws.amazon.com/).
- Navigate to **IAM** -> **Users** -> **Create User**.
- Attach the `AmazonPollyFullAccess` policy.
- Create an **Access Key** for the user and save the `Access Key ID` and `Secret Access Key`.

### 2. Clone and Install
```bash
git clone https://github.com/dasilva333/openclaw-aws-polly.git
cd openclaw-aws-polly
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_REGION=us-east-1
```

## 🚀 Usage

Start the server:
```bash
npm start
```
The server will be listening at `http://localhost:8090`.

## ⚙️ OpenClaw Configuration

To connect OpenClaw to this bridge, use the following environment variable configuration in your OpenClaw setup:

```json
{
  "env": {
    "vars": {
      "OPENAI_TTS_BASE_URL": "http://host.docker.internal:8090/v1",
      "OPENAI_API_KEY": "bridge-local"
    }
  }
}
```

> [!NOTE]
> The `OPENAI_API_KEY` is a placeholder required by the client; this bridge does not check it, so any string will work.

### Deployment Tips
- If you are running OpenClaw in Docker, ensure you use `host.docker.internal` (Windows/Mac) or your machine's IP address to reach the bridge.
- If the configuration doesn't take effect, you may need to manually inject these variables into your shell/container environment before the application starts.

## 🎭 SSML Handling
This bridge automatically transforms text like:
`"Hello! *she smiles warmly* How are you today?"`

Into SSML that tells Polly to slow down and soften her voice for the part inside the asterisks, creating a more immersive roleplay experience.
