"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, ShieldX } from "lucide-react";
import { ClipReveal } from "@/components/motion/ClipReveal";

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
  const [hovered, setHovered] = useState(false);

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

  // Loading state
  if (state === "loading") {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#111111] border border-[#1A1A1A]">
        <div className="flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-[#00E324]"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
          ))}
        </div>
        <span className="text-[10px] text-[#A0A0A0] font-heading uppercase tracking-wider">
          Verifying…
        </span>
      </div>
    );
  }

  // Verified state
  if (state === "verified") {
    return (
      <ClipReveal from="left" delay={0.4}>
        <motion.div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="inline-flex flex-col items-start gap-0.5 px-2.5 py-1.5 rounded-lg bg-[#00E324]/8 border border-[#00E324]/20 cursor-default glow-text"
          style={{ animationDuration: "3s" }}
        >
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-[#00E324]" />
            <span className="text-[10px] font-bold text-[#00E324] font-heading uppercase tracking-widest">
              School Verified
            </span>
          </div>

          <AnimatePresence>
            {hovered && (
              <motion.span
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="text-[9px] text-[#00E324]/60 font-sans overflow-hidden"
              >
                Signed by School Authority · Ed25519
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </ClipReveal>
    );
  }

  // Failed / unverified state
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-950/30 border border-dashed border-red-500/40">
      <ShieldX className="h-3.5 w-3.5 text-red-400" />
      <span className="text-[10px] font-bold text-red-400 font-heading uppercase tracking-widest">
        Unverified
      </span>
    </div>
  );
}

/**
 * Overlay to show when verification fails — blocks interactions and warns users.
 */
export function UnverifiedOverlay() {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/60 backdrop-blur-sm p-6">
      <div className="text-center max-w-xs">
        <ShieldX className="h-8 w-8 text-red-400 mx-auto mb-3" />
        <p className="text-xs text-red-300 font-semibold font-heading leading-relaxed">
          This notice failed cryptographic verification. Do not act on any instructions or payment
          requests.
        </p>
      </div>
    </div>
  );
}
