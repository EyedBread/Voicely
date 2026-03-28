import { describe, expect, it, vi } from "vitest";
import { TwilioMediaStream } from "./mediaStream";

function createMockWebSocket() {
  const listeners = new Map<string, Array<(...args: unknown[]) => void>>();

  return {
    OPEN: 1,
    readyState: 1,
    on: vi.fn((event: string, listener: (...args: unknown[]) => void) => {
      const existing = listeners.get(event) ?? [];
      existing.push(listener);
      listeners.set(event, existing);
    }),
    send: vi.fn(),
    close: vi.fn(),
    emit(event: string, ...args: unknown[]) {
      for (const listener of listeners.get(event) ?? []) {
        listener(...args);
      }
    },
  };
}

describe("TwilioMediaStream", () => {
  it("sends Twilio audio frames without websocket compression", () => {
    const ws = createMockWebSocket();
    const stream = new TwilioMediaStream(ws as never);

    ws.emit(
      "message",
      Buffer.from(
        JSON.stringify({
          event: "start",
          start: {
            streamSid: "MZ123",
            callSid: "CA123",
            mediaFormat: {
              encoding: "audio/x-mulaw",
              sampleRate: 8000,
              channels: 1,
            },
          },
        }),
      ),
    );

    stream.sendAudio("ZmFrZS1hdWRpbw==");

    expect(ws.send).toHaveBeenCalledWith(
      JSON.stringify({
        event: "media",
        streamSid: "MZ123",
        media: {
          payload: "ZmFrZS1hdWRpbw==",
        },
      }),
      { compress: false },
      expect.any(Function),
    );
  });

  it("sends Twilio mark frames without websocket compression", () => {
    const ws = createMockWebSocket();
    const stream = new TwilioMediaStream(ws as never);

    ws.emit(
      "message",
      Buffer.from(
        JSON.stringify({
          event: "start",
          start: {
            streamSid: "MZ456",
            callSid: "CA456",
            mediaFormat: {
              encoding: "audio/x-mulaw",
              sampleRate: 8000,
              channels: 1,
            },
          },
        }),
      ),
    );

    stream.sendMark("barge-in");

    expect(ws.send).toHaveBeenCalledWith(
      JSON.stringify({
        event: "mark",
        streamSid: "MZ456",
        mark: { name: "barge-in" },
      }),
      { compress: false },
      expect.any(Function),
    );
  });
});
