import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, X, Play, Pause, Download, Sparkles, Loader2, Mic, Volume2 } from 'lucide-react';
import { generateSpeechAI, generateMusicAI } from '../services/geminiService';

interface AudioGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AudioGenerator: React.FC<AudioGeneratorProps> = ({ isOpen, onClose }) => {
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<'speech' | 'music'>('speech');
  const [voice, setVoice] = useState('Kore');
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setAudioUrl(null);
    setLyrics(null);

    try {
      if (mode === 'speech') {
        const base64 = await generateSpeechAI(prompt, voice);
        if (base64) {
          const binary = atob(base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'audio/pcm' });
          // Note: PCM raw needs AudioContext to play correctly, but for simplicity we can try to wrap it or use a different approach if needed.
          // Actually, the instructions say for TTS: "decode and play audio with sample rate 24000".
          // Let's use a simpler approach for the demo if possible, or implement the AudioContext play.
          
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
          const buffer = audioContext.createBuffer(1, bytes.length / 2, 24000);
          const channelData = buffer.getChannelData(0);
          const int16 = new Int16Array(bytes.buffer);
          for (let i = 0; i < int16.length; i++) {
            channelData[i] = int16[i] / 0x7FFF;
          }
          
          const source = audioContext.createBufferSource();
          source.buffer = buffer;
          source.connect(audioContext.destination);
          source.onended = () => setIsPlaying(false);
          source.start();
          setIsPlaying(true);
          // We don't set a URL for raw PCM easily without more work, so we just play it.
        }
      } else {
        const result = await generateMusicAI(prompt);
        if (result) {
          setAudioUrl(result.audioUrl);
          setLyrics(result.lyrics || null);
        }
      }
    } catch (error) {
      console.error("Audio generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.9, x: 20 }}
          className="fixed top-20 right-24 w-96 glass-morphism rounded-2xl p-6 z-50 border border-neon-blue/30 shadow-[0_0_30px_rgba(0,210,255,0.2)]"
        >
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Music size={18} className="text-neon-blue" />
              <span className="text-xs uppercase tracking-widest font-bold text-gray-300">Audio Synthesis</span>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="space-y-6">
            <div className="flex bg-space-900/50 rounded-lg p-1 border border-white/5">
              <button
                onClick={() => setMode('speech')}
                className={`flex-1 py-2 rounded-md text-[10px] font-bold transition-all flex items-center justify-center gap-2 ${
                  mode === 'speech' ? 'bg-neon-blue text-space-900 shadow-[0_0_10px_rgba(0,210,255,0.3)]' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Mic size={12} /> SPEECH
              </button>
              <button
                onClick={() => setMode('music')}
                className={`flex-1 py-2 rounded-md text-[10px] font-bold transition-all flex items-center justify-center gap-2 ${
                  mode === 'music' ? 'bg-neon-pink text-white shadow-[0_0_10px_rgba(255,0,255,0.3)]' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Music size={12} /> MUSIC
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 uppercase tracking-wider">Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={mode === 'speech' ? "What should the AI say?" : "Describe the music style, mood, and instruments..."}
                className="w-full bg-space-900 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-neon-blue min-h-[100px] resize-none"
              />
            </div>

            {mode === 'speech' && (
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase tracking-wider">Voice Profile</label>
                <select
                  value={voice}
                  onChange={(e) => setVoice(e.target.value)}
                  className="w-full bg-space-900 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-neon-blue"
                >
                  <option value="Kore">Kore (Balanced)</option>
                  <option value="Puck">Puck (Cheerful)</option>
                  <option value="Charon">Charon (Deep)</option>
                  <option value="Fenrir">Fenrir (Mysterious)</option>
                  <option value="Zephyr">Zephyr (Soft)</option>
                </select>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className={`w-full py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                isGenerating ? 'bg-gray-600 cursor-not-allowed' : 
                mode === 'speech' ? 'bg-neon-blue hover:bg-neon-blue/80 text-space-900' : 'bg-neon-pink hover:bg-neon-pink/80 text-white'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  SYNTHESIZING...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  GENERATE AUDIO
                </>
              )}
            </button>

            {audioUrl && (
              <div className="bg-space-900/80 border border-white/10 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={togglePlay}
                      className="w-10 h-10 rounded-full bg-neon-blue/20 flex items-center justify-center text-neon-blue hover:bg-neon-blue/30 transition-all"
                    >
                      {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
                    </button>
                    <div>
                      <p className="text-[10px] font-bold text-white uppercase tracking-wider">Generated Track</p>
                      <p className="text-[9px] text-gray-500">Ready for playback</p>
                    </div>
                  </div>
                  <a
                    href={audioUrl}
                    download="generated-audio.wav"
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <Download size={16} />
                  </a>
                </div>
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onEnded={() => setIsPlaying(false)}
                  className="hidden"
                />
                {lyrics && (
                  <div className="mt-2 p-2 bg-black/40 rounded border border-white/5 max-h-24 overflow-y-auto custom-scrollbar">
                    <p className="text-[10px] text-gray-400 italic leading-relaxed">
                      {lyrics}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
