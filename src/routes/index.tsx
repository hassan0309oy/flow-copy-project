import { useChat } from "@ai-sdk/react";
import { createFileRoute } from "@tanstack/react-router";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  ArrowUp,
  CheckCircle2,
  Circle,
  FileText,
  Globe,
  Link2,
  ListChecks,
  Loader2,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Markdown } from "@/components/deerflow/Markdown";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DeerFlow — Super-agent IA de recherche et de production" },
      {
        name: "description",
        content:
          "DeerFlow : agent IA autonome qui planifie, cherche sur le web, lit des pages et produit des rapports, du code et des fichiers prêts à l'emploi.",
      },
      { property: "og:title", content: "DeerFlow — Super-agent IA" },
      {
        property: "og:description",
        content:
          "Planification, recherche web, lecture de pages et production de livrables par un agent IA autonome.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Workspace,
});

const MODELS = [
  { id: "google/gemini-3.6-flash", label: "Gemini 3.6 Flash — rapide" },
  { id: "google/gemini-3.7-flash", label: "Gemini 3.7 Flash" },
  { id: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro — raisonnement" },
  { id: "google/gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite — économique" },
];

const SUGGESTIONS = [
  "Fais une veille sur les agents IA open source et rends-moi un rapport structuré.",
  "Compare trois solutions de bases vectorielles et produis un tableau comparatif.",
  "Écris une page HTML de présentation pour mon projet DeerFlow.",
];

type Artifact = { path: string; language: string; content: string };
type PlanStep = { step: string; done: boolean };

function Workspace() {
  const [input, setInput] = useState("");
  const [model, setModel] = useState(MODELS[0]!.id);
  const [openArtifact, setOpenArtifact] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);
  const { messages, sendMessage, status, stop, error } = useChat({ transport });

  const busy = status === "submitted" || status === "streaming";

  const { artifacts, plan } = useMemo(() => collectState(messages), [messages]);
  const current = artifacts.find((a) => a.path === openArtifact) ?? null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  function submit() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    void sendMessage({ text }, { body: { model } });
  }

  return (
    <div className="dark flex h-screen flex-col bg-background text-foreground">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-5 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Sparkles className="size-4" />
          </div>
          <div className="leading-tight">
            <h1 className="text-sm font-semibold">DeerFlow</h1>
            <p className="text-[11px] text-muted-foreground">Super-agent de recherche & production</p>
          </div>
        </div>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
        >
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="mx-auto w-full max-w-3xl space-y-6">
              {messages.length === 0 && (
                <div className="space-y-6 pt-10 text-center">
                  <h2 className="text-2xl font-semibold">Que voulez-vous accomplir&nbsp;?</h2>
                  <p className="text-sm text-muted-foreground">
                    DeerFlow planifie la mission, cherche sur le web, lit les pages et vous rend des
                    fichiers finis.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => setInput(s)}
                        className="rounded-xl border border-border bg-card p-3 text-left text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m) => (
                <MessageRow key={m.id} message={m} onOpenArtifact={setOpenArtifact} />
              ))}

              {busy && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" /> DeerFlow travaille…
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive-foreground">
                  {error.message}
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          <div className="shrink-0 border-t border-border bg-background px-4 py-3">
            <div className="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-2xl border border-border bg-card p-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                rows={1}
                placeholder="Décrivez votre mission…"
                className="max-h-40 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
              />
              {busy ? (
                <button
                  onClick={() => void stop()}
                  className="flex size-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground"
                  aria-label="Arrêter"
                >
                  <Square className="size-4" />
                </button>
              ) : (
                <button
                  onClick={submit}
                  disabled={!input.trim()}
                  className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40"
                  aria-label="Envoyer"
                >
                  <ArrowUp className="size-4" />
                </button>
              )}
            </div>
          </div>
        </main>

        <aside className="hidden w-80 shrink-0 flex-col gap-4 overflow-y-auto border-l border-border bg-sidebar p-4 lg:flex">
          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <ListChecks className="size-3.5" /> Plan
            </h3>
            {plan.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucun plan pour l'instant.</p>
            ) : (
              <ul className="space-y-1.5">
                {plan.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    {s.done ? (
                      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    ) : (
                      <Circle className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <span className={s.done ? "text-muted-foreground line-through" : ""}>{s.step}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <FileText className="size-3.5" /> Artifacts
            </h3>
            {artifacts.length === 0 ? (
              <p className="text-xs text-muted-foreground">Les fichiers produits apparaîtront ici.</p>
            ) : (
              <ul className="space-y-1.5">
                {artifacts.map((a) => (
                  <li key={a.path}>
                    <button
                      onClick={() => setOpenArtifact(a.path)}
                      className="w-full truncate rounded-md border border-border bg-card px-2.5 py-2 text-left text-xs hover:border-primary/50"
                    >
                      {a.path}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      {current && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="flex h-full max-h-[85vh] w-full max-w-3xl flex-col rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <span className="text-sm font-medium">{current.path}</span>
              <button onClick={() => setOpenArtifact(null)} aria-label="Fermer">
                <X className="size-4 text-muted-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {current.language === "markdown" ? (
                <Markdown>{current.content}</Markdown>
              ) : (
                <pre className="whitespace-pre-wrap text-xs">{current.content}</pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageRow({
  message,
  onOpenArtifact,
}: {
  message: UIMessage;
  onOpenArtifact: (path: string) => void;
}) {
  if (message.role === "user") {
    const text = message.parts
      .map((p) => (p.type === "text" ? p.text : ""))
      .join("")
      .trim();
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground">
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {message.parts.map((part, i) => {
        if (part.type === "text") return <Markdown key={i}>{part.text}</Markdown>;

        if (part.type === "tool-web_search") {
          const q = (part.input as { query?: string } | undefined)?.query;
          return (
            <ToolChip key={i} icon={<Globe className="size-3.5" />} label={`Recherche web : ${q ?? "…"}`} />
          );
        }
        if (part.type === "tool-fetch_url") {
          const u = (part.input as { url?: string } | undefined)?.url;
          return <ToolChip key={i} icon={<Link2 className="size-3.5" />} label={`Lecture : ${u ?? "…"}`} />;
        }
        if (part.type === "tool-make_plan") {
          const t = (part.input as { title?: string } | undefined)?.title;
          return (
            <ToolChip key={i} icon={<ListChecks className="size-3.5" />} label={`Plan : ${t ?? "…"}`} />
          );
        }
        if (part.type === "tool-write_artifact") {
          const p = part.input as { path?: string } | undefined;
          return (
            <button
              key={i}
              onClick={() => p?.path && onOpenArtifact(p.path)}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs hover:border-primary/50"
            >
              <FileText className="size-3.5 text-primary" />
              {p?.path ?? "fichier"}
            </button>
          );
        }
        return null;
      })}
    </div>
  );
}

function ToolChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="inline-flex max-w-full items-center gap-2 truncate rounded-full border border-border bg-muted px-3 py-1 text-[11px] text-muted-foreground">
      {icon}
      <span className="truncate">{label}</span>
    </div>
  );
}

function collectState(messages: UIMessage[]) {
  const artifacts: Artifact[] = [];
  let plan: PlanStep[] = [];
  for (const m of messages) {
    for (const part of m.parts) {
      if (part.type === "tool-write_artifact") {
        const input = part.input as Artifact | undefined;
        if (input?.path && typeof input.content === "string") {
          const idx = artifacts.findIndex((a) => a.path === input.path);
          const entry = {
            path: input.path,
            language: input.language ?? "markdown",
            content: input.content,
          };
          if (idx >= 0) artifacts[idx] = entry;
          else artifacts.push(entry);
        }
      }
      if (part.type === "tool-make_plan") {
        const input = part.input as { steps?: PlanStep[] } | undefined;
        if (Array.isArray(input?.steps)) plan = input.steps;
      }
    }
  }
  return { artifacts, plan };
}
