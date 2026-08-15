"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, AlertTriangle, ChevronDown } from "lucide-react";
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

  // Only admin posts are expected to carry a signature. A teacher post without
  // one is normal; an admin post without one is not, and gets flagged.
  const showUnverifiedOverlay = ann.authorRole === "admin" && ann.signature === null;

  const toggleExpanded = () => {
    if (showUnverifiedOverlay) return;
    setExpanded((prev) => !prev);
    if (!expanded && onExpand) onExpand(ann.id);
  };

  return (
    <ClipReveal from="bottom" delay={0.05 * index} className="w-full">
      <motion.article
        layout
        className={`card relative overflow-hidden ${
          isEmergency ? "border-danger/40" : ""
        } ${showUnverifiedOverlay ? "border-dashed border-danger/60" : ""}`}
        style={{
          borderLeftWidth: "3px",
          borderLeftStyle: "solid",
          borderLeftColor: isEmergency ? "var(--danger)" : "var(--primary)",
        }}
      >
        {showUnverifiedOverlay && <UnverifiedOverlay />}

        <div className={`p-5 ${showUnverifiedOverlay ? "pointer-events-none opacity-40" : ""}`}>
          {/* ── Author & meta ── */}
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full font-heading text-xs font-semibold ${
                  isEmergency
                    ? "bg-danger-soft text-danger"
                    : "bg-primary-soft text-primary"
                }`}
              >
                {ann.authorAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ann.authorAvatar}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-semibold text-ink">
                    {ann.authorName}
                  </span>
                  <span className="badge-neutral capitalize">{ann.authorRole}</span>
                </div>
                <p className="mt-0.5 text-xs text-ink-muted">
                  <span className="font-medium text-primary">{ann.cohortName}</span>
                  {" · "}
                  <time dateTime={ann.createdAt}>
                    {new Date(ann.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </p>
              </div>
            </div>

            {isEmergency && (
              <span className="badge inline-flex flex-shrink-0 bg-danger text-white">
                <AlertTriangle className="h-3 w-3" />
                Emergency
              </span>
            )}
          </div>

          {/* ── Content ── */}
          <h3 className="mb-2 font-heading text-[19px] font-semibold leading-snug text-ink">
            {ann.title}
          </h3>

          <p
            id={`announcement-body-${ann.id}`}
            className={`whitespace-pre-line text-[15px] leading-relaxed text-ink-soft ${
              expanded ? "" : "line-clamp-3"
            }`}
          >
            {ann.body}
          </p>

          {!showUnverifiedOverlay && ann.body.length > 180 && (
            <button
              onClick={toggleExpanded}
              aria-expanded={expanded}
              aria-controls={`announcement-body-${ann.id}`}
              className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
            >
              {expanded ? "Show less" : "Read more"}
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  expanded ? "rotate-180" : ""
                }`}
              />
            </button>
          )}

          {ann.mediaUrl && (
            <div className="mt-3 overflow-hidden rounded-xl border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ann.mediaUrl}
                alt=""
                className="max-h-72 w-full object-cover"
              />
            </div>
          )}

          {/* ── Footer ── */}
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
            <CryptoBadge
              signature={ann.signature}
              title={ann.title}
              body={ann.body}
              createdAt={ann.createdAt}
              publicKey={publicKey}
              authorRole={ann.authorRole}
            />

            {userRole === "parent" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Open reply modal
                }}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft transition-colors hover:text-primary"
              >
                <MessageSquare className="h-4 w-4" />
                Reply
              </button>
            )}
          </div>
        </div>
      </motion.article>
    </ClipReveal>
  );
}
