import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  CheckCircle,
  HelpCircle,
  AlertTriangle,
  Loader2,
  Globe,
  Bot,
  User,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useAccessibility, Language } from '../context/AccessibilityContext';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  retrieved_facts?: string[];
  suggested_followups?: string[];
  created_at: string;
}

export const AICareCompanion: React.FC = () => {
  const { user, activeElderlyId } = useAuth();
  const { language, setLanguage, speakText, stopSpeaking, isSpeaking, t } = useAccessibility();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Suggested prompt pills
  const promptPills: Record<Language, string[]> = {
    en: [
      "What medicines do I take today?",
      "When is my next doctor appointment?",
      "Did I confirm my morning medication?",
      "Help me prepare questions for my doctor",
      "Summarize my recent healthcare activities"
    ],
    hi: [
      "आज मुझे कौन सी दवाइयाँ लेनी हैं?",
      "डॉक्टर के साथ मेरी अगली मुलाक़ात कब है?",
      "क्या मैंने सुबह की दवा की पुष्टि की थी?",
      "डॉक्टर से पूछने के लिए सवाल तैयार करें"
    ],
    mr: [
      "आज मला कोणती औषधे घ्यायची आहेत?",
      "माझी पुढची डॉक्टरांची भेट कधी आहे?",
      "मी सकाळचे औषध घेतल्याची नोंद केली आहे का?",
      "डॉक्टरांना विचारण्यासाठी प्रश्नांची तयारी करा"
    ]
  };

  useEffect(() => {
    // Initial friendly greeting
    const greetingText =
      language === 'hi'
        ? `नमस्ते ${user?.first_name}! मैं आपका केयरसाइट केयर साथी हूँ। आपकी दवाओं और स्वास्थ्य दिनचर्या से जुड़े किसी भी सवाल के लिए मैं यहाँ हूँ।`
        : language === 'mr'
        ? `नमस्कार ${user?.first_name}! मी आपला केअरसाईट आरोग्य साथी आहे. आपल्या औषधांचे वेळापत्रक आणि डॉक्टरांच्या भेटीबद्दल काहीही विचारा.`
        : `Hello ${user?.first_name}! I am your CareSight Daily Companion. How can I assist you with your medication schedule or appointments today?`;

    setMessages([
      {
        id: 'initial',
        role: 'assistant',
        content: greetingText,
        created_at: new Date().toISOString(),
      },
    ]);
  }, [language, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const res = await api.chatWithAI({
        message: text,
        conversation_id: conversationId || undefined,
        elderly_user_id: activeElderlyId || undefined,
        language: language,
      });

      if (res.conversation_id) setConversationId(res.conversation_id);

      const botMsg: ChatMessage = {
        id: res.message_id || Date.now().toString(),
        role: 'assistant',
        content: res.response,
        retrieved_facts: res.retrieved_facts || [],
        suggested_followups: res.suggested_followups || [],
        created_at: res.created_at,
      };

      setMessages((prev) => [...prev, botMsg]);

      // Speak automatically if elderly profile has voice enabled
      if (user?.role === 'elderly') {
        speakText(res.response);
      }
    } catch (e: any) {
      alert(`AI Companion error: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Web Speech API Voice Recognition
  const handleToggleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
      handleSendMessage(transcript);
    };

    recognition.start();
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-teal-600 to-teal-700 text-white shadow-md shadow-teal-600/30">
            <Sparkles className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              AI Daily Care Companion
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Powered by Google Gemini with context-aware access to your authorized MongoDB health records.
            </p>
          </div>
        </div>

        {/* Language selector & Guardrails notice */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Language:</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer"
          >
            <option value="en">English</option>
            <option value="hi">हिंदी (Hindi)</option>
            <option value="mr">मराठी (Marathi)</option>
          </select>
        </div>
      </div>

      {/* Medical Safety Guardrail Banner */}
      <div className="p-3.5 rounded-2xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60 flex items-start gap-2.5 text-xs text-teal-900 dark:text-teal-200">
        <AlertTriangle className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
        <p>
          <strong>Medical Guardrails Active:</strong> CareSight AI retrieves verified records from your database. It does not prescribe medications, adjust dosages, or diagnose clinical conditions. For emergencies, press the red SOS button.
        </p>
      </div>

      {/* Chat Messages Box */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm min-h-[460px] flex flex-col justify-between space-y-4">
        
        {/* Messages Stream */}
        <div className="space-y-4 overflow-y-auto max-h-[500px] pr-2">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                    isUser
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-teal-700 dark:text-teal-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>

                <div
                  className={`max-w-[85%] rounded-3xl p-4 space-y-2 text-sm ${
                    isUser
                      ? 'bg-teal-600 text-white rounded-tr-none'
                      : 'bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 text-slate-800 dark:text-slate-100 rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-line leading-relaxed font-medium">
                    {msg.content}
                  </p>

                  {/* Stored Healthcare Facts Section - Clearly distinguished as required by Section 5 Module 3 */}
                  {msg.retrieved_facts && msg.retrieved_facts.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1 bg-white/70 dark:bg-slate-900/60 p-3 rounded-2xl">
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-teal-700 dark:text-teal-300 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Verified MongoDB Records Retrieved:
                      </p>
                      <ul className="text-xs space-y-1 text-slate-600 dark:text-slate-300">
                        {msg.retrieved_facts.map((fact, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-teal-600">•</span>
                            <span>{fact}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {!isUser && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => speakText(msg.content)}
                        className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 p-1"
                        title="Read this aloud"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        Listen
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-teal-100 dark:bg-teal-950 flex items-center justify-center text-teal-600">
                <Bot className="w-5 h-5" />
              </div>
              <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                <Loader2 className="w-4 h-4 text-teal-600 animate-spin" />
                Retrieving healthcare facts and consulting Gemini...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Pills */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
            Suggested Senior Queries
          </p>
          <div className="flex flex-wrap gap-2">
            {promptPills[language]?.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(prompt)}
                className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-teal-700 transition"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar with Voice Input Microphone */}
        <div className="pt-2 flex items-center gap-2">
          <button
            onClick={handleToggleVoiceInput}
            className={`p-3 rounded-2xl border transition ${
              isListening
                ? 'bg-red-600 text-white border-red-600 animate-pulse'
                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
            title="Voice input using Web Speech API"
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-teal-600" />}
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={
              language === 'hi'
                ? 'मुझसे अपनी दवाओं या अपॉइंटमेंट के बारे में पूछें...'
                : language === 'mr'
                ? 'आपल्या औषधांबद्दल किंवा डॉक्टरांच्या भेटीबद्दल विचारा...'
                : 'Ask about today\'s medicines, appointments, or doctor questions...'
            }
            className="flex-1 px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-teal-500"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isLoading}
            className="p-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-600/30 disabled:opacity-50 transition active:scale-95"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

      </div>

    </div>
  );
};
