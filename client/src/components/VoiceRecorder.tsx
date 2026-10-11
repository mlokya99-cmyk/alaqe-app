import React, { useState, useRef, useEffect } from 'react';
import { Mic, Trash2, Send } from 'lucide-react';
import { formatDuration } from '../utils/uyghur';

interface VoiceRecorderProps {
  onSendVoice: (audioBlob: Blob, durationSeconds: number) => void;
  onCancel: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSendVoice, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    startRecording();
    return () => {
      cleanup();
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      alert('مىكروفوننى ئىشلىتىش رۇخسىتى بېرىلمىدى');
      onCancel();
    }
  };

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
  };

  const handleCancel = () => {
    cleanup();
    onCancel();
  };

  const handleFinishAndSend = () => {
    if (!mediaRecorderRef.current) return;

    mediaRecorderRef.current.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      onSendVoice(audioBlob, duration);
      cleanup();
    };

    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
  };

  return (
    <div className="flex-1 flex items-center justify-between bg-red-500/10 dark:bg-red-950/30 border border-red-500/20 rounded-2xl px-4 py-2 animate-fadeIn">
      {/* Recording status & Live Timer */}
      <div className="flex items-center gap-3">
        <span className="w-3.5 h-3.5 rounded-full bg-red-500 animate-ping" />
        <div className="flex items-center gap-2">
          <Mic className="w-5 h-5 text-red-500 animate-pulse" />
          <span className="text-sm font-semibold text-red-500 font-mono">
            {formatDuration(duration)}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">
            ئاۋاز خاتىرىلىنىۋاتىدۇ...
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {/* Cancel button */}
        <button
          type="button"
          onClick={handleCancel}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-full transition"
          title="ئەمەلدىن قالدۇرۇش"
        >
          <Trash2 className="w-5 h-5" />
        </button>

        {/* Send voice button */}
        <button
          type="button"
          onClick={handleFinishAndSend}
          className="p-2 bg-telegram-blue hover:bg-telegram-blue-hover text-white rounded-full transition shadow-md"
          title="ئەۋەتىش"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
