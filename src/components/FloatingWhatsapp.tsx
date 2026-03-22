"use client";

import { WHATSAPP_HREF, WHATSAPP_NUMBER } from "@/lib/contact";

/**
 * Floating WhatsApp shortcut.
 * Opens the chat with the configured number.
 */
export function FloatingWhatsapp() {
  return (
    <a
      href={WHATSAPP_HREF}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-5 right-5 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-white p-2 shadow-lg shadow-black/20 ring-1 ring-black/10 transition-transform hover:scale-[1.03] hover:shadow-xl"
      aria-label={`WhatsApp ilə yaz: ${WHATSAPP_NUMBER}`}
      title={WHATSAPP_NUMBER}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/whatsapp-icon.avif"
        alt="WhatsApp"
        className="h-full w-full rounded-full object-contain"
      />
    </a>
  );
}
