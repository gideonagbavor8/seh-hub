"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";

interface CryptoBadgeProps {
  signature: string | null;
  title: string;
  body: string;
  createdAt: string;
  publicKey: string;
  authorRole: string;
}

type VerifyState = "loading" | "verified" | "failed" | "none";

/**
 * Verifies an Ed25519 signature using the browser's Web Crypto API (SubtleCrypto).
 */
async function verifyAnnouncementClientSide(
  title: string,
  body: string,
  timestamp: string,
  signatureBase64: string,
  publicKeyBase64: string
): Promise<boolean> {
  try {
    // Decode the SPKI public key from base64 DER
    const publicKeyDer = Uint8Array.from(atob(publicKeyBase64), (c) => c.charCodeAt(0));

    // Import the public key
    const key = await crypto.subtle.importKey(
      "spki",
      publicKeyDer.buffer,
      { name: "Ed25519" },
      false,
      ["verify"]
    );

    // Build the canonical payload (must match server-side)
    const payload = `${title}|${body}|${timestamp}`;
    const data = new TextEncoder().encode(payload);

    // Decode the signature
    const signature = Uint8Array.from(atob(signatureBase64), (c) => c.charCodeAt(0));

    // Verify
    return await crypto.subtle.verify("Ed25519", key, signature, data);
  } catch {
    return false;
  }
}

export default function CryptoBadge({
  signature,
  title,
  body,
  createdAt,
  publicKey,
  authorRole,
}: CryptoBadgeProps) {
  const [state, setState] = useState<VerifyState>("loading");

  useEffect(() => {
    // Teacher posts are not signed — this is expected
    if (!signature && authorRole === "teacher") {
      setState("none");
      return;
    }

    // No signature on an admin post = unverified
    if (!signature) {
      setState("failed");
      return;
    }

    // No public key configured = can't verify
    if (!publicKey) {
      setState("failed");
      return;
    }

    let cancelled = false;

    verifyAnnouncementClientSide(title, body, createdAt, signature, publicKey).then(
      (valid) => {
        if (!cancelled) {
          setState(valid ? "verified" : "failed");
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [signature, title, body, createdAt, publicKey, authorRole]);

  // Teacher posts — no badge shown
  if (state === "none") return null;

  if (state === "loading") {
    return (
      <span className="badge-neutral">
        <ShieldAlert className="h-3.5 w-3.5" />
        Checking…
      </span>
    );
  }

  if (state === "verified") {
    return (
      <span
        className="badge-primary"
        title="Signed by the school authority using an Ed25519 key"
      >
        <ShieldCheck className="h-3.5 w-3.5" />
        School verified
      </span>
    );
  }

  return (
    <span
      className="badge-danger border border-dashed border-danger/50"
      title="This notice could not be cryptographically verified"
    >
      <ShieldX className="h-3.5 w-3.5" />
      Unverified
    </span>
  );
}

/**
 * Overlay shown when an admin notice fails verification. Deliberately loud:
 * an unverified notice is the exact surface a fee-scam would try to imitate.
 */
export function UnverifiedOverlay() {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-surface/85 p-6 backdrop-blur-[2px]">
      <div className="max-w-xs text-center">
        <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-danger-soft">
          <ShieldX className="h-5 w-5 text-danger" />
        </span>
        <p className="font-heading text-sm font-semibold text-danger">
          This notice failed verification
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
          Do not act on any instructions or payment requests it contains. Contact the
          school office directly.
        </p>
      </div>
    </div>
  );
}
