"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  MessageSquare,
  User,
  Bot,
  Loader2,
  Clock,
  ChevronRight,
} from "lucide-react";

interface Session {
  id: string;
  sessionToken: string;
  userName: string;
  userEmail: string;
  messageCount: number;
  startedAt: string;
}

interface Message {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  created_at: string;
}

export default function SesionesPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.get<Session[]>("/agents/sales/sessions", token)
      .then(setSessions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const viewMessages = async (sessionId: string) => {
    if (!token) return;
    setSelectedSession(sessionId);
    setLoadingMessages(true);
    try {
      const msgs = await api.get<Message[]>(`/agents/sales/sessions/${sessionId}/messages`, token);
      setMessages(msgs);
    } catch {}
    setLoadingMessages(false);
  };

  return (
    <div>
      <button
        onClick={() => selectedSession ? setSelectedSession(null) : router.push("/dashboard/agente-ventas")}
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        {selectedSession ? "Volver a sesiones" : "Agente de Ventas"}
      </button>

      <h1 className="mb-6 flex items-center gap-3 text-2xl font-bold text-gray-900">
        <MessageSquare className="h-7 w-7 text-brand-600" />
        {selectedSession ? "Detalle de sesion" : "Sesiones de chat"}
      </h1>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : !selectedSession ? (
        /* Sessions list */
        sessions.length === 0 ? (
          <div className="rounded-xl border bg-white py-16 text-center shadow-sm">
            <MessageSquare className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <p className="text-sm text-gray-500">No hay sesiones de chat aun.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => viewMessages(s.id)}
                className="flex w-full items-center justify-between rounded-xl border bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100">
                    <User className="h-5 w-5 text-brand-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">{s.userName}</p>
                    <p className="text-xs text-gray-500">{s.userEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{s.messageCount} mensajes</p>
                    <p className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="h-3 w-3" />
                      {new Date(s.startedAt).toLocaleDateString("es-CO", {
                        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-300" />
                </div>
              </button>
            ))}
          </div>
        )
      ) : (
        /* Messages view */
        loadingMessages ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-4 rounded-xl border bg-gray-50 p-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "USER" ? "flex-row-reverse" : ""}`}
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  msg.role === "USER" ? "bg-gray-200" : "bg-brand-600"
                }`}>
                  {msg.role === "USER"
                    ? <User className="h-4 w-4 text-gray-600" />
                    : <Bot className="h-4 w-4 text-white" />}
                </div>
                <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === "USER"
                    ? "bg-brand-600 text-white"
                    : "bg-white text-gray-900 shadow-sm border"
                }`}>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  <p className={`mt-1 text-xs ${msg.role === "USER" ? "text-brand-200" : "text-gray-400"}`}>
                    {new Date(msg.created_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
