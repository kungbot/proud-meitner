import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Mic, Brain, Clipboard, Check } from 'lucide-react';
import { JarvisState } from './AILogo';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  data?: any;
}

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  isListening: boolean;
  onToggleMic: () => void;
  orbState: JarvisState;
  streamingText?: string;
}

export default function ChatPanel({
  messages,
  onSendMessage,
  isListening,
  onToggleMic,
  orbState,
  streamingText,
}: ChatPanelProps) {
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages or streaming text updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  // Custom Copy Button Helper Component for Markdown render
  const CopyButton = ({ text }: { text: string }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };
    return (
      <button
        onClick={handleCopy}
        className="hover:text-cyan-400 transition flex items-center space-x-1 uppercase font-bold text-[8px]"
        type="button"
      >
        {copied ? (
          <>
            <Check className="w-2.5 h-2.5 text-emerald-400" />
            <span className="text-emerald-400">Copied</span>
          </>
        ) : (
          <>
            <Clipboard className="w-2.5 h-2.5" />
            <span>Copy</span>
          </>
        )}
      </button>
    );
  };

  return (
    <section className="flex-1 flex flex-col overflow-hidden bg-slate-950 relative">
      {/* Chat log Feed */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && !streamingText ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
            <Brain className="w-12 h-12 text-slate-800 animate-pulse" />
            <div className="max-w-md">
              <h3 className="high-tech-font text-cyan-400 text-sm tracking-wider uppercase">System Ready</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Say <span className="text-cyan-300 font-mono">"Jarvis, open Chrome"</span>,{' '}
                <span className="text-cyan-300 font-mono">"lock my computer"</span>, or type a request to orchestrate operating system tasks.
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col max-w-[80%] ${
                  msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                }`}
              >
                <div className="flex items-center space-x-1.5 text-[9px] text-slate-500 font-mono mb-1">
                  <span>{msg.role.toUpperCase()}</span>
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                </div>

                <div
                  className={`p-4 rounded-xl border text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-cyan-950/40 border-cyan-800/60 text-cyan-100 rounded-br-none'
                      : msg.role === 'system'
                      ? 'bg-amber-950/40 border-amber-800/50 text-amber-100 font-mono'
                      : 'bg-slate-900/70 border-slate-800 text-slate-200 rounded-bl-none'
                  }`}
                >
                  {/* Rich Markdown Rendering */}
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ node, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        const codeString = String(children).replace(/\n$/, '');
                        const isInline = !match && !codeString.includes('\n');
                        return isInline ? (
                          <code className="bg-slate-950 border border-slate-900 px-1 py-0.5 rounded font-mono text-cyan-400 text-[11px]" {...props}>
                            {children}
                          </code>
                        ) : (
                          <div className="relative group/code mt-2 border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
                            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/60 border-b border-slate-900 text-[9px] text-slate-500 font-mono">
                              <span>{match ? match[1] : 'code'}</span>
                              <CopyButton text={codeString} />
                            </div>
                            <pre className="p-3 font-mono text-[11px] text-cyan-350/95 overflow-x-auto whitespace-pre-wrap">
                              <code className={className} {...props}>
                                {children}
                              </code>
                            </pre>
                          </div>
                        );
                      },
                      p({ children }) {
                        return <p className="mb-2 last:mb-0">{children}</p>;
                      },
                      ul({ children }) {
                        return <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>;
                      },
                      ol({ children }) {
                        return <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>;
                      },
                      li({ children }) {
                        return <li className="pl-0.5">{children}</li>;
                      },
                      a({ href, children }) {
                        return (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:underline hover:text-cyan-300 font-medium"
                          >
                            {children}
                          </a>
                        );
                      },
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>

                  {/* Screenshot Image Preview */}
                  {msg.data && typeof msg.data === 'object' && (msg.data.path || msg.data.screenshot_path) && (
                    <div className="mt-3 border border-slate-800 rounded-lg overflow-hidden bg-slate-950 max-w-lg">
                      <img 
                        src={`http://127.0.0.1:8000/static/screenshot.png?t=${Date.now()}`} 
                        alt="Desktop Screenshot" 
                        className="w-full h-auto object-contain max-h-[300px]"
                      />
                    </div>
                  )}

                  {/* Additional structured data details (e.g. folder listings, stats) */}
                  {msg.data && typeof msg.data === 'object' && !Array.isArray(msg.data) && (
                    <div className="mt-3 border-t border-slate-800/60 pt-2 text-[10px] text-slate-400 font-mono">
                      <details>
                        <summary className="cursor-pointer text-cyan-500 hover:underline">View JSON Payload</summary>
                        <pre className="mt-2 bg-slate-950/80 p-2 rounded overflow-x-auto text-[9px]">
                          {JSON.stringify(msg.data, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* SSE Streaming Chunk Display */}
            {streamingText && (
              <div className="flex flex-col max-w-[80%] mr-auto items-start">
                <div className="flex items-center space-x-1.5 text-[9px] text-slate-500 font-mono mb-1">
                  <span>ASSISTANT</span>
                  <span>•</span>
                  <span className="animate-pulse">STREAMING...</span>
                </div>
                <div className="p-4 rounded-xl border text-xs leading-relaxed bg-slate-900/70 border-slate-800 text-slate-200 rounded-bl-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingText}</ReactMarkdown>
                  <span className="inline-block w-1.5 h-3 bg-cyan-400 ml-1 animate-pulse" />
                </div>
              </div>
            )}
          </>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Interactive Chat Form Inputs */}
      <form
        onSubmit={handleSubmit}
        className="p-4 border-t border-slate-900 bg-slate-950/80 flex items-center space-x-2.5 z-10"
      >
        <button
          type="button"
          onClick={onToggleMic}
          className={`p-3 rounded-full border transition flex items-center justify-center shrink-0 ${
            isListening
              ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse'
              : 'bg-slate-900 border-slate-800 hover:border-cyan-500 text-slate-400 hover:text-cyan-400'
          }`}
        >
          <Mic className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={orbState === 'thinking' ? 'JARVIS is thinking...' : 'Orchestrate JARVIS assistant...'}
          className="flex-1 bg-slate-900/70 border border-slate-800 rounded-lg px-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all font-mono"
          disabled={orbState === 'thinking'}
        />

        <button
          type="submit"
          className="p-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors flex items-center justify-center hover:shadow-[0_0_15px_rgba(6,182,212,0.4)]"
          disabled={!inputText.trim() || orbState === 'thinking'}
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </section>
  );
}
