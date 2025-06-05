import crypto from "crypto";

export function verifyWebhookSignature(signature: string, messageId: string, timestamp: string, body: string, secret: string): boolean {
  const message = messageId + timestamp + body;
  const expectedSignature = "sha256=" + crypto.createHmac("sha256", secret).update(message).digest("hex");

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}
