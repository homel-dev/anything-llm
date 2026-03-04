// frontend/src/components/WorkspaceChat/ChatContainer/PromptInput/SpeechToText/index.jsx
import { useEffect, useCallback, useRef, useState } from "react";
import { Microphone } from "@phosphor-icons/react";
import { Tooltip } from "react-tooltip";
import "regenerator-runtime"; //required polyfill for speech recognition;
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import { PROMPT_INPUT_EVENT } from "../../PromptInput";
import { useTranslation } from "react-i18next";
import Appearance from "@/models/appearance";
import System from "@/models/system";
import LISTSpeechToText from "@/components/SpeechToText/LISTProvider";

let timeout;
const SILENCE_INTERVAL = 3_200; // wait in seconds of silence before closing.

/**
 * Speech-to-text input component for the chat window.
 * @param {Object} props - The component props
 * @param {(textToAppend: string | object, autoSubmit?: boolean) => void} props.sendCommand - The function to send the command
 * @returns {React.ReactElement} The SpeechToText component
 */
export default function SpeechToText({ sendCommand }) {
  const [provider, setProvider] = useState("native");
  const [listEndpoint, setListEndpoint] = useState(
    (typeof import.meta !== "undefined" ? import.meta.env?.VITE_LIST_API_URL : "") || ""
  );

  // 1. Fetch settings on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const s = await System.keys();
        if (!mounted) return;
        setProvider(s?.SpeechToTextProvider || "native");
        setListEndpoint(
          s?.SpeechToTextLISTEndpoint ||
            (typeof import.meta !== "undefined" ? import.meta.env?.VITE_LIST_API_URL : "") ||
            ""
        );
      } catch (_) {
        // keep defaults
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // 2. Declare ALL hooks unconditionally (Fixes React Error #300)
  const previousTranscriptRef = useRef("");
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    browserSupportsContinuousListening,
    isMicrophoneAvailable,
  } = useSpeechRecognition({
    clearTranscriptOnListen: true,
  });
  const { t } = useTranslation();

  function startSTTSession() {
    if (!isMicrophoneAvailable) {
      alert(
        "AnythingLLM does not have access to microphone. Please enable for this site to use this feature."
      );
      return;
    }

    resetTranscript();
    previousTranscriptRef.current = "";
    SpeechRecognition.startListening({
      continuous: browserSupportsContinuousListening,
      language: window?.navigator?.language ?? "en-US",
    });
  }

  function endSTTSession() {
    SpeechRecognition.stopListening();

    if (Appearance.get("autoSubmitSttInput")) {
      sendCommand({
        text: "",
        autoSubmit: true,
        writeMode: "append",
      });
    }

    resetTranscript();
    previousTranscriptRef.current = "";
    clearTimeout(timeout);
  }

  const handleKeyPress = useCallback(
    (event) => {
      // Do not intercept Ctrl+M for native STT if the user is using LIST
      if (provider === "list") return;

      if (event.ctrlKey && event.keyCode === 77) {
        if (listening) {
          endSTTSession();
        } else {
          startSTTSession();
        }
      }
    },
    [listening, provider]
  );

  function handlePromptUpdate(e) {
    if (!e?.detail && timeout) {
      endSTTSession();
      clearTimeout(timeout);
    }
  }

  useEffect(() => {
    document.addEventListener("keydown", handleKeyPress);
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [handleKeyPress]);

  useEffect(() => {
    if (!!window) window.addEventListener(PROMPT_INPUT_EVENT, handlePromptUpdate);
    return () => window?.removeEventListener(PROMPT_INPUT_EVENT, handlePromptUpdate);
  }, []);

  useEffect(() => {
    if (provider === "list") return; // Prevent native timeout processing if on LIST

    if (transcript?.length > 0 && listening) {
      const previousTranscript = previousTranscriptRef.current;
      const newContent = transcript.slice(previousTranscript.length);

      if (newContent.length > 0) {
        sendCommand({ text: newContent, writeMode: "append" });
      }

      previousTranscriptRef.current = transcript;
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        endSTTSession();
      }, SILENCE_INTERVAL);
    }
  }, [transcript, listening, provider]);

  // ----------------------------------------------------------------------
  // 3. Conditional Rendering (Must happen AFTER all hooks)
  // ----------------------------------------------------------------------

  // LIST provider: explicit start/stop, single request, no streaming
  if (provider === "list") {
    return <LISTSpeechToText sendCommand={sendCommand} endpoint={listEndpoint} />;
  }

  // Native provider renders below
  if (!browserSupportsSpeechRecognition) return null;

  return (
    <div
      data-tooltip-id="tooltip-microphone-btn"
      data-tooltip-content={`${t("chat_window.microphone")} (CTRL + M)`}
      aria-label={t("chat_window.microphone")}
      onClick={listening ? endSTTSession : startSTTSession}
      className={`border-none relative flex justify-center items-center opacity-60 hover:opacity-100 light:opacity-100 light:hover:opacity-60 cursor-pointer ${
        !!listening ? "!opacity-100" : ""
      }`}
    >
      <Microphone
        weight="fill"
        color="var(--theme-sidebar-footer-icon-fill)"
        className={`w-[22px] h-[22px] pointer-events-none text-theme-text-primary ${
          listening ? "animate-pulse-glow" : ""
        }`}
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

