import { useState } from "react";

export function useSidebar(defaultOpen = true) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return {
    isOpen,
    toggle: () => setIsOpen((prev) => !prev),
  };
}
