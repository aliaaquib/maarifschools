"use client";

import { useEffect, useState } from "react";

export function useSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const sync = () => {
      if (media.matches) {
        setIsCollapsed(false);
      } else {
        setIsMobileOpen(false);
      }
    };

    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return {
    isCollapsed,
    isMobileOpen,
    setIsCollapsed,
    setIsMobileOpen,
  };
}
