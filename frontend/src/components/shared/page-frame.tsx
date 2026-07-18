import type { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

type PageFrameProps = PropsWithChildren<{
  className?: string;
}>;

export const PageFrame = ({ children, className }: PageFrameProps) => {
  return <main className={cn("mx-auto max-w-content px-4 py-10 sm:px-6 lg:px-8", className)}>{children}</main>;
};
