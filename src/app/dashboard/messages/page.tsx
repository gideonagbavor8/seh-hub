"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Search, ArrowLeft, Send, Check, Plus, MessagesSquare, Loader2 } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { ContactPicker, type ContactOption } from "@/components/messages/ContactPicker";

interface ThreadSummary {
  thread_id: string;
  participant_id: string;
  participant_name: string;
  participant_role: string;
  participant_avatar_url: string | null;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  cohort_name?: string | null;
}

interface MessageItem {
  id: string;
  body: string;
  sender_id: string;
  sender_name: string;
  sender_avatar_url: string | null;
  sender_role: string;
  created_at: string;
  is_read: boolean;
}

const MAX_MESSAGE_LENGTH = 1000;

function createThreadId(a: string, b: string) {
  return [a, b].sort().join(":");
}

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((segment) => segment[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function MessagesPage() {
  const { user, setPageTitle } = useDashboard();
  const reduceMotion = useReducedMotion();
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [pendingThread, setPendingThread] = useState<ThreadSummary | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [composer, setComposer] = useState("");
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isContactLoading, setIsContactLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hiddenTab, setHiddenTab] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const activeThread = useMemo(() => {
    if (pendingThread?.thread_id === activeThreadId) {
      return pendingThread;
    }
    return threads.find((thread) => thread.thread_id === activeThreadId) ?? null;
  }, [activeThreadId, pendingThread, threads]);

  const filteredThreads = useMemo(
    () =>
      threads.filter((thread) =>
        thread.participant_name.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [searchTerm, threads]
  );

  useEffect(() => {
    setPageTitle("Messages");
  }, [setPageTitle]);

  useEffect(() => {
    const updateViewport = () => setIsMobileView(window.innerWidth < 1024);
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  const fetchThreads = useCallback(async () => {
    setIsLoadingThreads(true);
    try {
      const response = await fetch("/api/messages");
      const json = await response.json();
      if (json.success) {
        setThreads(json.data);
      } else {
        setErrorMessage(json.error || "Unable to load conversations");
      }
    } catch (error) {
      setErrorMessage("Unable to load conversations");
      console.error(error);
    } finally {
      setIsLoadingThreads(false);
    }
  }, []);

  const fetchContacts = useCallback(async () => {
    setIsContactLoading(true);
    try {
      const response = await fetch("/api/messages/contacts");
      const json = await response.json();
      if (json.success) {
        setContacts(json.data);
      } else {
        setErrorMessage(json.error || "Unable to load contacts");
      }
    } catch (error) {
      setErrorMessage("Unable to load contacts");
      console.error(error);
    } finally {
      setIsContactLoading(false);
    }
  }, []);

  const fetchActiveMessages = useCallback(async (threadId: string) => {
    if (!threadId) {
      return;
    }
    setIsLoadingMessages(true);
    try {
      const response = await fetch(`/api/messages/${encodeURIComponent(threadId)}`);
      const json = await response.json();
      if (json.success) {
        setMessages(json.data);
      } else {
        setErrorMessage(json.error || "Unable to load conversation");
      }
    } catch (error) {
      setErrorMessage("Unable to load conversation");
      console.error(error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  const handleSelectThread = useCallback(
    (threadId: string) => {
      setPendingThread(null);
      setActiveThreadId(threadId);
      fetchActiveMessages(threadId);
    },
    [fetchActiveMessages]
  );

  const handleCreateThread = useCallback(
    (contact: ContactOption) => {
      const threadId = createThreadId(user.id, contact.id);
      const placeholder: ThreadSummary = {
        thread_id: threadId,
        participant_id: contact.id,
        participant_name: contact.name,
        participant_role: contact.role,
        participant_avatar_url: contact.avatarUrl,
        last_message: "",
        last_message_at: new Date().toISOString(),
        unread_count: 0,
        cohort_name: contact.context.includes("Cohort")
          ? contact.context.replace("Cohort: ", "")
          : undefined,
      };
      setPendingThread(placeholder);
      setActiveThreadId(threadId);
      setShowContactPicker(false);
      fetchActiveMessages(threadId);
    },
    [fetchActiveMessages, user.id]
  );

  const openContactPicker = useCallback(() => {
    setShowContactPicker(true);
    fetchContacts();
  }, [fetchContacts]);

  useEffect(() => {
    fetchThreads();
    const interval = window.setInterval(fetchThreads, 30000);
    return () => clearInterval(interval);
  }, [fetchThreads]);

  useEffect(() => {
    const handleVisibility = () => setHiddenTab(document.visibilityState !== "visible");
    handleVisibility();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  useEffect(() => {
    if (!activeThreadId || hiddenTab) {
      return;
    }

    const interval = window.setInterval(() => {
      fetchActiveMessages(activeThreadId);
    }, 8000);

    return () => {
      clearInterval(interval);
    };
  }, [activeThreadId, fetchActiveMessages, hiddenTab]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSendMessage = useCallback(async () => {
    if (!activeThread || !composer.trim()) {
      return;
    }

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: activeThread.participant_id,
          body: composer.trim(),
        }),
      });
      const json = await response.json();
      if (json.success) {
        setComposer("");
        await fetchThreads();
        await fetchActiveMessages(activeThread.thread_id);
      } else {
        setErrorMessage(json.error || "Unable to send message");
      }
    } catch (error) {
      setErrorMessage("Unable to send message");
      console.error(error);
    }
  }, [activeThread, composer, fetchActiveMessages, fetchThreads]);

  const handleComposerKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const renderThreadItem = (thread: ThreadSummary) => {
    const isActive = thread.thread_id === activeThread?.thread_id;
    return (
      <li key={thread.thread_id}>
        <button
          type="button"
          onClick={() => handleSelectThread(thread.thread_id)}
          aria-current={isActive ? "true" : undefined}
          className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors duration-150 ${
            isActive
              ? "border-primary bg-primary-soft"
              : "border-transparent hover:border-line hover:bg-surface-2"
          }`}
        >
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft font-heading text-sm font-semibold text-primary">
            {thread.participant_avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thread.participant_avatar_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              initialsOf(thread.participant_name)
            )}
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm font-semibold text-ink">
                {thread.participant_name}
              </span>
              <span className="flex-shrink-0 text-xs text-ink-muted">
                {new Date(thread.last_message_at).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </span>

            <span className="mt-1 flex items-center justify-between gap-2">
              <span className="truncate text-sm text-ink-muted">
                {thread.last_message || "No messages yet"}
              </span>
              {thread.unread_count > 0 && (
                <span className="inline-flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-on-primary">
                  {thread.unread_count}
                </span>
              )}
            </span>

            {thread.cohort_name ? (
              <span className="mt-1 block text-xs text-ink-muted">
                {thread.cohort_name}
              </span>
            ) : null}
          </span>
        </button>
      </li>
    );
  };

  const threadPanel = (
    <div className="card flex h-full flex-col overflow-hidden">
      {activeThread ? (
        <>
          <div className="flex items-center gap-3 border-b border-line px-5 py-4">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft font-heading text-sm font-semibold text-primary">
              {activeThread.participant_avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activeThread.participant_avatar_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                initialsOf(activeThread.participant_name)
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate font-heading text-base font-semibold text-ink">
                {activeThread.participant_name}
              </p>
              <p className="text-xs capitalize text-ink-muted">
                {activeThread.participant_role}
                {activeThread.cohort_name ? ` · ${activeThread.cohort_name}` : ""}
              </p>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-canvas px-5 py-4">
            {isLoadingMessages && messages.length === 0 ? (
              <div className="flex justify-center py-20 text-sm text-ink-muted">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading messages…
              </div>
            ) : messages.length === 0 ? (
              <p className="rounded-xl bg-surface-2 p-6 text-center text-sm text-ink-soft">
                No messages yet. Send the first one below.
              </p>
            ) : (
              messages.map((message) => {
                const isMine = message.sender_id === user.id;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-2.5 ${
                        isMine
                          ? "rounded-[16px_16px_4px_16px] bg-primary text-on-primary"
                          : "rounded-[16px_16px_16px_4px] border border-line bg-surface text-ink"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                        {message.body}
                      </p>
                      <div
                        className={`mt-1 flex items-center justify-end gap-1.5 text-[11px] ${
                          isMine ? "text-on-primary/70" : "text-ink-muted"
                        }`}
                      >
                        <time dateTime={message.created_at}>
                          {new Date(message.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </time>
                        {isMine && message.is_read ? (
                          <Check className="h-3.5 w-3.5" aria-label="Read" />
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-line p-3">
            <div className="flex items-end gap-2">
              <textarea
                rows={1}
                value={composer}
                onChange={(event) => setComposer(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder="Type your message…"
                aria-label="Message"
                maxLength={MAX_MESSAGE_LENGTH}
                className="input max-h-40 min-h-[46px] flex-1 resize-none"
              />
              <button
                type="button"
                onClick={handleSendMessage}
                disabled={!composer.trim()}
                className="btn-primary h-[46px] w-[46px] flex-shrink-0 p-0"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            {composer.length > MAX_MESSAGE_LENGTH * 0.8 && (
              <p className="mt-1.5 text-right text-xs text-ink-muted">
                {composer.length} / {MAX_MESSAGE_LENGTH}
              </p>
            )}
          </div>
        </>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-2 text-ink-muted">
            <MessagesSquare className="h-7 w-7" />
          </span>
          <p className="font-heading text-xl font-semibold text-ink">
            Select a conversation
          </p>
          <p className="max-w-sm text-sm text-ink-muted">
            Choose a thread on the left, or start a new conversation with a teacher or
            parent.
          </p>
          <button type="button" onClick={openContactPicker} className="btn-primary mt-2">
            <Plus className="h-4 w-4" />
            New message
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-3xl font-semibold text-ink">Messages</h2>
          <div className="rule-accent mt-3" />
          <p className="mt-3 text-sm text-ink-muted">
            Private conversations between parents and teachers.
          </p>
        </div>

        <button
          type="button"
          onClick={openContactPicker}
          disabled={isContactLoading}
          className="btn-primary"
        >
          {isContactLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          New message
        </button>
      </div>

      {errorMessage && (
        <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {errorMessage}
        </p>
      )}

      <div className="grid flex-1 gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* ── Thread list ── */}
        <aside className="card flex flex-col overflow-hidden">
          <div className="border-b border-line p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search conversations"
                aria-label="Search conversations"
                className="input pl-9"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {isLoadingThreads && threads.length === 0 ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="flex items-center gap-3 px-1 py-2">
                    <div className="skeleton h-11 w-11 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-3 w-1/2" />
                      <div className="skeleton h-3 w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredThreads.length === 0 ? (
              <p className="p-6 text-center text-sm text-ink-muted">
                {searchTerm ? "No conversations match that search." : "No conversations yet."}
              </p>
            ) : (
              <ul className="space-y-1">
                {filteredThreads.map((thread) => renderThreadItem(thread))}
              </ul>
            )}
          </div>
        </aside>

        <div className="hidden lg:block">{threadPanel}</div>
      </div>

      <ContactPicker
        open={showContactPicker}
        contacts={contacts}
        onClose={() => setShowContactPicker(false)}
        onSelect={handleCreateThread}
      />

      {/* ── Mobile conversation view ── */}
      <AnimatePresence>
        {isMobileView && activeThread ? (
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { x: "100%" }}
            animate={reduceMotion ? { opacity: 1 } : { x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed inset-0 z-50 flex flex-col bg-canvas p-3 lg:hidden"
          >
            <div className="mb-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveThreadId(null)}
                className="rounded-xl p-2 text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
                aria-label="Back to conversations"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <p className="font-heading text-lg font-semibold text-ink">
                {activeThread.participant_name}
              </p>
            </div>
            <div className="flex-1 overflow-hidden">{threadPanel}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
