import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, X, Zap, Loader2 } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality, Type } from "@google/genai";

interface VoiceUplinkProps {
  onAction: (action: any) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceUplink: React.FC<VoiceUplinkProps> = ({ onAction, isOpen, onClose }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);

  const connect = async () => {
    if (isConnected) return;
    
    setIsConnecting(true);
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    try {
      const session = await ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: `
            You are the "Neural Architect" of the NebulaMind workspace. 
            You can interact with the 3D mind map by calling tools.
            Be concise, futuristic, and helpful.
            When the user asks to add a node, use the addNode tool.
            When they ask to connect nodes, use the connectNodes tool.
            When they ask to search or analyze, use the appropriate tools.
          `,
          tools: [
            {
              functionDeclarations: [
                {
                  name: "addNode",
                  description: "Adds a new node to the mind map.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING, description: "The title of the node" },
                      content: { type: Type.STRING, description: "Brief content or description" },
                      type: { type: Type.STRING, enum: ["text", "image", "video", "code", "zim"], description: "The type of node" }
                    },
                    required: ["title"]
                  }
                },
                {
                  name: "connectNodes",
                  description: "Connects two existing nodes.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      sourceId: { type: Type.STRING, description: "ID of the source node" },
                      targetId: { type: Type.STRING, description: "ID of the target node" }
                    },
                    required: ["sourceId", "targetId"]
                  }
                },
                {
                  name: "searchUniverse",
                  description: "Searches the current mind map for a specific topic.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      query: { type: Type.STRING, description: "The search query" }
                    },
                    required: ["query"]
                  }
                }
              ]
            }
          ],
          inputAudioTranscription: {},
          outputAudioTranscription: {}
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setIsConnecting(false);
            startMic();
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.modelTurn?.parts) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.inlineData?.data) {
                  // Handle audio output
                  const base64Audio = part.inlineData.data;
                  const binaryString = atob(base64Audio);
                  const bytes = new Int16Array(binaryString.length / 2);
                  for (let i = 0; i < bytes.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i * 2) | (binaryString.charCodeAt(i * 2 + 1) << 8);
                  }
                  audioQueueRef.current.push(bytes);
                  if (!isPlayingRef.current) {
                    playNextInQueue();
                  }
                }
              }
            }

            if (message.serverContent?.interrupted) {
              audioQueueRef.current = [];
              isPlayingRef.current = false;
            }

            if (message.toolCall) {
              for (const call of message.toolCall.functionCalls) {
                onAction({ type: call.name, payload: call.args });
                // Send tool response back
                sessionRef.current?.sendToolResponse({
                  functionResponses: [{
                    id: call.id,
                    response: { result: "Action executed successfully." }
                  }]
                });
              }
            }
            
            if (message.serverContent?.modelTurn?.parts?.[0]?.text) {
                setAiResponse(prev => prev + message.serverContent!.modelTurn!.parts[0].text);
            }
          },
          onclose: () => {
            setIsConnected(false);
            stopMic();
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            setIsConnected(false);
            setIsConnecting(false);
          }
        }
      });
      sessionRef.current = session;
    } catch (err) {
      console.error("Failed to connect to Live API:", err);
      setIsConnecting(false);
    }
  };

  const startMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        // Convert Float32 to Int16 PCM
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
        }
        
        const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
        sessionRef.current?.sendRealtimeInput({
          media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
        });
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
      setIsListening(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  };

  const stopMic = () => {
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    processorRef.current?.disconnect();
    audioContextRef.current?.close();
    setIsListening(false);
  };

  const playNextInQueue = () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }

    isPlayingRef.current = true;
    const pcmData = audioQueueRef.current.shift()!;
    
    const audioContext = audioContextRef.current || new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const buffer = audioContext.createBuffer(1, pcmData.length, 24000);
    const channelData = buffer.getChannelData(0);
    
    for (let i = 0; i < pcmData.length; i++) {
      channelData[i] = pcmData[i] / 0x7FFF;
    }

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.onended = () => playNextInQueue();
    source.start();
  };

  const disconnect = () => {
    sessionRef.current?.close();
    setIsConnected(false);
    stopMic();
  };

  useEffect(() => {
    if (!isOpen && isConnected) {
      disconnect();
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="fixed bottom-24 right-10 w-80 glass-morphism rounded-2xl p-6 z-50 border border-neon-blue/30 shadow-[0_0_30px_rgba(0,210,255,0.2)]"
        >
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Neural Uplink</span>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <motion.div
                animate={isListening ? {
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.6, 0.3],
                } : {}}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute inset-0 bg-neon-blue rounded-full blur-xl"
              />
              <button
                onClick={isConnected ? disconnect : connect}
                disabled={isConnecting}
                className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 ${
                  isConnected ? 'bg-neon-blue text-space-900' : 'bg-white/5 text-white border border-white/10'
                }`}
              >
                {isConnecting ? (
                  <Loader2 size={32} className="animate-spin" />
                ) : isConnected ? (
                  <Mic size={32} />
                ) : (
                  <MicOff size={32} />
                )}
              </button>
            </div>

            <div className="text-center">
              <h3 className="text-sm font-bold mb-1">
                {isConnecting ? 'Establishing Link...' : isConnected ? 'Uplink Active' : 'Uplink Offline'}
              </h3>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                {isConnected ? 'Architect is listening' : 'Connect to speak with AI'}
              </p>
            </div>

            {isConnected && (
              <div className="w-full space-y-4">
                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div className="max-h-32 overflow-y-auto custom-scrollbar">
                  <p className="text-xs text-neon-blue italic leading-relaxed">
                    {aiResponse || "Awaiting neural input..."}
                  </p>
                </div>
              </div>
            )}

            {!isConnected && !isConnecting && (
              <button
                onClick={connect}
                className="w-full py-3 rounded-xl bg-neon-blue/10 border border-neon-blue/30 text-neon-blue text-xs font-bold hover:bg-neon-blue/20 transition-all flex items-center justify-center gap-2"
              >
                <Zap size={14} />
                INITIALIZE UPLINK
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
