'use client';

import Link from 'next/link';
import { Bot, MessageSquare, Send, X, Sparkles, Droplets } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  link?: string;
};

const QUICK_PROMPTS = [
  'How do I submit a water grievance?',
  'How can I track complaint status?',
  'How can I apply for a new water connection?',
  'What payment options are available for water bills?',
];

export default function FloatingAiChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [paymentPrompt, setPaymentPrompt] = useState<{ messageId: string; consumerId: string } | null>(null);

  // New Connection Form States
  const [newConnPrompt, setNewConnPrompt] = useState<{ messageId: string } | null>(null);
  const [ncName, setNcName] = useState('');
  const [ncPhone, setNcPhone] = useState('');
  const [ncAddress, setNcAddress] = useState('');
  const [ncFile, setNcFile] = useState<File | null>(null);
  const [ncLoading, setNcLoading] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Welcome to Arunachal Pradesh PHE virtual assistance. I can help with grievance submission, complaint tracking, and citizen portal guidance.',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !isTyping, [input, isTyping]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;
    setPaymentPrompt(null);

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const history = messages
        .slice(-12)
        .map(msg => ({ role: msg.role, text: msg.text }));

      const res = await fetch('/api/public/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history,
        }),
      });

      const data = await res.json().catch(() => null) as {
        success?: boolean;
        data?: { reply?: string };
        error?: string;
      } | null;

      let assistantText = data?.data?.reply || data?.error || 'I could not process that right now. Please try again.';

      // Check for New Connection Action
      const connectionMatch = assistantText.match(/\[ACTION:\s*SHOW_NEW_CONNECTION_FORM\]/i);
      let isNewConn = false;
      if (connectionMatch) {
        assistantText = assistantText.replace(/\[ACTION:\s*SHOW_NEW_CONNECTION_FORM\]/i, '').trim();
        isNewConn = true;
      }

      const botMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: assistantText,
      };

      if (isNewConn) {
        setNewConnPrompt({ messageId: botMsg.id });
      }

      const pendingMatch = assistantText.match(/Consumer ID\s+([A-Z0-9/\-]+):\s*Pending amount is\s*₹?\d+/i);
      if (pendingMatch) {
        setPaymentPrompt({ messageId: botMsg.id, consumerId: pendingMatch[1] });
      }

      setMessages(prev => [...prev, botMsg]);
    } catch {
      const botMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: 'Service is temporarily unavailable. Please try again in a moment.',
      };
      setMessages(prev => [...prev, botMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handlePaymentChoice = (choice: 'yes' | 'no') => {
    if (!paymentPrompt) return;

    if (choice === 'no') {
      setMessages(prev => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: 'Thank you for reaching out to the Arunachal Pradesh Public Health Engineering and Water Supply support service. Is there anything else I can help you with today?',
        },
      ]);
      setPaymentPrompt(null);
      return;
    }

    setMessages(prev => [
      ...prev,
      {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: `You can proceed to payment for consumer ID ${paymentPrompt.consumerId} using the link below:`,
        link: 'https://example.com/phe-ws/payment',
      },
    ]);
    setPaymentPrompt(null);
  };

  const handleNewConnectionSubmit = async () => {
    if (!ncFile) return;
    setNcLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', ncFile);
      const upRes = await fetch('/api/upload', { method: 'POST', body: formData });
      const upData = await upRes.json();
      if (!upData.success) throw new Error(upData.error || 'Upload failed');

      const res = await fetch('/api/public/new-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: ncName, phone: ncPhone, address: ncAddress, idProofUrl: upData.data.url })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Submission failed');

      setNewConnPrompt(null);
      setMessages(prev => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: `Your new connection request has been submitted successfully.\n\nTracking ID: **${data.data.connectionId}**\n\nYou can track the status of your request at any time using the Track Complaint portal.`,
        }
      ]);
      setNcName(''); setNcPhone(''); setNcAddress(''); setNcFile(null);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: `Failed to submit request: ${err.message}`
      }]);
    } finally {
      setNcLoading(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-[70] bg-slate-900/25 backdrop-blur-[1px]" onClick={() => setIsOpen(false)} aria-hidden="true" />
      )}

      <section className="fixed bottom-5 right-5 z-[80]">
        {isOpen && (
          <div
            className="mb-3 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-gov-blue-100 bg-white shadow-2xl"
            role="dialog"
            aria-label="PHE virtual assistant"
          >
            <header className="flex items-center justify-between border-b border-gov-blue-100 bg-gradient-to-r from-gov-blue-900 to-gov-blue-700 px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5" aria-hidden="true" />
                <div>
                  <h3 className="text-base font-semibold">PHE Virtual Assistant</h3>
                  <p className="text-xs text-blue-100">Water Grievance Support</p>
                </div>
              </div>
              <button
                type="button"
                className="rounded-md p-1 text-blue-100 transition hover:bg-white/10 hover:text-white"
                onClick={() => setIsOpen(false)}
                aria-label="Close assistant"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="max-h-[420px] overflow-y-auto bg-gov-neutral-50 px-3 py-3">
              <div className="mb-3 grid gap-2">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[88%] rounded-2xl px-3 py-2.5 text-base leading-7 ${msg.role === 'user'
                          ? 'rounded-br-md bg-gov-blue-800 text-white'
                          : 'rounded-bl-md border border-gov-aqua-200 bg-gov-aqua-50 text-slate-800'
                        }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                      {msg.link && (
                        <a
                          href={msg.link}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex text-sm font-semibold text-gov-blue-800 underline underline-offset-2"
                        >
                          Proceed to Payment
                        </a>
                      )}

                      {paymentPrompt?.messageId === msg.id && msg.role === 'assistant' && (
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => handlePaymentChoice('yes')}
                            className="rounded-lg bg-gov-blue-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gov-blue-700"
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePaymentChoice('no')}
                            className="rounded-lg border border-gov-blue-200 bg-white px-3 py-1.5 text-sm font-semibold text-gov-blue-800 hover:bg-gov-aqua-50"
                          >
                            No
                          </button>
                        </div>
                      )}

                      {newConnPrompt?.messageId === msg.id && msg.role === 'assistant' && (
                        <div className="mt-3 flex flex-col gap-2 rounded-lg border border-gov-blue-200 bg-white p-3 text-sm text-slate-800">
                          <p className="font-semibold text-gov-blue-900 border-b border-gov-aqua-100 pb-1 mb-1">New Water Connection</p>
                          <input type="text" placeholder="Full Name" value={ncName} onChange={e => setNcName(e.target.value)} className="citizen-input rounded px-2 py-1.5" required disabled={ncLoading} />
                          <input type="tel" placeholder="Mobile Number (+91...)" value={ncPhone} onChange={e => setNcPhone(e.target.value)} className="citizen-input rounded px-2 py-1.5" required disabled={ncLoading} />
                          <textarea placeholder="Full Address" value={ncAddress} onChange={e => setNcAddress(e.target.value)} className="citizen-input rounded px-2 py-1.5" rows={2} required disabled={ncLoading} />
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-slate-600">ID Proof (Aadhaar, Voter ID, etc.)</label>
                            <input type="file" accept="image/*,.pdf" onChange={e => setNcFile(e.target.files?.[0] || null)} className="text-xs file:mr-2 file:rounded file:border-0 file:bg-gov-aqua-100 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-gov-blue-800 hover:file:bg-gov-aqua-200" required disabled={ncLoading} />
                          </div>
                          <button
                            type="button"
                            onClick={handleNewConnectionSubmit}
                            disabled={ncLoading || !ncName || !ncPhone || !ncAddress || !ncFile}
                            className="mt-1 flex justify-center items-center gap-2 rounded bg-gov-blue-800 py-1.5 font-semibold text-white transition hover:bg-gov-blue-700 disabled:opacity-50"
                          >
                            {ncLoading ? 'Submitting...' : 'Submit Request'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-md border border-gov-aqua-200 bg-gov-aqua-50 px-3 py-2.5 text-base text-slate-600">
                      Assistant is typing...
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              <div className="mb-2 flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map(prompt => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => sendMessage(prompt)}
                    className="rounded-full border border-gov-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-gov-blue-800 transition hover:bg-gov-aqua-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <Link href="/complaint" className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gov-blue-800 px-2 py-2.5 text-sm font-semibold text-white transition hover:bg-gov-blue-700">
                  <Droplets className="h-3.5 w-3.5" aria-hidden="true" />
                  Submit Grievance
                </Link>
                <Link href="/citizen/track" className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gov-blue-200 bg-white px-2 py-2.5 text-sm font-semibold text-gov-blue-800 transition hover:bg-gov-aqua-50">
                  Track Complaint
                </Link>
              </div>
            </div>

            <form onSubmit={onSubmit} className="border-t border-gov-blue-100 bg-white p-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Ask about grievance submission or tracking..."
                  className="citizen-input flex-1 text-base"
                  aria-label="Message input"
                />
                <button
                  type="submit"
                  disabled={!canSend}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-gov-blue-800 text-white transition hover:bg-gov-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsOpen(v => !v)}
          className="group inline-flex items-center gap-2 rounded-full bg-gov-blue-800 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-gov-blue-800/30 transition hover:-translate-y-0.5 hover:bg-gov-blue-700"
          aria-label={isOpen ? 'Close AI assistant' : 'Open AI assistant'}
        >
          <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            {!isOpen && <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-gov-aqua-200" />}
          </span>
          <span className="hidden sm:inline">AI Assistant</span>
          <Sparkles className="h-4 w-4 text-gov-aqua-200" aria-hidden="true" />
        </button>
      </section>
    </>
  );
}
