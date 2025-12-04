import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, X, Volume2, Loader2, MessageSquare, AlertCircle, ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react';
import { generateAIResponse } from '../services/ai';
import { motion, AnimatePresence } from 'framer-motion';

export const VoiceAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [continuousMode, setContinuousMode] = useState(false);
  const continuousModeRef = useRef(false);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    continuousModeRef.current = continuousMode;
  }, [continuousMode]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = 'en-US'; 
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript.trim().length > 0) {
          setLastMessage(transcript);
          await handleAIQuery(transcript);
        }
      };
      
      recognitionRef.current.onerror = (event: any) => {
        if (event.error === 'aborted') {
          setIsListening(false);
          setError(null);
          return;
        }
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setError("Microphone access denied.");
        } else if (event.error === 'no-speech') {
           if (continuousModeRef.current && isOpen) {
             setTimeout(() => { try { recognitionRef.current?.start(); } catch(e){} }, 1000);
           }
        } else {
          setError("Voice error. Try again.");
        }
      };
    } else {
      setError("Browser not supported.");
    }
  }, [isOpen]);

  const handleAIQuery = async (text: string) => {
    setIsProcessing(true);
    try {
      const result = await generateAIResponse(text);
      setAiResponse(result.voiceResponse);
      speak(result.voiceResponse, () => {
        if (continuousModeRef.current && isOpen) {
          try { recognitionRef.current?.start(); } catch (e) {}
        }
      });
    } catch (e) {
      setAiResponse("System error. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const speak = (text: string, onEnd?: () => void) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const maleVoice = voices.find(v => v.lang.startsWith('en') && (v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('david') || v.name.toLowerCase().includes('google us english')));
      if (maleVoice) utterance.voice = maleVoice;
      utterance.rate = 1.05;
      utterance.onend = () => { if (onEnd) onEnd(); };
      utterance.onerror = () => { if (onEnd) onEnd(); };
      window.speechSynthesis.speak(utterance);
    } else {
      if (onEnd) onEnd();
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setLastMessage(null);
      setAiResponse(null);
      setError(null);
      try { recognitionRef.current?.start(); } catch (err) { setError("Mic error"); }
    }
  };

  const handleClose = () => {
    window.speechSynthesis.cancel();
    recognitionRef.current?.abort();
    setIsOpen(false);
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-24 md:bottom-8 right-6 w-14 h-14 bg-gradient-to-tr from-brand-600 to-indigo-600 text-white rounded-full shadow-lg shadow-brand-500/40 z-50 flex items-center justify-center ring-4 ring-white"
          >
            <Mic className="w-6 h-6" />
            <motion.div 
              className="absolute inset-0 rounded-full border-2 border-white/30"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative z-10 mb-safe"
            >
              {/* Header */}
              <div className="bg-white p-5 flex justify-between items-center border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="bg-brand-50 p-2 rounded-xl text-brand-600">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Partner</h3>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-brand-600">
                      {continuousMode && <RefreshCw className="w-3 h-3 animate-spin-slow" />}
                      AI Assistant
                    </div>
                  </div>
                </div>
                <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Chat Area */}
              <div className="p-6 min-h-[300px] flex flex-col items-center justify-center gap-6 bg-gray-50/50">
                
                {lastMessage && !error && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-[80%]">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">You</p>
                    <p className="font-medium text-gray-800 text-lg leading-relaxed">"{lastMessage}"</p>
                  </motion.div>
                )}

                {isProcessing ? (
                   <div className="flex flex-col items-center gap-3">
                      <div className="flex gap-1">
                        <motion.div className="w-2 h-2 bg-brand-500 rounded-full" animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} />
                        <motion.div className="w-2 h-2 bg-brand-500 rounded-full" animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.1 }} />
                        <motion.div className="w-2 h-2 bg-brand-500 rounded-full" animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} />
                      </div>
                      <span className="text-xs font-medium text-gray-400">Thinking...</span>
                   </div>
                ) : error ? (
                  <div className="bg-red-50 px-4 py-3 rounded-xl border border-red-100 flex items-center gap-2 text-sm text-red-700">
                     <AlertCircle className="w-4 h-4" />
                     {error}
                  </div>
                ) : aiResponse ? (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-5 rounded-2xl shadow-soft border border-gray-100 w-full relative">
                     <div className="absolute -top-3 left-6 bg-brand-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                       <Volume2 className="w-3 h-3" /> Speaking
                     </div>
                     <p className="text-gray-700 leading-relaxed mt-2">{aiResponse}</p>
                  </motion.div>
                ) : (
                   <div className="text-center text-gray-400">
                      <p className="text-sm">Tap mic to start conversation</p>
                   </div>
                )}

                {/* Mic Button */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleListening}
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                    isListening 
                      ? 'bg-red-500 shadow-xl shadow-red-500/30' 
                      : 'bg-brand-600 shadow-xl shadow-brand-500/30'
                  }`}
                >
                  {isListening ? (
                    <MicOff className="w-8 h-8 text-white" />
                  ) : (
                    <Mic className="w-8 h-8 text-white" />
                  )}
                </motion.button>
                
                <div className="flex items-center justify-between w-full px-4 pt-2 border-t border-gray-200/50">
                   <p className="text-xs text-gray-400 font-medium">
                      {isListening ? 'Listening...' : 'Ready'}
                   </p>
                   <button 
                     onClick={() => setContinuousMode(!continuousMode)}
                     className={`flex items-center gap-2 text-xs font-bold transition-colors ${continuousMode ? 'text-brand-600' : 'text-gray-400'}`}
                   >
                      {continuousMode ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                      <span>Auto-listen</span>
                   </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};