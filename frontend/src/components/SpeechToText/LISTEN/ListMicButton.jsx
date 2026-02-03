import React from "react";
import { useListRecorder } from "../../../hooks/useListRecorder";

export default function ListMicButton({ currentText, setInputText }) {
  const handleTranscript = (newText) => {
    if (!newText) return;

    const safeCurrent = currentText || "";
    const separator = safeCurrent.length > 0 && !safeCurrent.endsWith(" ") ? " " : "";
    setInputText(safeCurrent + separator + newText);
  };

  const { isEnabled, isRecording, isProcessing, startRecording, stopRecording } =
    useListRecorder(handleTranscript);

  // LIST is optional. If not configured, do not render anything.
  if (!isEnabled) return null;

  const handleClick = (e) => {
    e.preventDefault();
    if (isProcessing) return;
    if (isRecording) stopRecording();
    else startRecording();
  };

  if (isProcessing) {
    return (
      <button disabled className="p-2 mr-2 text-gray-500 cursor-wait" title="Transcribing...">
        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </button>
    );
  }

  if (isRecording) {
    return (
      <button
        onClick={handleClick}
        className="p-2 mr-2 rounded-full bg-red-500/20 text-red-500 hover:bg-red-500/30 animate-pulse transition-all"
        title="Stop Recording"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="6" width="12" height="12" rx="2" ry="2" />
        </svg>
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="p-2 mr-2 text-gray-400 hover:text-white transition-colors"
      title="Dictate (LIST)"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    </button>
  );
}
