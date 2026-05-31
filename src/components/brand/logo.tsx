import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0 text-2xl font-semibold tracking-tight text-violet-950",
        className,
      )}
    >
      <Image
        src="/fecho-logo.png"
        alt=""
        aria-hidden
        width={64}
        height={64}
        className="h-[2.45em] w-[2.45em] shrink-0 object-contain"
        priority
      />
      <span className="-ml-1">{"Fechô"}</span>
    </span>
  );
}
