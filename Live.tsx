import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob as GenAI_Blob } from '@google/genai';
import { encode, decode, decodeAudioData } from '../utils';
import GlassCard from '../components/GlassCard';

type TranscriptionEntry = {
    id: number;
    speaker: 'user' | 'ai';
    text: string;
};

const Live: React.FC = () => {
    const [status, setStatus] = useState<'idle' | 'connecting' | 'active' | 'error' | 'stopped'>('idle');
    const [error, setError] = useState<string | null>(null);
    const [transcriptionHistory, setTranscriptionHistory] = useState<TranscriptionEntry[]>([]);

    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

    const currentInputTranscription = useRef('');
    const currentOutputTranscription = useRef('');
    let nextStartTime = 0;


    const stopSession = () => {
        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => session.close());
            sessionPromiseRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (mediaStreamSourceRef.current) {
            mediaStreamSourceRef.current.disconnect();
            mediaStreamSourceRef.current = null;
        }
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
           inputAudioContextRef.current.close().then(() => inputAudioContextRef.current = null);
        }
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            outputAudioContextRef.current.close().then(() => outputAudioContextRef.current = null);
        }

        setStatus('stopped');
    };

    const startSession = async () => {
        setStatus('connecting');
        setError(null);
        setTranscriptionHistory([]);
        currentInputTranscription.current = '';
        currentOutputTranscription.current = '';
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            
            if (!outputAudioContextRef.current || outputAudioContextRef.current.state === 'closed') {
                outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }
            
            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: async () => {
                        setStatus('active');
                        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

                        if (!inputAudioContextRef.current || inputAudioContextRef.current.state === 'closed') {
                            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                        }
                        
                        mediaStreamSourceRef.current = inputAudioContextRef.current.createMediaStreamSource(streamRef.current);
                        scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                        
                        scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromiseRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };

                        mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
                        scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.serverContent?.outputTranscription) {
                            currentOutputTranscription.current += message.serverContent.outputTranscription.text;
                        } else if (message.serverContent?.inputTranscription) {
                            currentInputTranscription.current += message.serverContent.inputTranscription.text;
                        }

                        if (message.serverContent?.turnComplete) {
                            const fullInput = currentInputTranscription.current;
                            const fullOutput = currentOutputTranscription.current;

                            if (fullInput.trim() || fullOutput.trim()) {
                                setTranscriptionHistory(prev => [
                                    ...prev,
                                    { id: Date.now(), speaker: 'user', text: fullInput },
                                    { id: Date.now() + 1, speaker: 'ai', text: fullOutput },
                                ]);
                            }
                            currentInputTranscription.current = '';
                            currentOutputTranscription.current = '';
                        }
                        
                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                        if (base64Audio && outputAudioContextRef.current) {
                            nextStartTime = Math.max(nextStartTime, outputAudioContextRef.current.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
                            const source = outputAudioContextRef.current.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputAudioContextRef.current.destination);
                            source.start(nextStartTime);
                            nextStartTime += audioBuffer.duration;
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        setError(`Session error: ${e.message}`);
                        setStatus('error');
                        stopSession();
                    },
                    onclose: () => {
                        if (status !== 'error') {
                            setStatus('stopped');
                        }
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
                    },
                },
            });
        } catch (e: any) {
            setError(`Failed to start session: ${e.message}`);
            setStatus('error');
        }
    };

    function createBlob(data: Float32Array): GenAI_Blob {
        const l = data.length;
        const int16 = new Int16Array(l);
        for (let i = 0; i < l; i++) {
            int16[i] = data[i] * 32768;
        }
        return {
            data: encode(new Uint8Array(int16.buffer)),
            mimeType: 'audio/pcm;rate=16000',
        };
    }

    useEffect(() => {
        // Cleanup on component unmount
        return () => {
            stopSession();
        };
    }, []);

    const isSessionRunning = status === 'connecting' || status === 'active';

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold tracking-tight text-neutral-100">Live Conversation</h1>
                <p className="text-neutral-400 mt-1">Talk to Gemini in real-time.</p>
            </header>
            
            <GlassCard className="p-4 flex flex-col items-center space-y-4">
                <button
                    onClick={isSessionRunning ? stopSession : startSession}
                    className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isSessionRunning ? 'bg-red-600 hover:bg-red-500 animate-pulse' : 'bg-blue-600 hover:bg-blue-500'
                    }`}
                >
                    <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z"></path>
                        <path d="M5.5 13a.5.5 0 01.5.5v1.5a4 4 0 004 4h0a4 4 0 004-4V13.5a.5.5 0 011 0V15a5 5 0 01-5 5h0a5 5 0 01-5-5v-1.5a.5.5 0 01.5-.5z"></path>
                    </svg>
                </button>
                <p className="text-neutral-300 font-medium capitalize">{status}</p>
                {error && <p className="text-sm text-red-400 text-center">{error}</p>}
            </GlassCard>

            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-neutral-200">Transcription</h2>
                <div className="h-64 overflow-y-auto pr-2 space-y-4 bg-neutral-900/50 p-4 rounded-lg border border-neutral-800">
                    {transcriptionHistory.length > 0 ? (
                        transcriptionHistory.map((entry) => (
                           entry.text.trim() && <div key={entry.id} className={`flex items-start gap-3 ${entry.speaker === 'user' ? 'justify-end' : ''}`}>
                                {entry.speaker === 'ai' && <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex-shrink-0 mt-1"></div>}
                                <div className={`max-w-xs md:max-w-sm p-3 rounded-lg text-sm ${entry.speaker === 'user' ? 'bg-blue-600 text-white' : 'bg-neutral-800'}`}>
                                    {entry.text}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-neutral-500 text-center pt-8">
                            {status === 'idle' || status === 'stopped' ? "Start a session to see transcription." : "Listening..."}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Live;