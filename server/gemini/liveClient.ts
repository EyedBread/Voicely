import { EventEmitter } from "events";
import {
  GoogleGenAI,
  Modality,
  Session,
  StartSensitivity,
  EndSensitivity,
  ThinkingLevel,
  type LiveServerMessage,
  type LiveServerToolCall,
  type LiveConnectConfig,
  type FunctionResponse,
} from "@google/genai";
import { config } from "@server/config";
import type { GeminiConfig } from "../../shared/types";

const DEFAULT_GEMINI_CONFIG: GeminiConfig = {
  model: config.gemini.liveModel,
  systemInstruction:
    "You are Voisli, a helpful AI voice assistant. You help users make phone calls, reservations, and manage their schedule. Be conversational, concise, and friendly. Keep responses short since this is a voice conversation.",
  voice: "Aoede",
  responseModalities: [Modality.AUDIO],
  inputAudioTranscription: true,
  outputAudioTranscription: true,
};

const AUDIO_MIME_TYPE = "audio/pcm;rate=16000";
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 1000;

export interface GeminiLiveSessionEvents {
  audio: (pcmAudio: Buffer) => void;
  text: (text: string) => void;
  inputTranscription: (text: string) => void;
  outputTranscription: (text: string) => void;
  toolCall: (toolCall: LiveServerToolCall) => void;
  interrupted: () => void;
  turnComplete: () => void;
  connected: () => void;
  disconnected: () => void;
  error: (error: Error) => void;
}

export class GeminiLiveSession extends EventEmitter {
  private session: Session | null = null;
  private genAI: GoogleGenAI;
  private geminiConfig: GeminiConfig;
  private connected = false;
  private reconnectAttempts = 0;
  private closing = false;

  constructor(geminiConfig?: Partial<GeminiConfig>) {
    super();
    this.geminiConfig = { ...DEFAULT_GEMINI_CONFIG, ...geminiConfig };
    this.genAI = new GoogleGenAI({ apiKey: config.gemini.apiKey });
  }

  async connect(): Promise<void> {
    if (this.connected) {
      console.warn("[Gemini] Already connected, ignoring connect() call");
      return;
    }

    this.closing = false;

    const liveConfig: LiveConnectConfig = {
      responseModalities:
        this.geminiConfig.responseModalities?.map((modality) =>
          modality === "AUDIO" ? Modality.AUDIO : Modality.TEXT,
        ) ?? [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: this.geminiConfig.voice,
          },
        },
      },
      systemInstruction: this.geminiConfig.systemInstruction,
      inputAudioTranscription: this.geminiConfig.inputAudioTranscription
        ? {}
        : undefined,
      outputAudioTranscription: this.geminiConfig.outputAudioTranscription
        ? {}
        : undefined,
      thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
      ...(({
        automaticActivityDetection: {
          startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_HIGH,
          endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_HIGH,
          silenceDurationMs: 500,
          prefixPaddingMs: 100,
        },
      }) as Record<string, unknown>),
    };

    if (this.geminiConfig.tools && this.geminiConfig.tools.length > 0) {
      liveConfig.tools = [
        {
          functionDeclarations: this.geminiConfig.tools.map((t) => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          })),
        },
      ];
    }

    try {
      console.log(
        `[Gemini] Connecting to model: ${this.geminiConfig.model}...`,
      );

      this.session = await this.genAI.live.connect({
        model: this.geminiConfig.model,
        config: liveConfig,
        callbacks: {
          onopen: () => {
            this.connected = true;
            this.reconnectAttempts = 0;
            console.log("[Gemini] Session established");
            this.emit("connected");
          },
          onmessage: (message: LiveServerMessage) => {
            this.handleServerMessage(message);
          },
          onerror: (e: ErrorEvent) => {
            console.error(`[Gemini] WebSocket error: ${e.message ?? e}`);
            this.emit(
              "error",
              new Error(`Gemini WebSocket error: ${e.message ?? "unknown"}`),
            );
          },
          onclose: () => {
            const wasConnected = this.connected;
            this.connected = false;
            this.session = null;
            console.log("[Gemini] Session closed");

            if (wasConnected && !this.closing) {
              this.emit("disconnected");
              this.attemptReconnect();
            } else {
              this.emit("disconnected");
            }
          },
        },
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error(`[Gemini] Failed to connect: ${error.message}`);
      this.emit("error", error);
      throw error;
    }
  }

  sendAudio(pcmAudio: Buffer): void {
    if (!this.session || !this.connected) {
      return;
    }

    this.session.sendRealtimeInput({
      audio: {
        data: pcmAudio.toString("base64"),
        mimeType: AUDIO_MIME_TYPE,
      },
    });
  }

  sendText(text: string): void {
    if (!this.session || !this.connected) {
      return;
    }

    this.session.sendClientContent({
      turns: [{ role: "user", parts: [{ text }] }],
      turnComplete: true,
    });
  }

  sendToolResponse(functionResponses: FunctionResponse[]): void {
    if (!this.session || !this.connected) {
      console.warn("[Gemini] Cannot send tool response - not connected");
      return;
    }

    console.log(
      `[Gemini] Sending tool responses: ${functionResponses.map((r) => r.name).join(", ")}`,
    );

    this.session.sendToolResponse({ functionResponses });
  }

  onAudio(callback: (pcmAudio: Buffer) => void): void {
    this.on("audio", callback);
  }

  onText(callback: (text: string) => void): void {
    this.on("text", callback);
  }

  onToolCall(callback: (toolCall: LiveServerToolCall) => void): void {
    this.on("toolCall", callback);
  }

  onInterrupted(callback: () => void): void {
    this.on("interrupted", callback);
  }

  close(): void {
    this.closing = true;

    if (this.session) {
      try {
        this.session.close();
      } catch {
        // Ignore errors during close
      }
      this.session = null;
    }

    this.connected = false;
    console.log("[Gemini] Session closed by client");
  }

  isConnected(): boolean {
    return this.connected;
  }

  private handleServerMessage(message: LiveServerMessage): void {
    if (message.setupComplete) {
      console.log("[Gemini] Setup complete, ready for audio");
      return;
    }

    if (message.serverContent) {
      const content = message.serverContent;

      if (content.interrupted) {
        console.log("[Gemini] Model generation interrupted (barge-in)");
        this.emit("interrupted");
      }

      if (content.modelTurn?.parts) {
        for (const part of content.modelTurn.parts) {
          if (
            part.inlineData?.data &&
            part.inlineData.mimeType?.startsWith("audio/")
          ) {
            const audioBuffer = Buffer.from(part.inlineData.data, "base64");
            this.emit("audio", audioBuffer);
          }
        }
      }

      if (content.inputTranscription?.text) {
        this.emit("inputTranscription", content.inputTranscription.text);
        this.emit("text", `[user] ${content.inputTranscription.text}`);
      }

      if (content.outputTranscription?.text) {
        this.emit("outputTranscription", content.outputTranscription.text);
        this.emit("text", `[assistant] ${content.outputTranscription.text}`);
      }

      if (content.turnComplete) {
        console.log("[Gemini] Turn complete");
        this.emit("turnComplete");
      }

      return;
    }

    if (message.toolCall) {
      console.log(
        `[Gemini] Tool call received: ${message.toolCall.functionCalls?.map((fc) => fc.name).join(", ")}`,
      );
      this.emit("toolCall", message.toolCall);
      return;
    }

    if (message.toolCallCancellation) {
      console.log("[Gemini] Tool call cancelled");
      return;
    }

    if (message.goAway) {
      console.warn(
        `[Gemini] Server going away, time left: ${message.goAway.timeLeft}`,
      );
    }
  }

  private async attemptReconnect(): Promise<void> {
    if (this.closing || this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error(
          `[Gemini] Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached`,
        );
        this.emit("error", new Error("Max reconnect attempts reached"));
      }
      return;
    }

    this.reconnectAttempts += 1;
    const delay = RECONNECT_DELAY_MS * this.reconnectAttempts;
    console.log(
      `[Gemini] Attempting reconnect ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms...`,
    );

    await new Promise((resolve) => setTimeout(resolve, delay));

    try {
      await this.connect();
    } catch (err) {
      console.error(
        `[Gemini] Reconnect attempt ${this.reconnectAttempts} failed: ${err instanceof Error ? err.message : err}`,
      );
      await this.attemptReconnect();
    }
  }
}
