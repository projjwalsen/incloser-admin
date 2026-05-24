import { Search } from "lucide-react";
import { cn } from "@/lib/cn";

type SearchBarProps = {
  placeholder?: string;
  className?: string;
};

export function SearchBar({ placeholder = "Search...", className }: SearchBarProps) {
  return (
    <div className={cn("relative w-full max-w-sm", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" />
      <input className="soft-input !px-[30px]" placeholder={placeholder} />
    </div>
  );
}
