"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function PageTracker() {
  const pathname = usePathname();
  const currentViewIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const sendDwellTime = () => {
    if (!currentViewIdRef.current) return;
    const elapsedSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
    if (elapsedSeconds < 1) return;

    const payload = JSON.stringify({
      id_vista: currentViewIdRef.current,
      segundos: elapsedSeconds
    });

    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/tracking/dwell", blob);
    } else if (typeof fetch !== "undefined") {
      fetch("/api/tracking/dwell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true
      }).catch(() => {});
    }
  };

  useEffect(() => {
    // Exclude admin panel and auth routes
    if (pathname.startsWith("/admin") || pathname.startsWith("/dashboard")) {
      return;
    }

    // 1. Send dwell time for previous route if any
    sendDwellTime();

    // 2. Identify page type
    let tipoPagina: "home" | "categoria" | "producto" | "carrito" | "checkout" | "otro" = "otro";
    let idProducto: number | undefined = undefined;

    if (pathname === "/") {
      tipoPagina = "home";
    } else if (pathname.startsWith("/categoria")) {
      tipoPagina = "categoria";
    } else if (pathname.startsWith("/producto/")) {
      tipoPagina = "producto";
      const parts = pathname.split("/");
      const possibleId = parseInt(parts[2], 10);
      if (!isNaN(possibleId)) {
        idProducto = possibleId;
      }
    } else if (pathname === "/carrito") {
      tipoPagina = "carrito";
    } else if (pathname === "/checkout") {
      tipoPagina = "checkout";
    }

    // 3. Register new page view
    startTimeRef.current = Date.now();
    currentViewIdRef.current = null;

    fetch("/api/tracking/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo_pagina: tipoPagina,
        id_producto: idProducto,
        url: pathname
      })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data.id_vista) {
          currentViewIdRef.current = data.id_vista;
        }
      })
      .catch(() => {});

    // 4. Progressive periodic heartbeat (every 15s) to save dwell time incrementally
    const heartbeatInterval = setInterval(() => {
      sendDwellTime();
    }, 15000);

    return () => {
      clearInterval(heartbeatInterval);
      sendDwellTime();
    };
  }, [pathname]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        sendDwellTime();
      } else {
        // User came back to tab: keep accumulating
      }
    };

    const handleBeforeUnload = () => {
      sendDwellTime();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
