"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import {
  Bot,
  Send,
  Loader2,
  ArrowLeft,
  Plus,
  User,
} from "lucide-react";

interface Message {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  createdAt: string;
}

export default function AgenteChatPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  const handleSend = async () => {
    if (!token || !input.trim() || sending) return;
    const userMsg = input.trim();
    setInput("");
    setSending(true);

    // Add user message optimistically
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [...prev, {
      id: tempId,
      role: "USER",
      content: userMsg,
      createdAt: new Date().toISOString(),
    }]);

    try {
      const res = await api.post<{
        sessionToken: string;
        message: Message;
      }>("/agents/sales/chat", {
        message: userMsg,
        sessionToken: sessionToken || undefined,
      }, token);

      setSessionToken(res.sessionToken);
      setMessages((prev) => [...prev, {
        id: res.message.id,
        role: "ASSISTANT",
        content: res.message.content,
        createdAt: res.message.createdAt,
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        id: `err-${Date.now()}`,
        role: "ASSISTANT",
        content: "Error al obtener respuesta. Por favor intenta de nuevo.",
        createdAt: new Date().toISOString(),
      }]);
    }
    setSending(false);
  };

  const handleNewSession = () => {
    setSessionToken(null);
    setMessages([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/agente-ventas")}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Agente de Ventas</p>
              <p className="text-xs text-green-600">En linea</p>
            </div>
          </div>
        </div>
        <button
          onClick={handleNewSession}
          className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          <Plus className="h-3.5 w-3.5" /> Nueva sesion
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Bot className="mb-4 h-16 w-16 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900">Agente de Ventas</h3>
            <p className="mt-1 max-w-md text-sm text-gray-500">
              Hola! Soy tu agente de ventas inteligente. Preguntame sobre tus servicios,
              prueba como respondo a clientes potenciales, o hazme cualquier consulta.
            </p>
          </div>
        )}

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
              <p className={`mt-1 text-xs ${
                msg.role === "USER" ? "text-brand-200" : "text-gray-400"
              }`}>
                {new Date(msg.createdAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="rounded-2xl border bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Escribiendo...
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t bg-white p-4">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu mensaje..."
            rows={1}
            className="flex-1 resize-none rounded-xl border px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            style={{ minHeight: "44px", maxHeight: "120px" }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "44px";
              el.style.height = Math.min(el.scrollHeight, 120) + "px";
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
