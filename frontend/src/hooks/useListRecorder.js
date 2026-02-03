import { useRef, useState } from "react";

/**
 * LIST client extension (Document 12):
 * - explicit start/stop
 * - send one blob to /v1/list/transcribe
 * - insert returned text into draft
 * - never auto-send
 * - LIST optional (failures must not break chat UI)
 */

/**
 * Config resolution order:
 * 1) window.__HOMEL__?.LIST_API_URL  (runtime override, if you inject it)
 * 2) import.meta.env.VITE_LIST_API_URL (build-time)
 * 3) null (feature disabled)
 */
function resolveListUrl() {
  try {
    if (typeof window !== "undefined" && window.__HOMEL__?.LIST_API_URL) {
      return window.__HOMEL__.LIST_API_URL;
    }
  } catch (_) {}
  return import.meta?.env?.VITE_LIST_API_URL || null;
}

export function useListRecorder(onTranscriptReceived) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastError, setLastError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioChunksRef = useRef([]);

  const LIST_API_URL = resolveListUrl();
  const isEnabled = Boolean(LIST_API_URL);

  const stopTracks = () => {
    try {
      const s = streamRef.current;
      if (s) s.getTracks().forEach((t) => t.stop());
    } catch (_) {}
    streamRef.current = null;
  };

  const sendAudioToLIST = async (blob) => {
    const formData = new FormData();
    formData.append("file", blob, "recording.bin");

    const res = await fetch(LIST_API_URL, { method: "POST", body: formData });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`LIST HTTP ${res.status} ${res.statusText} ${text}`.trim());
    }
    const data = await res.json();
    if (data?.text) onTranscriptReceived(data.text);
  };

  const startRecording = async () => {
    if (!isEnabled || isProcessing || isRecording) return;

    setLastError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];

      mr.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mr.onstop = async () => {
        setIsProcessing(true);
        try {
          const blob = new Blob(audioChunksRef.current, { type: "application/octet-stream" });
          stopTracks();
          await sendAudioToLIST(blob);
        } catch (e) {
          stopTracks();
          setLastError(e?.message || String(e));
        } finally {
          setIsProcessing(false);
        }
      };

      mr.start();
      setIsRecording(true);
    } catch (e) {
      stopTracks();
      setLastError(e?.message || String(e));
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (!isEnabled || isProcessing || !isRecording) return;
    try {
      mediaRecorderRef.current?.stop();
    } catch (_) {}
    setIsRecording(false);
  };

  return {
    isEnabled,
    isRecording,
    isProcessing,
    lastError,
    startRecording,
    stopRecording,
  };
}
