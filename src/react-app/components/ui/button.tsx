import type { ButtonHTMLAttributes, Ref } from "react";

type ButtonVariant =
  "default" | "outline" | "secondary" | "ghost" | "destructive";
type ButtonSize = "default" | "sm" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  ref?: Ref<HTMLButtonElement>;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  default:
    "bg-primary text-white shadow-[0_4px_14px_rgba(0,0,0,0.12)] hover:bg-primary-hover",
  outline: "border border-border bg-card text-text-secondary hover:bg-surface",
  secondary: "bg-surface text-text-secondary hover:bg-border-subtle",
  ghost: "text-text-secondary hover:bg-surface",
  destructive: "bg-danger text-white hover:opacity-90",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  default: "min-h-11 rounded-xl px-4 py-2 text-sm sm:px-3 sm:py-1.5 sm:text-xs",
  sm: "min-h-11 rounded-xl px-3 py-1 text-sm sm:px-2.5 sm:text-xs",
  lg: "min-h-11 rounded-xl px-6 py-3 text-sm sm:px-4 sm:py-2 sm:text-xs",
  icon: "min-h-11 min-w-11 rounded-xl p-2",
};

function joinClasses(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/** shadcn/ui方式でソースを所有する、プロジェクト共通のButtonプリミティブ。 */
function Button({
  variant = "default",
  size = "default",
  className,
  type = "button",
  ref,
  ...props
}: ButtonProps) {
  return (
    <button
      data-slot="button"
      ref={ref}
      type={type}
      className={joinClasses(
        "font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    />
  );
}

export default Button;
