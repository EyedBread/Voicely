import { Router, Request, Response } from "express";
import twilio from "twilio";
import { config } from "../config";

const router = Router();

const VoiceResponse = twilio.twiml.VoiceResponse;

/**
 * POST /twiml
 * Returns TwiML XML that greets the caller and opens a bidirectional
 * WebSocket media stream to the bridge server.
 */
router.post("/twiml", (_req: Request, res: Response) => {
  const response = new VoiceResponse();

  // Greet the caller before connecting to the AI stream
  response.say("Connecting you to Voisli");

  // Open a bidirectional media stream to the bridge server
  const connect = response.connect();
  const wsUrl = config.server.publicUrl
    ? `wss://${config.server.publicUrl.replace(/^https?:\/\//, "")}/media-stream`
    : `wss://${config.server.host}:${config.server.port}/media-stream`;

  connect.stream({ url: wsUrl });

  res.type("text/xml");
  res.send(response.toString());
});

export default router;
