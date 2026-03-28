import { Router, Request, Response } from "express";
import twilio from "twilio";
import { config } from "../config";
import { recordCallStatus, type CallStatusEvent } from "./outbound";

const router = Router();

const VoiceResponse = twilio.twiml.VoiceResponse;

function getWsUrl(path: string): string {
  return config.server.publicUrl
    ? `wss://${config.server.publicUrl.replace(/^https?:\/\//, "")}${path}`
    : `wss://${config.server.host}:${config.server.port}${path}`;
}

function sendInboundTwiml(_req: Request, res: Response): void {
  console.log(
    `[TwiML] Building inbound TwiML with websocket url=${getWsUrl("/media-stream")}`,
  );
  const response = new VoiceResponse();

  // Greet the caller before connecting to the AI stream
  response.say("Connecting you to Voisli");

  // Open a bidirectional media stream to the bridge server
  const connect = response.connect();
  connect.stream({ url: getWsUrl("/media-stream") });

  res.type("text/xml");
  res.send(response.toString());
}

/**
 * /twiml
 * Returns TwiML XML that greets the caller and opens a bidirectional
 * WebSocket media stream to the bridge server (inbound calls).
 *
 * Twilio voice webhooks may be configured as either GET or POST.
 */
router.route("/twiml").get(sendInboundTwiml).post(sendInboundTwiml);

function sendOutboundTwiml(req: Request, res: Response): void {
  const purpose = (req.query.purpose as string) ?? "";
  console.log(
    `[TwiML] Building outbound TwiML purpose=${JSON.stringify(purpose)} websocket url=${getWsUrl("/media-stream-outbound")}`,
  );

  const response = new VoiceResponse();

  // Open a bidirectional media stream with custom parameters
  const connect = response.connect();
  const stream = connect.stream({ url: getWsUrl("/media-stream-outbound") });
  stream.parameter({ name: "purpose", value: purpose });
  stream.parameter({ name: "direction", value: "outbound" });

  res.type("text/xml");
  res.send(response.toString());
}

/**
 * /twiml/outbound
 * Returns TwiML for outbound calls. The `purpose` query parameter is passed
 * through as a custom parameter on the media stream so the orchestrator can
 * pick the right system prompt.
 */
router.route("/twiml/outbound").get(sendOutboundTwiml).post(sendOutboundTwiml);

function handleCallStatus(req: Request, res: Response): void {
  console.log(
    `[Twilio] Call status callback sid=${req.body.CallSid ?? "unknown"} status=${req.body.CallStatus ?? "unknown"} direction=${req.body.Direction ?? "unknown"}`,
  );
  const event: CallStatusEvent = {
    callSid: req.body.CallSid ?? "",
    callStatus: req.body.CallStatus ?? "",
    direction: req.body.Direction ?? "",
    to: req.body.To ?? "",
    from: req.body.From ?? "",
    timestamp: new Date().toISOString(),
  };

  recordCallStatus(event);
  res.sendStatus(204);
}

/**
 * /call-status
 * Twilio sends status callbacks here for outbound calls.
 */
router.route("/call-status").get(handleCallStatus).post(handleCallStatus);

export default router;
