#!/usr/bin/env node

/**
 * MCP Server for MusicGPT API
 *
 * Provides AI-powered audio generation and processing capabilities including:
 * - Music generation from text prompts
 * - Voice conversion and cloning
 * - Audio processing and enhancement
 * - Audio transcription and analysis
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import axios, { AxiosInstance, AxiosError } from "axios";

// ============================================================================
// Configuration
// ============================================================================

interface ServerConfig {
  apiKey?: string;
  baseUrl: string;
  timeout?: number;
}

// ============================================================================
// Tool Definitions
// ============================================================================

const TOOLS = [
  // Helper Tools
  {
    name: "get_conversion_by_id",
    description: "Get details of a conversion by its task ID or conversion ID. Returns status, audio URL, and metadata.",
    inputSchema: {
      type: "object" as const,
      properties: {
        conversionType: {
          type: "string",
          description: "Type of conversion (must match MusicGPT API conversion types)",
          enum: [
            "MUSIC_AI",
            "TEXT_TO_SPEECH",
            "VOICE_CONVERSION",
            "COVER",
            "EXTRACTION",
            "DENOISING",
            "DEECHO",
            "DEREVERB",
            "SOUND_GENERATOR",
            "AUDIO_TRANSCRIPTION",
            "AUDIO_SPEED_CHANGER",
            "AUDIO_MASTERING",
            "AUDIO_CUTTER",
            "REMIX",
            "FILE_CONVERT",
            "KEY_BPM_EXTRACTION",
            "AUDIO_TO_MIDI",
            "EXTEND",
            "INPAINT",
            "SING_OVER_INSTRUMENTAL",
            "LYRICS_GENERATOR",
            "STEMS_SEPARATION",
            "VOCAL_EXTRACTION"
          ],
        },
        task_id: {
          type: "string",
          description: "Task ID associated with the conversion (provide either task_id or conversion_id)",
        },
        conversion_id: {
          type: "string",
          description: "Conversion ID to fetch details (provide either task_id or conversion_id)",
        },
      },
      required: ["conversionType"],
    },
  },
  {
    name: "get_all_voices",
    description: "Get a paginated list of all available voices for voice conversion and TTS",
    inputSchema: {
      type: "object" as const,
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of voices per page (default: 20)",
          default: 20,
        },
        page: {
          type: "number",
          description: "Page number for pagination (default: 0)",
          default: 0,
        },
      },
    },
  },
  {
    name: "search_voices",
    description: "Search for voices by name",
    inputSchema: {
      type: "object" as const,
      properties: {
        voice_name: {
          type: "string",
          description: "Name of the voice to search for",
        },
      },
      required: ["voice_name"],
    },
  },

  // Music Generation Tools
  {
    name: "generate_music",
    description: "Generate custom music from a text prompt using AI. Can create songs with or without lyrics, instrumental tracks, or vocal-only versions.",
    inputSchema: {
      type: "object" as const,
      properties: {
        prompt: {
          type: "string",
          description: "Natural language prompt for music generation (keep under 280 characters for best results)",
        },
        music_style: {
          type: "string",
          description: "Style of music to generate (e.g., Rock, Pop, Jazz, Hip-Hop)",
        },
        lyrics: {
          type: "string",
          description: "Custom lyrics for the generated music",
        },
        make_instrumental: {
          type: "boolean",
          description: "Whether to make the music instrumental (no vocals)",
          default: false,
        },
        vocal_only: {
          type: "boolean",
          description: "Whether to generate only vocals of output audio",
          default: false,
        },
        voice_id: {
          type: "string",
          description: "Voice model ID to use for vocals (use get_all_voices to find IDs)",
        },
        webhook_url: {
          type: "string",
          description: "URL for callback upon completion",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "create_cover_song",
    description: "Create a cover version of a song with a different voice or style",
    inputSchema: {
      type: "object" as const,
      properties: {
        audio_url: {
          type: "string",
          description: "URL of the original audio file",
        },
        voice_id: {
          type: "string",
          description: "Voice model ID to use for the cover (use get_all_voices to find IDs)",
        },
        webhook_url: {
          type: "string",
          description: "URL for callback upon completion",
        },
      },
      required: ["audio_url", "voice_id"],
    },
  },
  {
    name: "generate_sound_effect",
    description: "Generate sound effects from a text description",
    inputSchema: {
      type: "object" as const,
      properties: {
        prompt: {
          type: "string",
          description: "Description of the sound effect to generate",
        },
        duration: {
          type: "number",
          description: "Duration of the sound effect in seconds",
        },
        webhook_url: {
          type: "string",
          description: "URL for callback upon completion",
        },
      },
      required: ["prompt"],
    },
  },

  // Voice and Speech Tools
  {
    name: "voice_changer",
    description: "Convert audio from one voice to another using AI voice models",
    inputSchema: {
      type: "object" as const,
      properties: {
        audio_url: {
          type: "string",
          description: "URL of the audio file to convert",
        },
        voice_id: {
          type: "string",
          description: "Target voice model ID (use get_all_voices to find IDs)",
        },
        webhook_url: {
          type: "string",
          description: "URL for callback upon completion",
        },
      },
      required: ["audio_url", "voice_id"],
    },
  },
  {
    name: "text_to_speech",
    description: "Convert text to speech using AI voices",
    inputSchema: {
      type: "object" as const,
      properties: {
        text: {
          type: "string",
          description: "Text to convert to speech",
        },
        voice_id: {
          type: "string",
          description: "Voice model ID to use (use get_all_voices to find IDs)",
        },
        webhook_url: {
          type: "string",
          description: "URL for callback upon completion",
        },
      },
      required: ["text", "voice_id"],
    },
  },

  // Audio Extraction and Separation
  {
    name: "extract_audio",
    description: "Extract vocals, instruments, or specific stems from audio",
    inputSchema: {
      type: "object" as const,
      properties: {
        audio_url: {
          type: "string",
          description: "URL of the audio file to process",
        },
        extraction_type: {
          type: "string",
          description: "Type of extraction to perform",
          enum: ["vocals", "instrumental", "drums", "bass", "piano", "other"],
        },
        webhook_url: {
          type: "string",
          description: "URL for callback upon completion",
        },
      },
      required: ["audio_url", "extraction_type"],
    },
  },

  // Audio Enhancement
  {
    name: "denoise_audio",
    description: "Remove background noise from audio",
    inputSchema: {
      type: "object" as const,
      properties: {
        audio_url: {
          type: "string",
          description: "URL of the audio file to denoise",
        },
        webhook_url: {
          type: "string",
          description: "URL for callback upon completion",
        },
      },
      required: ["audio_url"],
    },
  },
  {
    name: "deecho_audio",
    description: "Remove echo from audio",
    inputSchema: {
      type: "object" as const,
      properties: {
        audio_url: {
          type: "string",
          description: "URL of the audio file to process",
        },
        webhook_url: {
          type: "string",
          description: "URL for callback upon completion",
        },
      },
      required: ["audio_url"],
    },
  },
  {
    name: "dereverb_audio",
    description: "Remove reverb from audio",
    inputSchema: {
      type: "object" as const,
      properties: {
        audio_url: {
          type: "string",
          description: "URL of the audio file to process",
        },
        webhook_url: {
          type: "string",
          description: "URL for callback upon completion",
        },
      },
      required: ["audio_url"],
    },
  },

  // Audio Manipulation
  {
    name: "convert_audio_format",
    description: "Convert audio file to a different format",
    inputSchema: {
      type: "object" as const,
      properties: {
        audio_url: {
          type: "string",
          description: "URL of the audio file to convert",
        },
        output_format: {
          type: "string",
          description: "Desired output format",
          enum: ["mp3", "wav", "flac", "ogg", "m4a"],
        },
        webhook_url: {
          type: "string",
          description: "URL for callback upon completion",
        },
      },
      required: ["audio_url", "output_format"],
    },
  },
  {
    name: "cut_audio",
    description: "Cut or trim audio to a specific duration",
    inputSchema: {
      type: "object" as const,
      properties: {
        audio_url: {
          type: "string",
          description: "URL of the audio file to cut",
        },
        start_time: {
          type: "number",
          description: "Start time in seconds",
        },
        end_time: {
          type: "number",
          description: "End time in seconds",
        },
        webhook_url: {
          type: "string",
          description: "URL for callback upon completion",
        },
      },
      required: ["audio_url", "start_time", "end_time"],
    },
  },
  {
    name: "change_audio_speed",
    description: "Change the playback speed of audio",
    inputSchema: {
      type: "object" as const,
      properties: {
        audio_url: {
          type: "string",
          description: "URL of the audio file to process",
        },
        speed_factor: {
          type: "number",
          description: "Speed multiplier (e.g., 1.5 for 1.5x speed, 0.75 for 0.75x speed)",
        },
        webhook_url: {
          type: "string",
          description: "URL for callback upon completion",
        },
      },
      required: ["audio_url", "speed_factor"],
    },
  },
  {
    name: "master_audio",
    description: "Apply professional audio mastering to improve sound quality",
    inputSchema: {
      type: "object" as const,
      properties: {
        audio_url: {
          type: "string",
          description: "URL of the audio file to master",
        },
        webhook_url: {
          type: "string",
          description: "URL for callback upon completion",
        },
      },
      required: ["audio_url"],
    },
  },
  {
    name: "remix_audio",
    description: "Create a remix of an audio track",
    inputSchema: {
      type: "object" as const,
      properties: {
        audio_url: {
          type: "string",
          description: "URL of the audio file to remix",
        },
        remix_style: {
          type: "string",
          description: "Style of remix to create",
        },
        webhook_url: {
          type: "string",
          description: "URL for callback upon completion",
        },
      },
      required: ["audio_url"],
    },
  },
  {
    name: "extend_audio",
    description: "Extend an audio track using AI to generate continuation",
    inputSchema: {
      type: "object" as const,
      properties: {
        audio_url: {
          type: "string",
          description: "URL of the audio file to extend",
        },
        extension_duration: {
          type: "number",
          description: "Duration to extend in seconds",
        },
        webhook_url: {
          type: "string",
          description: "URL for callback upon completion",
        },
      },
      required: ["audio_url"],
    },
  },
  {
    name: "inpaint_audio",
    description: "Fill in missing or corrupted parts of audio using AI",
    inputSchema: {
      type: "object" as const,
      properties: {
        audio_url: {
          type: "string",
          description: "URL of the audio file with gaps to fill",
        },
        start_time: {
          type: "number",
          description: "Start time of the section to inpaint in seconds",
        },
        end_time: {
          type: "number",
          description: "End time of the section to inpaint in seconds",
        },
        webhook_url: {
          type: "string",
          description: "URL for callback upon completion",
        },
      },
      required: ["audio_url", "start_time", "end_time"],
    },
  },
  {
    name: "sing_over_instrumental",
    description: "Add AI-generated vocals over an instrumental track",
    inputSchema: {
      type: "object" as const,
      properties: {
        instrumental_url: {
          type: "string",
          description: "URL of the instrumental audio file",
        },
        lyrics: {
          type: "string",
          description: "Lyrics to sing",
        },
        voice_id: {
          type: "string",
          description: "Voice model ID to use for singing (use get_all_voices to find IDs)",
        },
        webhook_url: {
          type: "string",
          description: "URL for callback upon completion",
        },
      },
      required: ["instrumental_url", "lyrics", "voice_id"],
    },
  },

  // Analysis Tools
  {
    name: "transcribe_audio",
    description: "Transcribe speech from audio to text",
    inputSchema: {
      type: "object" as const,
      properties: {
        audio_url: {
          type: "string",
          description: "URL of the audio file to transcribe",
        },
        language: {
          type: "string",
          description: "Language code (e.g., 'en', 'es', 'fr')",
        },
        webhook_url: {
          type: "string",
          description: "URL for callback upon completion",
        },
      },
      required: ["audio_url"],
    },
  },
  {
    name: "extract_key_bpm",
    description: "Extract musical key and BPM (tempo) from audio",
    inputSchema: {
      type: "object" as const,
      properties: {
        audio_url: {
          type: "string",
          description: "URL of the audio file to analyze",
        },
        webhook_url: {
          type: "string",
          description: "URL for callback upon completion",
        },
      },
      required: ["audio_url"],
    },
  },
  {
    name: "audio_to_midi",
    description: "Convert audio to MIDI format",
    inputSchema: {
      type: "object" as const,
      properties: {
        audio_url: {
          type: "string",
          description: "URL of the audio file to convert to MIDI",
        },
        webhook_url: {
          type: "string",
          description: "URL for callback upon completion",
        },
      },
      required: ["audio_url"],
    },
  },
  {
    name: "generate_lyrics",
    description: "Generate song lyrics based on a theme or prompt",
    inputSchema: {
      type: "object" as const,
      properties: {
        prompt: {
          type: "string",
          description: "Theme or prompt for lyrics generation",
        },
        genre: {
          type: "string",
          description: "Music genre for the lyrics",
        },
      },
      required: ["prompt"],
    },
  },
];

// ============================================================================
// Main Server Class
// ============================================================================

class MusicGPTMCPServer {
  private server: Server;
  private axiosInstance: AxiosInstance;
  private config: ServerConfig;

  constructor(config: ServerConfig) {
    this.config = config;

    // Initialize axios instance with authentication
    this.axiosInstance = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 60000, // 60 seconds for audio processing
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey && {
          Authorization: config.apiKey,
        }),
      },
    });

    // Initialize MCP server
    this.server = new Server(
      {
        name: "mcp-server-musicgpt",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.setupErrorHandling();
  }

  /**
   * Set up request handlers for the MCP server
   */
  private setupHandlers(): void {
    // Handle tool listing
    this.server.setRequestHandler(
      ListToolsRequestSchema,
      async () => ({
        tools: TOOLS,
      })
    );

    // Handle tool execution
    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request) => {
        const { name, arguments: args } = request.params;

        try {
          switch (name) {
            // Helper endpoints
            case "get_conversion_by_id":
              return await this.handleGetConversionById(args);
            case "get_all_voices":
              return await this.handleGetAllVoices(args);
            case "search_voices":
              return await this.handleSearchVoices(args);

            // Music generation
            case "generate_music":
              return await this.handleGenerateMusic(args);
            case "create_cover_song":
              return await this.handleCreateCover(args);
            case "generate_sound_effect":
              return await this.handleGenerateSoundEffect(args);

            // Voice and speech
            case "voice_changer":
              return await this.handleVoiceChanger(args);
            case "text_to_speech":
              return await this.handleTextToSpeech(args);

            // Audio extraction
            case "extract_audio":
              return await this.handleExtractAudio(args);

            // Audio enhancement
            case "denoise_audio":
              return await this.handleDenoiseAudio(args);
            case "deecho_audio":
              return await this.handleDeechoAudio(args);
            case "dereverb_audio":
              return await this.handleDereverbAudio(args);

            // Audio manipulation
            case "convert_audio_format":
              return await this.handleConvertAudioFormat(args);
            case "cut_audio":
              return await this.handleCutAudio(args);
            case "change_audio_speed":
              return await this.handleChangeAudioSpeed(args);
            case "master_audio":
              return await this.handleMasterAudio(args);
            case "remix_audio":
              return await this.handleRemixAudio(args);
            case "extend_audio":
              return await this.handleExtendAudio(args);
            case "inpaint_audio":
              return await this.handleInpaintAudio(args);
            case "sing_over_instrumental":
              return await this.handleSingOverInstrumental(args);

            // Analysis tools
            case "transcribe_audio":
              return await this.handleTranscribeAudio(args);
            case "extract_key_bpm":
              return await this.handleExtractKeyBpm(args);
            case "audio_to_midi":
              return await this.handleAudioToMidi(args);
            case "generate_lyrics":
              return await this.handleGenerateLyrics(args);

            default:
              throw new McpError(
                ErrorCode.MethodNotFound,
                `Unknown tool: ${name}`
              );
          }
        } catch (error) {
          if (error instanceof McpError) {
            throw error;
          }

          if (axios.isAxiosError(error)) {
            throw this.handleAxiosError(error);
          }

          throw new McpError(
            ErrorCode.InternalError,
            `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    );
  }

  /**
   * Set up global error handling
   */
  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };

    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  // ==========================================================================
  // Helper Endpoint Handlers
  // ==========================================================================

  private async handleGetConversionById(args: any) {
    if (!args.conversionType) {
      throw new McpError(ErrorCode.InvalidParams, "conversionType is required");
    }
    if (!args.task_id && !args.conversion_id) {
      throw new McpError(ErrorCode.InvalidParams, "Either task_id or conversion_id is required");
    }

    const params: any = { conversionType: args.conversionType };
    if (args.task_id) params.task_id = args.task_id;
    if (args.conversion_id) params.conversion_id = args.conversion_id;

    const response = await this.axiosInstance.get("/byId", { params });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async handleGetAllVoices(args: any) {
    const params = {
      limit: args.limit || 20,
      page: args.page || 0,
    };

    const response = await this.axiosInstance.get("/getAllVoices", { params });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async handleSearchVoices(args: any) {
    if (!args.voice_name) {
      throw new McpError(ErrorCode.InvalidParams, "voice_name is required");
    }

    const response = await this.axiosInstance.get("/searchVoices", {
      params: { voice_name: args.voice_name },
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  // ==========================================================================
  // Music Generation Handlers
  // ==========================================================================

  private async handleGenerateMusic(args: any) {
    if (!args.prompt) {
      throw new McpError(ErrorCode.InvalidParams, "prompt is required");
    }

    const response = await this.axiosInstance.post("/MusicAI", {
      prompt: args.prompt,
      music_style: args.music_style,
      lyrics: args.lyrics,
      make_instrumental: args.make_instrumental || false,
      vocal_only: args.vocal_only || false,
      voice_id: args.voice_id,
      webhook_url: args.webhook_url,
    });

    return {
      content: [
        {
          type: "text",
          text: `Music generation started!\n\n${JSON.stringify(response.data, null, 2)}\n\nUse get_conversion_by_id with the task_id or conversion_id to check the status.`,
        },
      ],
    };
  }

  private async handleCreateCover(args: any) {
    if (!args.audio_url || !args.voice_id) {
      throw new McpError(ErrorCode.InvalidParams, "audio_url and voice_id are required");
    }

    const response = await this.axiosInstance.post("/cover", {
      audio_url: args.audio_url,
      voice_id: args.voice_id,
      webhook_url: args.webhook_url,
    });

    return {
      content: [
        {
          type: "text",
          text: `Cover song creation started!\n\n${JSON.stringify(response.data, null, 2)}\n\nUse get_conversion_by_id with the task_id to check the status.`,
        },
      ],
    };
  }

  private async handleGenerateSoundEffect(args: any) {
    if (!args.prompt) {
      throw new McpError(ErrorCode.InvalidParams, "prompt is required");
    }

    const response = await this.axiosInstance.post("/soundgenerator", {
      prompt: args.prompt,
      duration: args.duration,
      webhook_url: args.webhook_url,
    });

    return {
      content: [
        {
          type: "text",
          text: `Sound effect generation started!\n\n${JSON.stringify(response.data, null, 2)}\n\nUse get_conversion_by_id with the task_id to check the status.`,
        },
      ],
    };
  }

  // ==========================================================================
  // Voice and Speech Handlers
  // ==========================================================================

  private async handleVoiceChanger(args: any) {
    if (!args.audio_url || !args.voice_id) {
      throw new McpError(ErrorCode.InvalidParams, "audio_url and voice_id are required");
    }

    const response = await this.axiosInstance.post("/voicetovoice", {
      audio_url: args.audio_url,
      voice_id: args.voice_id,
      webhook_url: args.webhook_url,
    });

    return {
      content: [
        {
          type: "text",
          text: `Voice conversion started!\n\n${JSON.stringify(response.data, null, 2)}\n\nUse get_conversion_by_id with the task_id to check the status.`,
        },
      ],
    };
  }

  private async handleTextToSpeech(args: any) {
    if (!args.text || !args.voice_id) {
      throw new McpError(ErrorCode.InvalidParams, "text and voice_id are required");
    }

    const response = await this.axiosInstance.post("/TextToSpeech", {
      text: args.text,
      voice_id: args.voice_id,
      webhook_url: args.webhook_url,
    });

    return {
      content: [
        {
          type: "text",
          text: `Text-to-speech conversion started!\n\n${JSON.stringify(response.data, null, 2)}\n\nUse get_conversion_by_id with the task_id to check the status.`,
        },
      ],
    };
  }

  // ==========================================================================
  // Audio Extraction Handler
  // ==========================================================================

  private async handleExtractAudio(args: any) {
    if (!args.audio_url || !args.extraction_type) {
      throw new McpError(ErrorCode.InvalidParams, "audio_url and extraction_type are required");
    }

    const response = await this.axiosInstance.post("/extraction", {
      audio_url: args.audio_url,
      extraction_type: args.extraction_type,
      webhook_url: args.webhook_url,
    });

    return {
      content: [
        {
          type: "text",
          text: `Audio extraction started!\n\n${JSON.stringify(response.data, null, 2)}\n\nUse get_conversion_by_id with the task_id to check the status.`,
        },
      ],
    };
  }

  // ==========================================================================
  // Audio Enhancement Handlers
  // ==========================================================================

  private async handleDenoiseAudio(args: any) {
    if (!args.audio_url) {
      throw new McpError(ErrorCode.InvalidParams, "audio_url is required");
    }

    const response = await this.axiosInstance.post("/denoise", {
      audio_url: args.audio_url,
      webhook_url: args.webhook_url,
    });

    return {
      content: [
        {
          type: "text",
          text: `Audio denoising started!\n\n${JSON.stringify(response.data, null, 2)}\n\nUse get_conversion_by_id with the task_id to check the status.`,
        },
      ],
    };
  }

  private async handleDeechoAudio(args: any) {
    if (!args.audio_url) {
      throw new McpError(ErrorCode.InvalidParams, "audio_url is required");
    }

    const response = await this.axiosInstance.post("/deecho", {
      audio_url: args.audio_url,
      webhook_url: args.webhook_url,
    });

    return {
      content: [
        {
          type: "text",
          text: `Audio de-echo started!\n\n${JSON.stringify(response.data, null, 2)}\n\nUse get_conversion_by_id with the task_id to check the status.`,
        },
      ],
    };
  }

  private async handleDereverbAudio(args: any) {
    if (!args.audio_url) {
      throw new McpError(ErrorCode.InvalidParams, "audio_url is required");
    }

    const response = await this.axiosInstance.post("/dereverb", {
      audio_url: args.audio_url,
      webhook_url: args.webhook_url,
    });

    return {
      content: [
        {
          type: "text",
          text: `Audio de-reverb started!\n\n${JSON.stringify(response.data, null, 2)}\n\nUse get_conversion_by_id with the task_id to check the status.`,
        },
      ],
    };
  }

  // ==========================================================================
  // Audio Manipulation Handlers
  // ==========================================================================

  private async handleConvertAudioFormat(args: any) {
    if (!args.audio_url || !args.output_format) {
      throw new McpError(ErrorCode.InvalidParams, "audio_url and output_format are required");
    }

    const response = await this.axiosInstance.post("/fileconvert", {
      audio_url: args.audio_url,
      output_format: args.output_format,
      webhook_url: args.webhook_url,
    });

    return {
      content: [
        {
          type: "text",
          text: `Audio format conversion started!\n\n${JSON.stringify(response.data, null, 2)}\n\nUse get_conversion_by_id with the task_id to check the status.`,
        },
      ],
    };
  }

  private async handleCutAudio(args: any) {
    if (!args.audio_url || args.start_time === undefined || args.end_time === undefined) {
      throw new McpError(ErrorCode.InvalidParams, "audio_url, start_time, and end_time are required");
    }

    const response = await this.axiosInstance.post("/audio_cutter", {
      audio_url: args.audio_url,
      start_time: args.start_time,
      end_time: args.end_time,
      webhook_url: args.webhook_url,
    });

    return {
      content: [
        {
          type: "text",
          text: `Audio cutting started!\n\n${JSON.stringify(response.data, null, 2)}\n\nUse get_conversion_by_id with the task_id to check the status.`,
        },
      ],
    };
  }

  private async handleChangeAudioSpeed(args: any) {
    if (!args.audio_url || !args.speed_factor) {
      throw new McpError(ErrorCode.InvalidParams, "audio_url and speed_factor are required");
    }

    const response = await this.axiosInstance.post("/audio_speed_changer", {
      audio_url: args.audio_url,
      speed_factor: args.speed_factor,
      webhook_url: args.webhook_url,
    });

    return {
      content: [
        {
          type: "text",
          text: `Audio speed change started!\n\n${JSON.stringify(response.data, null, 2)}\n\nUse get_conversion_by_id with the task_id to check the status.`,
        },
      ],
    };
  }

  private async handleMasterAudio(args: any) {
    if (!args.audio_url) {
      throw new McpError(ErrorCode.InvalidParams, "audio_url is required");
    }

    const response = await this.axiosInstance.post("/audio_mastering", {
      audio_url: args.audio_url,
      webhook_url: args.webhook_url,
    });

    return {
      content: [
        {
          type: "text",
          text: `Audio mastering started!\n\n${JSON.stringify(response.data, null, 2)}\n\nUse get_conversion_by_id with the task_id to check the status.`,
        },
      ],
    };
  }

  private async handleRemixAudio(args: any) {
    if (!args.audio_url) {
      throw new McpError(ErrorCode.InvalidParams, "audio_url is required");
    }

    const response = await this.axiosInstance.post("/remix", {
      audio_url: args.audio_url,
      remix_style: args.remix_style,
      webhook_url: args.webhook_url,
    });

    return {
      content: [
        {
          type: "text",
          text: `Audio remix started!\n\n${JSON.stringify(response.data, null, 2)}\n\nUse get_conversion_by_id with the task_id to check the status.`,
        },
      ],
    };
  }

  private async handleExtendAudio(args: any) {
    if (!args.audio_url) {
      throw new McpError(ErrorCode.InvalidParams, "audio_url is required");
    }

    const response = await this.axiosInstance.post("/extend", {
      audio_url: args.audio_url,
      extension_duration: args.extension_duration,
      webhook_url: args.webhook_url,
    });

    return {
      content: [
        {
          type: "text",
          text: `Audio extension started!\n\n${JSON.stringify(response.data, null, 2)}\n\nUse get_conversion_by_id with the task_id to check the status.`,
        },
      ],
    };
  }

  private async handleInpaintAudio(args: any) {
    if (!args.audio_url || args.start_time === undefined || args.end_time === undefined) {
      throw new McpError(ErrorCode.InvalidParams, "audio_url, start_time, and end_time are required");
    }

    const response = await this.axiosInstance.post("/inpaint", {
      audio_url: args.audio_url,
      start_time: args.start_time,
      end_time: args.end_time,
      webhook_url: args.webhook_url,
    });

    return {
      content: [
        {
          type: "text",
          text: `Audio inpainting started!\n\n${JSON.stringify(response.data, null, 2)}\n\nUse get_conversion_by_id with the task_id to check the status.`,
        },
      ],
    };
  }

  private async handleSingOverInstrumental(args: any) {
    if (!args.instrumental_url || !args.lyrics || !args.voice_id) {
      throw new McpError(ErrorCode.InvalidParams, "instrumental_url, lyrics, and voice_id are required");
    }

    const response = await this.axiosInstance.post("/sing_over_instrumental", {
      instrumental_url: args.instrumental_url,
      lyrics: args.lyrics,
      voice_id: args.voice_id,
      webhook_url: args.webhook_url,
    });

    return {
      content: [
        {
          type: "text",
          text: `Singing over instrumental started!\n\n${JSON.stringify(response.data, null, 2)}\n\nUse get_conversion_by_id with the task_id to check the status.`,
        },
      ],
    };
  }

  // ==========================================================================
  // Analysis Tool Handlers
  // ==========================================================================

  private async handleTranscribeAudio(args: any) {
    if (!args.audio_url) {
      throw new McpError(ErrorCode.InvalidParams, "audio_url is required");
    }

    const response = await this.axiosInstance.post("/audiotranscribe", {
      audio_url: args.audio_url,
      language: args.language,
      webhook_url: args.webhook_url,
    });

    return {
      content: [
        {
          type: "text",
          text: `Audio transcription started!\n\n${JSON.stringify(response.data, null, 2)}\n\nUse get_conversion_by_id with the task_id to check the status.`,
        },
      ],
    };
  }

  private async handleExtractKeyBpm(args: any) {
    if (!args.audio_url) {
      throw new McpError(ErrorCode.InvalidParams, "audio_url is required");
    }

    const response = await this.axiosInstance.post("/extract_key_bpm", {
      audio_url: args.audio_url,
      webhook_url: args.webhook_url,
    });

    return {
      content: [
        {
          type: "text",
          text: `Key and BPM extraction started!\n\n${JSON.stringify(response.data, null, 2)}\n\nUse get_conversion_by_id with the task_id to check the status.`,
        },
      ],
    };
  }

  private async handleAudioToMidi(args: any) {
    if (!args.audio_url) {
      throw new McpError(ErrorCode.InvalidParams, "audio_url is required");
    }

    const response = await this.axiosInstance.post("/audio_to_midi", {
      audio_url: args.audio_url,
      webhook_url: args.webhook_url,
    });

    return {
      content: [
        {
          type: "text",
          text: `Audio to MIDI conversion started!\n\n${JSON.stringify(response.data, null, 2)}\n\nUse get_conversion_by_id with the task_id to check the status.`,
        },
      ],
    };
  }

  private async handleGenerateLyrics(args: any) {
    if (!args.prompt) {
      throw new McpError(ErrorCode.InvalidParams, "prompt is required");
    }

    const response = await this.axiosInstance.get("/lyrics_generator", {
      params: {
        prompt: args.prompt,
        genre: args.genre,
      },
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  private handleAxiosError(error: AxiosError): McpError {
    const status = error.response?.status;
    const message =
      (error.response?.data as any)?.message ||
      error.message ||
      "API request failed";

    if (status === 401 || status === 403) {
      return new McpError(
        ErrorCode.InvalidRequest,
        `Authentication failed: ${message}. Check your MUSICGPT_API_KEY.`
      );
    }

    if (status === 404) {
      return new McpError(
        ErrorCode.InvalidRequest,
        `Resource not found: ${message}`
      );
    }

    if (status === 429) {
      return new McpError(
        ErrorCode.InternalError,
        `Rate limit exceeded: ${message}`
      );
    }

    if (status === 400) {
      return new McpError(
        ErrorCode.InvalidParams,
        `Invalid request: ${message}`
      );
    }

    if (status && status >= 500) {
      return new McpError(
        ErrorCode.InternalError,
        `Server error: ${message}`
      );
    }

    return new McpError(
      ErrorCode.InternalError,
      `API request failed: ${message}`
    );
  }

  /**
   * Start the MCP server
   */
  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("MusicGPT MCP Server running on stdio");
  }
}

// ============================================================================
// Main Execution
// ============================================================================

const config: ServerConfig = {
  apiKey: process.env.MUSICGPT_API_KEY,
  baseUrl: process.env.MUSICGPT_BASE_URL || "https://api.musicgpt.com/api/public/v1",
  timeout: process.env.MUSICGPT_TIMEOUT
    ? parseInt(process.env.MUSICGPT_TIMEOUT, 10)
    : 60000,
};

if (!config.apiKey) {
  console.error(
    "Error: MUSICGPT_API_KEY environment variable is required"
  );
  process.exit(1);
}

const server = new MusicGPTMCPServer(config);
server.run().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
