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
  private inboundMessageCount = 0;
  private outboundMessageCount = 0;

  constructor(ws: WebSocket) {
    super();
    this.ws = ws;
    this.disableCompression();
    this.setupListeners();
  }

  private disableCompression(): void {
    const socket = this.ws as WebSocket & {
      _extensions?: Record<string, unknown>;
      _sender?: { _extensions?: Record<string, unknown> };
    };

    socket._extensions = {};

    if (socket._sender) {
      socket._sender._extensions = {};
    }
  }

  private setupListeners(): void {
    this.ws.on("message", (data: WebSocket.RawData) => {
      try {
        this.inboundMessageCount++;
        console.log(
          `[Twilio] <- raw message #${this.inboundMessageCount} bytes=${data.toString().length} readyState=${this.ws.readyState}`,
        );
        const message: TwilioStreamMessage = JSON.parse(data.toString());
        this.handleMessage(message);
      } catch (err) {
        this.emit("error", new Error(`Failed to parse Twilio message: ${err}`));
      }
    });

    this.ws.on("close", (code: number, reason: Buffer) => {
      console.log(
        `[Twilio] WebSocket closed for call ${this.callSid ?? "unknown"} code=${code} reason=${reason.toString() || "none"} inboundMessages=${this.inboundMessageCount} outboundMessages=${this.outboundMessageCount}`,
      );
      if (this.callSid) {
        this.emit("stop", this.callSid);
      }
    });

    this.ws.on("error", (err: Error) => {
      console.error(`[Twilio] WebSocket error: ${err.message}`);
      this.emit("error", err);
    });

    this.ws.on("ping", (data: Buffer) => {
      console.log(`[Twilio] <- ping bytes=${data.length}`);
    });

    this.ws.on("pong", (data: Buffer) => {
      console.log(`[Twilio] <- pong bytes=${data.length}`);
    });
  }

  private handleMessage(message: TwilioStreamMessage): void {
    switch (message.event) {
      case "connected":
        console.log(
          `[Twilio] Media stream connected protocol=${message.protocol} version=${message.version} extensions=${(this.ws as WebSocket & { extensions?: string }).extensions ?? "none"}`,
        );
        break;

      case "start":
        this.streamSid = message.start.streamSid;
        this.callSid = message.start.callSid;
        const tracks = Array.isArray(message.start.tracks)
          ? message.start.tracks.join(",")
          : "unknown";
        console.log(
          `[Twilio] Stream started streamSid=${this.streamSid} callSid=${this.callSid} tracks=${tracks} mediaFormat=${JSON.stringify(message.start.mediaFormat)} customParameters=${JSON.stringify(message.start.customParameters ?? {})}`,
        );
        this.emit("start", {
          streamSid: this.streamSid,
          callSid: this.callSid,
          mediaFormat: message.start.mediaFormat,
        });
        break;

      case "media":
        console.log(
          `[Twilio] <- media chunk=${message.media.chunk} timestamp=${message.media.timestamp} payloadLength=${message.media.payload.length}`,
        );
        this.emit("audio", message.media.payload);
        break;

      case "stop":
        console.log(
          `[Twilio] Stream stopped for call ${message.stop.callSid} streamSid=${message.streamSid}`,
        );
        this.emit("stop", message.stop.callSid);
        break;

      case "mark":
        console.log(`[Twilio] <- mark ${message.mark.name}`);
        break;
    }
  }

  sendAudio(base64MulawAudio: string): void {
    if (this.ws.readyState !== this.ws.OPEN || !this.streamSid) {
      console.warn(
        `[Twilio] Skipping audio send readyState=${this.ws.readyState} streamSid=${this.streamSid ?? "none"}`,
      );
      return;
    }

    const message = JSON.stringify({
      event: "media",
      streamSid: this.streamSid,
      media: {
        payload: base64MulawAudio,
      },
    });

    this.outboundMessageCount++;
    const messageNumber = this.outboundMessageCount;
    console.log(
      `[Twilio] -> media #${messageNumber} streamSid=${this.streamSid} payloadLength=${base64MulawAudio.length} compress=false extensions=${(this.ws as WebSocket & { extensions?: string }).extensions ?? "none"}`,
    );
    this.ws.send(message, { compress: false }, (err?: Error) => {
      if (err) {
        console.error(
          `[Twilio] Failed to send media #${messageNumber}: ${err.message}`,
        );
      } else {
        console.log(`[Twilio] -> media #${messageNumber} sent`);
      }
    });
  }

  sendMark(name: string): void {
    if (this.ws.readyState !== this.ws.OPEN || !this.streamSid) {
      console.warn(
        `[Twilio] Skipping mark send readyState=${this.ws.readyState} streamSid=${this.streamSid ?? "none"}`,
      );
      return;
    }

    const message = JSON.stringify({
      event: "mark",
      streamSid: this.streamSid,
      mark: { name },
    });

    this.outboundMessageCount++;
    const messageNumber = this.outboundMessageCount;
    console.log(
      `[Twilio] -> mark #${messageNumber} streamSid=${this.streamSid} name=${name} compress=false`,
    );
    this.ws.send(message, { compress: false }, (err?: Error) => {
      if (err) {
        console.error(
          `[Twilio] Failed to send mark #${messageNumber}: ${err.message}`,
        );
      } else {
        console.log(`[Twilio] -> mark #${messageNumber} sent`);
      }
    });
  }

  getStreamSid(): string | null {
    return this.streamSid;
  }

  getCallSid(): string | null {
    return this.callSid;
  }

  close(): void {
    if (this.ws.readyState === this.ws.OPEN) {
      this.ws.close();
    }
  }
}
