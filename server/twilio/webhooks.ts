import { Router, type Request, type Response } from "express";
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
  try {
    console.log(
      `[TwiML] Building inbound TwiML with websocket url=${getWsUrl("/media-stream")}`,
    );

    const response = new VoiceResponse();
    response.say("Connecting you to Voisli");

    const connect = response.connect();
    connect.stream({ url: getWsUrl("/media-stream") });

    res.type("text/xml");
    res.send(response.toString());
  } catch (err) {
    console.error(
      `[TwiML] Error generating inbound TwiML: ${err instanceof Error ? err.message : err}`,
    );
    const fallback = new VoiceResponse();
    fallback.say(
      "I'm sorry, we're experiencing technical difficulties. Please try again later.",
    );
    res.type("text/xml");
    res.send(fallback.toString());
  }
}

router.route("/twiml").get(sendInboundTwiml).post(sendInboundTwiml);

function sendOutboundTwiml(req: Request, res: Response): void {
  try {
    const purpose = (req.query.purpose as string) ?? "";
    console.log(
      `[TwiML] Building outbound TwiML purpose=${JSON.stringify(purpose)} websocket url=${getWsUrl("/media-stream-outbound")}`,
    );

    const response = new VoiceResponse();
    const connect = response.connect();
    const stream = connect.stream({ url: getWsUrl("/media-stream-outbound") });
    stream.parameter({ name: "purpose", value: purpose });
    stream.parameter({ name: "direction", value: "outbound" });

    res.type("text/xml");
    res.send(response.toString());
  } catch (err) {
    console.error(
      `[TwiML] Error generating outbound TwiML: ${err instanceof Error ? err.message : err}`,
    );
    const fallback = new VoiceResponse();
    fallback.say(
      "I'm sorry, we're experiencing technical difficulties with this call.",
    );
    res.type("text/xml");
    res.send(fallback.toString());
  }
}

router
  .route("/twiml/outbound")
  .get(sendOutboundTwiml)
  .post(sendOutboundTwiml);

function handleCallStatus(req: Request, res: Response): void {
  try {
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
  } catch (err) {
    console.error(
      `[TwiML] Error processing call status: ${err instanceof Error ? err.message : err}`,
    );
    res.sendStatus(204);
  }
}

router.route("/call-status").get(handleCallStatus).post(handleCallStatus);

export default router;
