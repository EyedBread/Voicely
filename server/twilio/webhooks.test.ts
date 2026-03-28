import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import router from "./webhooks";

const { recordCallStatusMock } = vi.hoisted(() => ({
  recordCallStatusMock: vi.fn(),
}));

vi.mock("./outbound", () => ({
  recordCallStatus: recordCallStatusMock,
}));

function createApp() {
  const app = express();
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
  app.use(router);
  return app;
}

describe("Twilio webhooks", () => {
  beforeEach(() => {
    recordCallStatusMock.mockReset();
  });

  describe("/twiml", () => {
    it("returns inbound TwiML for GET requests", async () => {
      const app = createApp();
      const res = await request(app).get("/twiml").expect(200);

      expect(res.type).toMatch(/text\/xml/);
      expect(res.text).toContain("<Say>Connecting you to Voisli</Say>");
      expect(res.text).toContain('url="wss://');
      expect(res.text).toContain("/media-stream");
    });

    it("returns inbound TwiML for POST requests", async () => {
      const app = createApp();
      const res = await request(app).post("/twiml").expect(200);

      expect(res.text).toContain("<Response>");
      expect(res.text).toContain("/media-stream");
    });
  });

  describe("/twiml/outbound", () => {
    it("returns outbound TwiML for GET requests", async () => {
      const app = createApp();
      const res = await request(app)
        .get("/twiml/outbound?purpose=make%20reservation")
        .expect(200);

      expect(res.type).toMatch(/text\/xml/);
      expect(res.text).toContain("/media-stream-outbound");
      expect(res.text).toContain('name="purpose"');
      expect(res.text).toContain("make reservation");
    });
  });

  describe("/call-status", () => {
    it("records status updates sent as POST", async () => {
      const app = createApp();

      await request(app)
        .post("/call-status")
        .type("form")
        .send({
          CallSid: "CA123",
          CallStatus: "ringing",
          Direction: "outbound-api",
          To: "+123",
          From: "+456",
        })
        .expect(204);

      expect(recordCallStatusMock).toHaveBeenCalledTimes(1);
      expect(recordCallStatusMock.mock.calls[0][0]).toMatchObject({
        callSid: "CA123",
        callStatus: "ringing",
        direction: "outbound-api",
        to: "+123",
        from: "+456",
      });
    });
  });
});
