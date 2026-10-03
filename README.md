# MusicGPT MCP Server

A Model Context Protocol (MCP) server for the [MusicGPT API](https://musicgpt.com/), providing AI-powered audio generation and processing capabilities.

## Features

### Music Generation
- **Generate Music**: Create custom music from text prompts with optional lyrics
- **Cover Songs**: Create cover versions with different voices
- **Sound Effects**: Generate sound effects from descriptions
- **Lyrics Generation**: Generate song lyrics based on themes

### Voice & Speech
- **Voice Changer**: Convert audio to different AI voices
- **Text-to-Speech**: Convert text to natural-sounding speech
- **Voice Library**: Access 3000+ AI voices

### Audio Processing
- **Audio Extraction**: Isolate vocals, instruments, or specific stems
- **Denoise/Deecho/Dereverb**: Clean up audio recordings
- **Audio Mastering**: Professional-quality audio mastering
- **Format Conversion**: Convert between audio formats

### Audio Manipulation
- **Audio Cutter**: Trim audio to specific durations
- **Speed Changer**: Adjust playback speed
- **Remix**: Create remixes of tracks
- **Extend**: AI-powered audio extension
- **Inpaint**: Fill gaps in audio
- **Sing Over Instrumental**: Add AI vocals to instrumentals

### Analysis Tools
- **Transcription**: Convert speech to text
- **Key & BPM Detection**: Extract musical key and tempo
- **Audio to MIDI**: Convert audio to MIDI format

## Installation

```bash
npm install mcp-server-musicgpt
```

Or install from source:

```bash
git clone https://github.com/pasie15/mcp-server-musicgpt.git
cd mcp-server-musicgpt
npm install
npm run build
```

## Configuration

### Get Your API Key

1. Visit [MusicGPT API Dashboard](https://musicgpt.com/api-dashboard)
2. Sign up for an account
3. Generate your API key

### Environment Variables

Set the following environment variable:

```bash
export MUSICGPT_API_KEY="your_api_key_here"
```

Optional configuration:

```bash
export MUSICGPT_BASE_URL="https://api.musicgpt.com/api/public/v1"  # Default
export MUSICGPT_TIMEOUT="60000"  # Timeout in milliseconds (default: 60000)
```

## Usage with MCP Clients

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "musicgpt": {
      "command": "npx",
      "args": ["-y", "mcp-server-musicgpt"],
      "env": {
        "MUSICGPT_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

<details>
<summary>Alternative: Install from source</summary>

#### MacOS/Linux
```json
{
  "mcpServers": {
    "musicgpt": {
      "command": "node",
      "args": ["/path/to/mcp-server-musicgpt/dist/index.js"],
      "env": {
        "MUSICGPT_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

#### Windows
```json
{
  "mcpServers": {
    "musicgpt": {
      "command": "node",
      "args": ["C:\\path\\to\\mcp-server-musicgpt\\dist\\index.js"],
      "env": {
        "MUSICGPT_API_KEY": "your_api_key_here"
      }
    }
  }
}
```
</details>

### Cline

Add to your MCP settings:

```json
{
  "musicgpt": {
    "command": "npx",
    "args": ["-y", "mcp-server-musicgpt"],
    "env": {
      "MUSICGPT_API_KEY": "your_api_key_here"
    }
  }
}
```

## Available Tools

### Helper Tools

#### `get_conversion_by_id`
Get the status and results of a conversion task.

```typescript
{
  "conversionType": "MUSIC_AI",
  "task_id": "uuid-here"  // or use conversion_id
}
```

#### `get_all_voices`
List all available voices with pagination.

```typescript
{
  "limit": 20,  // optional, default: 20
  "page": 0     // optional, default: 0
}
```

#### `search_voices`
Search for voices by name.

```typescript
{
  "voice_name": "Taylor Swift"
}
```

### Music Generation Tools

#### `generate_music`
Generate custom music from a text prompt.

```typescript
{
  "prompt": "An upbeat electronic dance track with energetic synths",
  "music_style": "EDM",  // optional
  "lyrics": "Verse 1: ...",  // optional
  "make_instrumental": false,  // optional
  "vocal_only": false,  // optional
  "voice_id": "voice-uuid",  // optional
  "webhook_url": "https://example.com/webhook"  // optional
}
```

#### `create_cover_song`
Create a cover version with a different voice.

```typescript
{
  "audio_url": "https://example.com/song.mp3",
  "voice_id": "voice-uuid",
  "webhook_url": "https://example.com/webhook"  // optional
}
```

#### `generate_sound_effect`
Generate sound effects from text descriptions.

```typescript
{
  "prompt": "Thunder and rain in a forest",
  "duration": 5  // optional, in seconds
}
```

#### `generate_lyrics`
Generate song lyrics from a theme or prompt.

```typescript
{
  "prompt": "A song about summer adventures",
  "genre": "Pop"  // optional
}
```

### Voice & Speech Tools

#### `voice_changer`
Convert audio to a different voice.

```typescript
{
  "audio_url": "https://example.com/audio.mp3",
  "voice_id": "voice-uuid"
}
```

#### `text_to_speech`
Convert text to speech.

```typescript
{
  "text": "Hello, this is a text-to-speech conversion",
  "voice_id": "voice-uuid"
}
```

### Audio Processing Tools

#### `extract_audio`
Extract vocals, instruments, or stems.

```typescript
{
  "audio_url": "https://example.com/song.mp3",
  "extraction_type": "vocals"  // vocals, instrumental, drums, bass, piano, other
}
```

#### `denoise_audio`
Remove background noise from audio.

```typescript
{
  "audio_url": "https://example.com/noisy-audio.mp3"
}
```

#### `deecho_audio`
Remove echo from audio.

```typescript
{
  "audio_url": "https://example.com/audio-with-echo.mp3"
}
```

#### `dereverb_audio`
Remove reverb from audio.

```typescript
{
  "audio_url": "https://example.com/audio-with-reverb.mp3"
}
```

### Audio Manipulation Tools

#### `convert_audio_format`
Convert audio to different formats.

```typescript
{
  "audio_url": "https://example.com/audio.wav",
  "output_format": "mp3"  // mp3, wav, flac, ogg, m4a
}
```

#### `cut_audio`
Trim audio to specific time range.

```typescript
{
  "audio_url": "https://example.com/audio.mp3",
  "start_time": 10,  // seconds
  "end_time": 60     // seconds
}
```

#### `change_audio_speed`
Change playback speed.

```typescript
{
  "audio_url": "https://example.com/audio.mp3",
  "speed_factor": 1.5  // 1.5x speed
}
```

#### `master_audio`
Apply professional audio mastering.

```typescript
{
  "audio_url": "https://example.com/unmastered.mp3"
}
```

#### `remix_audio`
Create a remix of audio.

```typescript
{
  "audio_url": "https://example.com/song.mp3",
  "remix_style": "House"  // optional
}
```

#### `extend_audio`
Extend audio using AI continuation.

```typescript
{
  "audio_url": "https://example.com/song.mp3",
  "extension_duration": 30  // seconds, optional
}
```

#### `inpaint_audio`
Fill gaps or corrupted sections in audio.

```typescript
{
  "audio_url": "https://example.com/audio-with-gap.mp3",
  "start_time": 10,  // gap start in seconds
  "end_time": 15     // gap end in seconds
}
```

#### `sing_over_instrumental`
Add AI vocals to an instrumental track.

```typescript
{
  "instrumental_url": "https://example.com/instrumental.mp3",
  "lyrics": "Verse 1: ...",
  "voice_id": "voice-uuid"
}
```

### Analysis Tools

#### `transcribe_audio`
Transcribe speech to text.

```typescript
{
  "audio_url": "https://example.com/speech.mp3",
  "language": "en"  // optional, e.g., en, es, fr
}
```

#### `extract_key_bpm`
Extract musical key and BPM.

```typescript
{
  "audio_url": "https://example.com/song.mp3"
}
```

#### `audio_to_midi`
Convert audio to MIDI format.

```typescript
{
  "audio_url": "https://example.com/melody.mp3"
}
```

## Workflow Example

Most audio processing operations are asynchronous. Here's a typical workflow:

1. **Start a conversion** (e.g., `generate_music`)
   - Returns: `task_id` and `conversion_id`

2. **Check status** using `get_conversion_by_id`
   - Pass the `task_id` or `conversion_id`
   - Status values: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`

3. **Get results** when status is `COMPLETED`
   - The response includes `audio_url` with the processed audio

Example:

```typescript
// Step 1: Generate music
{
  "tool": "generate_music",
  "arguments": {
    "prompt": "A relaxing piano melody"
  }
}
// Returns: { task_id: "abc-123", conversion_id: "def-456", eta: 120 }

// Step 2: Check status (wait for ETA or use webhook)
{
  "tool": "get_conversion_by_id",
  "arguments": {
    "conversionType": "MUSIC_AI",
    "task_id": "abc-123"
  }
}
// Returns: { status: "COMPLETED", audio_url: "https://..." }
```

## Webhook Support

Most conversion tools support webhooks for async notifications. Set the `webhook_url` parameter to receive a callback when processing completes:

```typescript
{
  "prompt": "Epic orchestral music",
  "webhook_url": "https://your-server.com/musicgpt-webhook"
}
```

The webhook will receive a POST request with the conversion results.

## API Documentation

For detailed API documentation, visit:
- [MusicGPT API Documentation](https://docs.musicgpt.com/)
- [API Dashboard](https://musicgpt.com/api-dashboard)

## Conversion Types

When using `get_conversion_by_id`, use these conversion types:

- `MUSIC_AI` - Music generation
- `TEXT_TO_SPEECH` - Text to speech
- `VOICE_CONVERSION` - Voice changer
- `EXTRACTION` - Audio extraction
- `COVER` - Cover songs
- `STEMS_SEPARATION` - Stems separation
- `VOCAL_EXTRACTION` - Vocal extraction
- `DENOISING` - Denoise
- `DEECHO` - Deecho
- `DEREVERB` - Dereverb
- `SOUND_GENERATOR` - Sound effects
- `AUDIO_TRANSCRIPTION` - Transcription
- `AUDIO_SPEED_CHANGER` - Speed changer
- `AUDIO_MASTERING` - Mastering
- `AUDIO_CUTTER` - Audio cutter
- `REMIX` - Remix
- `FILE_CONVERT` - Format conversion
- `KEY_BPM_EXTRACTION` - Key & BPM extraction
- `AUDIO_TO_MIDI` - Audio to MIDI
- `EXTEND` - Audio extension
- `INPAINT` - Audio inpainting
- `SING_OVER_INSTRUMENTAL` - Sing over instrumental
- `LYRICS_GENERATOR` - Lyrics generation

## Rate Limits

MusicGPT API has rate limits based on your subscription tier. Check your [API dashboard](https://musicgpt.com/api-dashboard) for your limits.

## Troubleshooting

### "Authentication failed"
- Verify your `MUSICGPT_API_KEY` is correct
- Check your API key is active in the dashboard
- Ensure you have sufficient credits

### "Rate limit exceeded"
- Wait before making more requests
- Check your API usage in the dashboard
- Upgrade your plan if needed

### Timeout errors
- Increase `MUSICGPT_TIMEOUT` for large audio files
- Default is 60 seconds, increase if needed

### Tool not found
- Ensure the server is running
- Rebuild the project: `npm run build`
- Check your MCP client configuration

## Development

Build the server:
```bash
npm run build
```

Development mode (watch for changes):
```bash
npm run dev
```

## Credits & Costs

Most operations consume API credits. Check the [pricing page](https://docs.musicgpt.com/api-documentation/index/pricing) for details.

## License

MIT

## Support

For issues with this MCP server:
- [Create an issue](https://github.com/pasie15/mcp-server-musicgpt/issues)

For MusicGPT API issues:
- [MusicGPT Support](https://musicgpt.com/api-dashboard)
- [API Documentation](https://docs.musicgpt.com/)

## Links

- [MusicGPT Website](https://musicgpt.com/)
- [API Documentation](https://docs.musicgpt.com/)
- [API Dashboard](https://musicgpt.com/api-dashboard)
- [Model Context Protocol](https://modelcontextprotocol.io/)
