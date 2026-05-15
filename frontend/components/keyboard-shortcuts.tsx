"use client";

import { useState } from "react";

const SHORTCUTS = [
  { keys: ["←", "→"], action: "Jog X axis" },
  { keys: ["↑", "↓"], action: "Jog Y axis" },
  { keys: ["PgUp", "PgDn"], action: "Jog Z axis" },
  { keys: ["Space"], action: "Toggle vacuum" },
  { keys: ["Esc"], action: "Emergency stop" },
];

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="text-xs text-gray-400 hover:text-gray-200 bg-white/10 hover:bg-white/15 rounded-lg px-2.5 py-1.5 font-medium transition-all ring-1 ring-white/10"
        onClick={() => setOpen(!open)}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
        </svg>
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] flex items-center justify-center" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 border" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-gray-900">Keyboard Shortcuts</h3>
              <button className="text-gray-400 hover:text-gray-600 transition-colors" onClick={() => setOpen(false)}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              {SHORTCUTS.map(({ keys, action }) => (
                <div key={action} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{action}</span>
                  <div className="flex gap-1">
                    {keys.map((key) => (
                      <kbd key={key} className="px-2 py-1 bg-gray-100 border border-gray-200 rounded-md text-xs font-mono text-gray-700 shadow-sm">{key}</kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-5 pt-4 border-t">Shortcuts are active when no input field is focused.</p>
          </div>
        </div>
      )}
    </>
  );
}
