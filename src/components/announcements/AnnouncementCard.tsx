"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Zap } from "lucide-react";
import { ClipReveal } from "@/components/motion/ClipReveal";
import CryptoBadge, { UnverifiedOverlay } from "./CryptoBadge";

export interface AnnouncementData {
  id: string;
  title: string;
  body: string;
  priority: "standard" | "emergency" | null;
  signature: string | null;
  mediaUrl: string | null;
  createdAt: string;
  authorName: string;
  authorRole: string;
  authorAvatar: string | null;
  cohortName: string;
}

interface AnnouncementCardProps {
  announcement: AnnouncementData;
  index: number;
  publicKey: string;
  userRole: string;
  /** Callback when card is expanded to detail view */
  onExpand?: (id: string) => void;
}

export default function AnnouncementCard({
  announcement: ann,
  index,
  publicKey,
  userRole,
  onExpand,
}: AnnouncementCardProps) {
  const [expanded, setExpanded] = useState(false);

  const isEmergency = ann.priority === "emergency";
  const initials = ann.authorName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Determine if we need to show the unverified overlay
  // Only admin posts should be signed. Teacher posts without signature are fine.
  const showUnverifiedOverlay =
    ann.authorRole === "admin" && ann.signature === null;

  const handleClick = () => {
    if (showUnverifiedOverlay) return;
    setExpanded(!expanded);
    if (!expanded && onExpand) onExpand(ann.id);
  };

  return (
    <ClipReveal from="left" delay={0.06 * index} className="w-full">
      <motion.article
        layout
        onClick={handleClick}
        whileHover={
          showUnverifiedOverlay
            ? undefined
            : { y: -2, borderColor: "rgba(0,227,36,0.38)" }
        }
        transition={{ duration: 0.2 }}
        className={`relative overflow-hidden rounded-2xl bg-[#111111] border cursor-pointer transition-shadow duration-300 ${
          isEmergency
            ? "border-red-500/30"
            : "border-[rgba(255,255,255,0.03)]"
        } ${showUnverifiedOverlay ? "border-dashed border-red-500/50" : ""}`}
        style={{
          borderLeft: isEmergency
            ? "3px solid #FF4444"
            : "3px solid #00E324",
          boxShadow: isEmergency
            ? "0 4px 40px rgba(255,68,68,0.08)"
            : "0 4px 40px rgba(0,0,0,0.4)",
        }}
      >
        {/* Emergency corner glow */}
        {isEmergency && (
          <div
            className="pointer-events-none absolute top-0 left-0 w-32 h-32"
            style={{
              background:
                "radial-gradient(ellipse at 0% 0%, rgba(255,68,68,0.08) 0%, transparent 70%)",
            }}
          />
        )}

        {/* Unverified overlay */}
        {showUnverifiedOverlay && <UnverifiedOverlay />}

        <div
          className={`p-5 ${
            showUnverifiedOverlay ? "pointer-events-none opacity-40" : ""
          }`}
        >
          {/* Top: author + meta */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* Avatar */}
              <div
                className={`flex-shrink-0 h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold font-heading ${
                  isEmergency
                    ? "bg-red-950 text-red-400 ring-1 ring-red-500/30"
                    : "bg-[#1A1A1A] text-[#00E324] ring-1 ring-[#00E324]/20"
                }`}
              >
                {ann.authorAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ann.authorAvatar}
                    alt={ann.authorName}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-semibold text-white font-heading truncate">
                    {ann.authorName}
                  </span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#1A1A1A] text-[#A0A0A0] uppercase tracking-wider font-heading border border-[#2A2A2A]">
                    {ann.authorRole}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] text-[#00E324]/70 font-sans font-medium">
                    {ann.cohortName}
                  </span>
                  <span className="text-[#A0A0A0]/40">·</span>
                  <span className="text-[11px] text-[#A0A0A0]/60 font-sans">
                    {new Date(ann.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Emergency pill */}
            {isEmergency && (
              <motion.span
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-[#FF4444] text-white uppercase tracking-wider font-heading shadow-[0_0_12px_rgba(255,68,68,0.4)]"
              >
                <Zap className="h-3 w-3 fill-white" />
                Emergency
              </motion.span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-[16px] sm:text-[18px] font-bold font-heading text-white leading-snug mb-2">
            {ann.title}
          </h3>

          {/* Body */}
          <p
            className={`text-[13px] sm:text-[14px] text-[#C0C0C0] font-sans leading-relaxed ${
              expanded ? "" : "line-clamp-3"
            }`}
          >
            {ann.body}
          </p>

          {/* Media */}
          {ann.mediaUrl && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="mt-3 rounded-xl overflow-hidden border border-[#1A1A1A]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ann.mediaUrl}
                alt="Announcement media"
                className="w-full max-h-64 object-cover"
              />
            </motion.div>
          )}

          {/* Bottom: CryptoBadge + actions */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#1A1A1A]">
            <CryptoBadge
              signature={ann.signature}
              title={ann.title}
              body={ann.body}
              createdAt={ann.createdAt}
              publicKey={publicKey}
              authorRole={ann.authorRole}
            />

            <div className="flex items-center gap-3">
              {/* Reply button — parent only */}
              {userRole === "parent" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Open reply modal
                  }}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[#A0A0A0] hover:text-[#00E324] transition-colors font-heading"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Reply
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.article>
    </ClipReveal>
  );
}
