import { EventEmitter } from "events";
import type WebSocket from "ws";
import type {
  TwilioStreamMessage,
  TwilioStartMessage,
} from "../../shared/types";

export interface TwilioMediaStreamEvents {
  start: (metadata: {
    streamSid: string;
    callSid: string;
    mediaFormat: TwilioStartMessage["start"]["mediaFormat"];
  }) => void;
  audio: (base64MulawAudio: string) => void;
  stop: (callSid: string) => void;
  error: (error: Error) => void;
}

export class TwilioMediaStream extends EventEmitter {
  private ws: WebSocket;
  private streamSid: string | null = null;
  private callSid: string | null = null;

  constructor(ws: WebSocket) {
    super();
    this.ws = ws;
    this.setupListeners();
  }

  private setupListeners(): void {
    this.ws.on("message", (data: WebSocket.RawData) => {
      try {
        const message: TwilioStreamMessage = JSON.parse(data.toString());
        this.handleMessage(message);
      } catch (err) {
        this.emit(
          "error",
          new Error(`Failed to parse Twilio message: ${err}`)
        );
      }
    });

    this.ws.on("close", () => {
      console.log(
        `[Twilio] WebSocket closed for call ${this.callSid ?? "unknown"}`
      );
      if (this.callSid) {
        this.emit("stop", this.callSid);
      }
    });

    this.ws.on("error", (err: Error) => {
      console.error(`[Twilio] WebSocket error: ${err.message}`);
      this.emit("error", err);
    });
  }

  private handleMessage(message: TwilioStreamMessage): void {
    switch (message.event) {
      case "connected":
        console.log(
          `[Twilio] Media stream connected (protocol: ${message.protocol})`
        );
        break;

      case "start":
        this.streamSid = message.start.streamSid;
        this.callSid = message.start.callSid;
        console.log(
          `[Twilio] Stream started — streamSid: ${this.streamSid}, callSid: ${this.callSid}`
        );
        this.emit("start", {
          streamSid: this.streamSid,
          callSid: this.callSid,
          mediaFormat: message.start.mediaFormat,
        });
        break;

      case "media":
        this.emit("audio", message.media.payload);
        break;

      case "stop":
        console.log(`[Twilio] Stream stopped for call ${message.stop.callSid}`);
        this.emit("stop", message.stop.callSid);
        break;

      case "mark":
        // Marks are used for synchronization; no action needed for now
        break;
    }
  }

  /**
   * Send audio back to the caller via Twilio's media stream.
   * @param base64MulawAudio - Base64-encoded mulaw audio payload
   */
  sendAudio(base64MulawAudio: string): void {
    if (this.ws.readyState !== this.ws.OPEN || !this.streamSid) {
      return;
    }

    const message = JSON.stringify({
      event: "media",
      streamSid: this.streamSid,
      media: {
        payload: base64MulawAudio,
      },
    });

    this.ws.send(message);
  }

  /**
   * Send a mark message for synchronization.
   * @param name - A label for the mark
   */
  sendMark(name: string): void {
    if (this.ws.readyState !== this.ws.OPEN || !this.streamSid) {
      return;
    }

    const message = JSON.stringify({
      event: "mark",
      streamSid: this.streamSid,
      mark: { name },
    });

    this.ws.send(message);
  }

  /** The Twilio stream SID for this connection. */
  getStreamSid(): string | null {
    return this.streamSid;
  }

  /** The Twilio call SID for this connection. */
  getCallSid(): string | null {
    return this.callSid;
  }

  /** Close the WebSocket connection. */
  close(): void {
    if (this.ws.readyState === this.ws.OPEN) {
      this.ws.close();
    }
  }
}
