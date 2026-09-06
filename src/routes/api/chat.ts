import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";

import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { deerflowTools } from "@/lib/deerflow-tools.server";

const SYSTEM_PROMPT = `Tu es DeerFlow, un super-agent autonome francophone.

Principes:
- Réponds en français, de façon claire et structurée (markdown).
- Pour une mission complexe, commence par appeler make_plan puis exécute les étapes.
- Recherche sur le web (web_search) dès que la question dépend d'informations récentes, et cite toujours les sources sous forme de liens markdown.
- Utilise fetch_url pour lire une page précise donnée par l'utilisateur.
- Dès qu'un livrable est demandé (rapport, code, page web, tableau), produis-le avec write_artifact au lieu de le coller entièrement dans le chat, puis résume-le brièvement.
- Sois honnête sur ce que tu n'as pas pu vérifier.`;

type ChatRequestBody = { messages?: unknown; model?: unknown };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages, model } = (await request.json()) as ChatRequestBody;
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const modelId = typeof model === "string" && model ? model : "google/gemini-3.6-flash";
        const gateway = createLovableAiGatewayProvider(key);

        const result = streamText({
          model: gateway(modelId),
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(messages as UIMessage[]),
          tools: deerflowTools,
          stopWhen: stepCountIs(50),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
          onError: (error) => (error instanceof Error ? error.message : String(error)),
        });
      },
    },
  },
});
