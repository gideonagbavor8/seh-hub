// src/lib/crypto.ts
// Ed25519 digital signature utilities using Node.js native crypto (no third-party libs)
// Used for signing and verifying communication tokens / challenge-response auth flows.

import { generateKeyPairSync, sign, verify, createPublicKey, createPrivateKey } from "crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KeyPair {
  publicKey: string;  // Base64-encoded DER public key
  privateKey: string; // Base64-encoded DER private key (PKCS#8)
}

export interface SignedPayload {
  data: string;       // The original string data
  signature: string;  // Base64-encoded Ed25519 signature
}

// ---------------------------------------------------------------------------
// Key generation
// Generates a new Ed25519 key pair and returns both keys as Base64 strings.
// Run once at school setup; store in environment variables.
// ---------------------------------------------------------------------------
export function generateEd25519KeyPair(): KeyPair {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519", {
    publicKeyEncoding: { type: "spki", format: "der" },
    privateKeyEncoding: { type: "pkcs8", format: "der" },
  });

  return {
    publicKey: publicKey.toString("base64"),
    privateKey: privateKey.toString("base64"),
  };
}

// ---------------------------------------------------------------------------
// Signing
// Signs an arbitrary string payload with the school's Ed25519 private key.
// ---------------------------------------------------------------------------
export function signPayload(data: string, privateKeyBase64: string): string {
  const privateKeyDer = Buffer.from(privateKeyBase64, "base64");

  const privateKey = createPrivateKey({
    key: privateKeyDer,
    format: "der",
    type: "pkcs8",
  });

  const dataBuffer = Buffer.from(data, "utf8");
  const signature = sign(null, dataBuffer, privateKey);

  return signature.toString("base64");
}

// ---------------------------------------------------------------------------
// Verification
// Verifies a Base64-encoded Ed25519 signature against the school's public key.
// Returns true if the signature is valid, false otherwise.
// ---------------------------------------------------------------------------
export function verifySignature(
  data: string,
  signatureBase64: string,
  publicKeyBase64: string
): boolean {
  try {
    const publicKeyDer = Buffer.from(publicKeyBase64, "base64");

    const publicKey = createPublicKey({
      key: publicKeyDer,
      format: "der",
      type: "spki",
    });

    const dataBuffer = Buffer.from(data, "utf8");
    const signatureBuffer = Buffer.from(signatureBase64, "base64");

    return verify(null, dataBuffer, publicKey, signatureBuffer);
  } catch {
    // Any key parsing or verification error means invalid signature
    return false;
  }
}

// ---------------------------------------------------------------------------
// Convenience: sign and return a structured SignedPayload
// ---------------------------------------------------------------------------
export function createSignedPayload(data: string, privateKeyBase64: string): SignedPayload {
  return {
    data,
    signature: signPayload(data, privateKeyBase64),
  };
}

// ---------------------------------------------------------------------------
// School key helpers — read from environment variables at runtime
// ---------------------------------------------------------------------------
export function getSchoolPrivateKey(): string {
  const key = process.env.SCHOOL_PRIVATE_KEY;
  if (!key) throw new Error("SCHOOL_PRIVATE_KEY environment variable is not set.");
  return key;
}

export function getSchoolPublicKey(): string {
  const key = process.env.SCHOOL_PUBLIC_KEY;
  if (!key) throw new Error("SCHOOL_PUBLIC_KEY environment variable is not set.");
  return key;
}
