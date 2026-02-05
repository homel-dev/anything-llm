// frontend/src/components/SpeechToText/LISTProvider/Options.jsx
import React from "react";

/**
 * Extra settings fields persisted via System.updateSystem(FormData).
 * Stores LIST endpoint in: SpeechToTextLISTEndpoint
 */
export default function LISTOptions({ settings }) {
  const defaultUrl =
    settings?.SpeechToTextLISTEndpoint ||
    (typeof import.meta !== "undefined" ? import.meta.env?.VITE_LIST_API_URL : "") ||
    "http://localhost:8001/v1/list/transcribe";

  return (
    <div className="w-full flex flex-col gap-y-3">
      <div className="flex flex-col gap-y-1">
        <label className="text-sm font-semibold text-white">
          LIST Transcribe URL
        </label>
        <input
          type="text"
          name="SpeechToTextLISTEndpoint"
          defaultValue={defaultUrl}
          placeholder="http://localhost:8001/v1/list/transcribe"
          className="w-full max-w-[640px] h-[44px] bg-theme-settings-input-bg rounded-lg px-3 text-sm outline-none text-white border border-transparent focus:border-primary-button"
          autoComplete="off"
          spellCheck={false}
        />
        <p className="text-xs text-white/60 leading-[18px]">
          Expects <code className="text-white/80">multipart/form-data</code>{" "}
          field <code className="text-white/80">file</code> and returns JSON{" "}
          <code className="text-white/80">{"{ text: string }"}</code>.
        </p>
      </div>
    </div>
  );
}

