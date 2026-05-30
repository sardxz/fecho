import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "text-2xl font-semibold tracking-tight text-violet-950",
        className,
      )}
    >
      Fechô
    </span>
  );
}
