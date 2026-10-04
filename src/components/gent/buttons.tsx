import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const gentButton = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        gold: "bg-primary text-primary-foreground hover:bg-primary/85",
        ghost: "border border-border bg-transparent text-foreground hover:border-gold hover:text-gold",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-5 text-sm",
        lg: "h-13 px-7 text-base",
      },
      block: { true: "w-full" },
    },
    defaultVariants: { tone: "gold", size: "md" },
  },
);

type BaseProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  Omit<VariantProps<typeof gentButton>, "tone"> & { asChild?: boolean };

function make(tone: "gold" | "ghost", name: string) {
  const C = React.forwardRef<HTMLButtonElement, BaseProps>(
    ({ className, size, block, asChild, ...props }, ref) => {
      const Comp = asChild ? Slot : "button";
      return <Comp ref={ref} className={cn(gentButton({ tone, size, block }), className)} {...props} />;
    },
  );
  C.displayName = name;
  return C;
}

export const GoldButton = make("gold", "GoldButton");
export const GhostButton = make("ghost", "GhostButton");
