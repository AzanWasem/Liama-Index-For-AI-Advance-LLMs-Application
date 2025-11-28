import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse, Modality } from "@google/genai";
import { decode, decodeAudioData } from '../utils';

// Fix for SpeechRecognition API not being in standard TS lib
interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: any) => void) | null;
  onresult: ((event: any) => void) | null;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: { new(): SpeechRecognition };
    webkitSpeechRecognition: { new(): SpeechRecognition };
  }
}

interface Source {
  uri: string;
  title: string;
}
interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  model?: string;
  sources?: Source[];
}

const aiModelConfigs = {
  "Gemini 2.5 Pro": { model: "gemini-2.5-pro", grounding: false },
  "Gemini 2.5 Flash Lite": { model: "gemini-flash-lite-latest", grounding: false },
  "Gemini 2.5 Flash (Web Search)": { model: "gemini-2.5-flash", grounding: true },
};

const aiModels = Object.keys(aiModelConfigs);

const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: "Hello! Select a model and ask me anything.", sender: 'ai', model: 'Gemini 2.5 Pro' }
  ]);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState(aiModels[0]);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  
  const chatRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<number | null>(null);

  const ai = useMemo(() => new GoogleGenAI({ apiKey: process.env.API_KEY as string }), []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, isTyping]);

  useEffect(() => {
    chatRef.current = null;
  }, [selectedModel]);
  
  useEffect(() => {
    // Fix: Use declared types for window.SpeechRecognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech Recognition not supported. Microphone button will be disabled.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
      setError(null);
    };
    
    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.onerror = (event) => {
      let errorMessage = `Mic error: ${event.error}`;
      if (event.error === 'not-allowed') {
          errorMessage = "Microphone access denied. Please allow it in your browser settings.";
      } else if (event.error === 'no-speech') {
          errorMessage = "No speech was detected.";
      }
      setError(errorMessage);
      setIsRecording(false);
    };

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
    };

    recognitionRef.current = recognition;
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
}, []);


  const handleSend = async () => {
    if (input.trim() === '' || isTyping) return;

    const userMessage: Message = { id: Date.now(), text: input, sender: 'user' };
    const aiMessageId = Date.now() + 1;
    const aiPlaceholder: Message = { id: aiMessageId, text: '', sender: 'ai', model: selectedModel };

    setMessages(prev => [...prev, userMessage, aiPlaceholder]);
    setInput('');
    setIsTyping(true);
    setError(null);

    const currentModelConfig = aiModelConfigs[selectedModel as keyof typeof aiModelConfigs];

    try {
      const config = currentModelConfig.grounding ? { tools: [{googleSearch: {}}] } : {};
      
      if (!chatRef.current) {
        chatRef.current = ai.chats.create({
          model: currentModelConfig.model,
          config,
        });
      }
      
      const responseStream = await chatRef.current.sendMessageStream({ message: input });

      let firstChunk = true;
      for await (const chunk of responseStream) {
        if (firstChunk) {
            if (chunk.promptFeedback?.blockReason) {
                const reason = chunk.promptFeedback.blockReason.toLowerCase().replace(/_/g, ' ');
                setError(`Your prompt was blocked: ${reason}. Please try rephrasing.`);
                setMessages(prev => prev.filter(msg => msg.id !== aiMessageId)); // Remove placeholder
                return;
            }
            firstChunk = false;
        }

        const chunkText = chunk.text;
        setMessages(prev => prev.map(msg => 
          msg.id === aiMessageId ? { ...msg, text: msg.text + chunkText } : msg
        ));

        if(chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
          const sources = chunk.candidates[0].groundingMetadata.groundingChunks
              .map((c: any) => c.web)
              .filter(Boolean) as Source[];
          if(sources.length > 0) {
            setMessages(prev => prev.map(msg => 
              msg.id === aiMessageId ? { ...msg, sources } : msg
            ));
          }
        }
      }

    } catch (e: any) {
      let userFriendlyError = "An unexpected error occurred. Please try again.";
    
      if (e instanceof Error && e.message) {
        const message = e.message.toLowerCase();
        if (message.includes('api key not valid')) {
          userFriendlyError = "API key is invalid. Please check the application configuration.";
        } else if (message.includes('overloaded') || message.includes('resource has been exhausted')) {
          userFriendlyError = "The AI model is currently busy. Please try again in a few moments.";
        } else if (message.includes('network error') || message.includes('fetch failed')) {
          userFriendlyError = "Could not connect to the AI service. Please check your internet connection.";
        } else if (message.includes('safety')) {
          userFriendlyError = "The response was blocked due to safety concerns. Please try a different prompt.";
        }
      }
      
      setError(userFriendlyError);
      // On error, remove the empty AI message bubble we added.
      setMessages(prev => prev.filter(msg => msg.id !== aiMessageId));
    } finally {
      setIsTyping(false);
    }
  };

  const handleTTS = async (text: string, messageId: number) => {
    if (isSpeaking === messageId) return;
    setIsSpeaking(messageId);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
        },
      });

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const audioContext = audioContextRef.current;
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (base64Audio) {
        const audioBuffer = await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();
        source.onended = () => setIsSpeaking(null);
      }
    } catch (e) {
      console.error("TTS Error:", e);
      setIsSpeaking(null);
    }
  };
  
  const handleMicClick = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (isRecording) {
      recognition.stop();
    } else {
      setInput(''); // Clear input before starting
      recognition.start();
    }
  };

  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col">
      <header className="flex-shrink-0 mb-4">
         <h1 className="text-3xl font-bold tracking-tight text-neutral-100">AI Chat</h1>
         <div className="relative mt-2">
            <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full appearance-none bg-neutral-800/50 border border-neutral-700 rounded-lg px-4 py-2 text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
                {aiModels.map(model => <option key={model} className="bg-neutral-900 text-neutral-200" value={model}>{model}</option>)}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-neutral-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
        </div>
      </header>

      <div className="flex-grow overflow-y-auto pr-2 space-y-4">
        {messages.map((msg, index) => (
          <div key={msg.id} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.sender === 'ai' && <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex-shrink-0 self-start"></div>}
            <div className={`max-w-xs md:max-w-md p-3 rounded-2xl ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-neutral-800 rounded-bl-none'}`}>
              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              {msg.sender === 'ai' && (
                <div className="text-xs text-neutral-400 mt-2 flex justify-between items-center">
                  <span>{msg.model}</span>
                  {msg.text && (
                    <button onClick={() => handleTTS(msg.text, msg.id)} className="text-neutral-400 hover:text-white transition-colors" disabled={isSpeaking === msg.id}>
                      {isSpeaking === msg.id ? (
                        <svg className="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd"></path></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1V10a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path></svg>
                      )}
                    </button>
                  )}
                </div>
              )}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 border-t border-neutral-700 pt-2">
                  <h4 className="text-xs font-semibold text-neutral-300 mb-1">Sources:</h4>
                  <div className="flex flex-wrap gap-2">
                    {msg.sources.map((source, i) => (
                       <a href={source.uri} target="_blank" rel="noopener noreferrer" key={i} className="text-xs bg-neutral-700 hover:bg-neutral-600 text-blue-300 px-2 py-1 rounded-md truncate max-w-full">{source.title}</a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {isTyping && messages[messages.length-1].sender === 'user' && (
           <div className="flex items-end gap-2 justify-start">
             <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex-shrink-0"></div>
             <div className="max-w-xs md:max-w-md p-3 rounded-2xl bg-neutral-800 rounded-bl-none flex items-center space-x-1">
                <span className="w-2 h-2 bg-neutral-500 rounded-full animate-pulse" style={{animationDelay: '0s'}}></span>
                <span className="w-2 h-2 bg-neutral-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></span>
                <span className="w-2 h-2 bg-neutral-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></span>
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex-shrink-0 mt-4">
        {error && <p className="text-red-400 text-sm text-center mb-2">{error}</p>}
        <div className="flex items-center gap-2 bg-neutral-900/70 border border-neutral-700 rounded-full p-2">
          <button
            onClick={handleMicClick}
            disabled={!recognitionRef.current}
            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-200 ${
                isRecording ? 'text-white bg-red-600 animate-pulse' : 'text-neutral-400 hover:bg-neutral-800'
            }`}
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z"></path>
                <path d="M5.5 13a.5.5 0 01.5.5v1.5a4 4 0 004 4h0a4 4 0 004-4V13.5a.5.5 0 011 0V15a5 5 0 01-5 5h0a5 5 0 01-5-5v-1.5a.5.5 0 01.5-.5z"></path>
            </svg>
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (isRecording) {
                recognitionRef.current?.stop();
              }
            }}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isRecording ? "Listening..." : "Message MindCore..."}
            className="flex-grow bg-transparent px-2 focus:outline-none text-neutral-100 placeholder-neutral-500"
          />
          <button onClick={handleSend} disabled={isTyping || !input.trim()} className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white flex-shrink-0 transition-transform duration-200 active:scale-90 disabled:bg-neutral-600 disabled:cursor-not-allowed" aria-label="Send message">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.126A59.768 59.768 0 0 1 21.485 12 59.77 59.77 0 0 1 3.27 20.876L6 12z M6 12h9" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChat;