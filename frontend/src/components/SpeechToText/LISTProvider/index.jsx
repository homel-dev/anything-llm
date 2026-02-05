// frontend/src/components/SpeechToText/LISTProvider/index.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Microphone } from "@phosphor-icons/react";
import { Tooltip } from "react-tooltip";

/**
 * LIST STT provider:
 * - explicit start/stop only
 * - record one blob, POST multipart/form-data {file} to endpoint
 * - append returned {text} into prompt via sendCommand({writeMode:"append"})
 * - no streaming, no silence auto-stop, no auto-submit
 */
export default function LISTSpeechToText({ sendCommand, endpoint }) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [err, setErr] = useState(null);

  const mrRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  const stopTracks = () => {
    try {
      streamRef.current?.getTracks()?.forEach((t) => t.stop());
    } catch (_) {}
    streamRef.current = null;
  };

  const start = useCallback(async () => {
    if (processing || recording) return;
    if (!endpoint) return;

    setErr(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mr = new MediaRecorder(stream);
      mrRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        setProcessing(true);
        try {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          stopTracks();

          const fd = new FormData();
          fd.append("file", blob, "recording.webm");

          const res = await fetch(endpoint, { method: "POST", body: fd });
          if (!res.ok) {
            let payload = null;
            try {
              payload = await res.json();
            } catch (_) {}
            const msg =
              payload?.message ||
              payload?.error ||
              res.statusText ||
              "LIST request failed";
            throw new Error(`LIST: ${msg}`);
          }

          const data = await res.json();
          if (!data?.text) throw new Error("LIST: invalid response (missing text)");

          sendCommand({ text: data.text, writeMode: "append", autoSubmit: false });
        } catch (e) {
          setErr(e?.message || String(e));
        } finally {
          setProcessing(false);
        }
      };

      mr.start();
      setRecording(true);
    } catch (e) {
      stopTracks();
      setErr(e?.message || String(e));
      setRecording(false);
    }
  }, [endpoint, processing, recording, sendCommand]);

  const stop = useCallback(() => {
    if (processing || !recording) return;
    try {
      mrRef.current?.stop();
    } catch (_) {}
    setRecording(false);
  }, [processing, recording]);

  useEffect(() => {
    return () => {
      try {
        mrRef.current?.stop?.();
      } catch (_) {}
      stopTracks();
    };
  }, []);

  if (!endpoint) return null;

  const tooltip = err
    ? `LIST error: ${err}`
    : "LIST microphone (click to start/stop)";

  return (
    <div
      data-tooltip-id="tooltip-microphone-btn"
      data-tooltip-content={tooltip}
      aria-label="LIST microphone"
      onClick={recording ? stop : start}
      className={`border-none relative flex justify-center items-center opacity-60 hover:opacity-100 light:opacity-100 light:hover:opacity-60 cursor-pointer ${
        recording ? "!opacity-100" : ""
      }`}
    >
      <Microphone
        weight="fill"
        color="var(--theme-sidebar-footer-icon-fill)"
        className={`w-[22px] h-[22px] pointer-events-none text-theme-text-primary ${
          recording ? "animate-pulse-glow" : ""
        } ${processing ? "opacity-40" : ""}`}
      />
      <Tooltip
        id="tooltip-microphone-btn"
        place="top"
        delayShow={300}
        className="tooltip !text-xs z-99"
      />
    </div>
  );
}

