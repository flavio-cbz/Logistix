import { useRef, useEffect } from "react";

type Shortcut = {
  key: string;
  action: () => void;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
};

type Options = {
  shortcuts?: Shortcut[];
  enableArrowNavigation?: boolean;
  orientation?: "vertical" | "horizontal" | "both";
};

export function useKeyboardNavigation(options: Options = {}) {
  const { shortcuts = [], enableArrowNavigation = false } = options;
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handler = (e: KeyboardEvent) => {
      for (const s of shortcuts) {
        if (
          e.key.toLowerCase() === s.key.toLowerCase() &&
          !!s.ctrlKey === e.ctrlKey &&
          !!s.altKey === e.altKey &&
          !!s.shiftKey === e.shiftKey
        ) {
          e.preventDefault();
          s.action();
          return;
        }
      }

      if (!enableArrowNavigation) return;

      // Placeholder for arrow navigation handling.
      // Components typically attach their own onKeyDown handlers on the container,
      // so we keep this hook non-invasive by default.
      if (e.key.startsWith("Arrow")) {
        // no-op (kept for future enhancements)
      }
    };

    el.addEventListener("keydown", handler);
    return () => el.removeEventListener("keydown", handler);
  }, [shortcuts, enableArrowNavigation]);

  return { containerRef };
}

export default useKeyboardNavigation;
