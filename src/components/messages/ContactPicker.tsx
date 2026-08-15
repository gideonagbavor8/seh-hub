"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export interface ContactOption {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  context: string;
}

interface ContactPickerProps {
  open: boolean;
  contacts: ContactOption[];
  onClose: () => void;
  onSelect: (contact: ContactOption) => void;
}

export function ContactPicker({ open, contacts, onClose, onSelect }: ContactPickerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4 py-6"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Choose a contact"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl border border-line bg-surface"
            style={{ boxShadow: "var(--shadow-lift)" }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line p-5">
              <div>
                <h2 className="font-heading text-xl font-semibold text-ink">
                  New conversation
                </h2>
                <p className="mt-1 text-sm text-ink-muted">
                  Choose someone to message.
                </p>
              </div>
              <button
                onClick={onClose}
                className="-mr-1 -mt-1 rounded-xl p-2 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {contacts.length === 0 ? (
                <p className="rounded-xl bg-surface-2 p-5 text-sm text-ink-soft">
                  No contacts available yet. Teachers appear here once your child is
                  enrolled in a class.
                </p>
              ) : (
                contacts.map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => onSelect(contact)}
                    className="flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-3 text-left transition-colors hover:border-line hover:bg-surface-2"
                  >
                    <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft font-heading text-sm font-semibold text-primary">
                      {contact.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={contact.avatarUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        contact.name
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-semibold text-ink">
                          {contact.name}
                        </span>
                        <span className="badge-neutral flex-shrink-0 capitalize">
                          {contact.role}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-sm text-ink-muted">
                        {contact.context}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>

            <div className="flex justify-end border-t border-line p-4">
              <button type="button" onClick={onClose} className="btn-secondary">
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
