import { cn } from "@/lib/utils/cn";

export interface StepperStep {
  label: string;
}

export interface StepperProps {
  steps: StepperStep[];
  currentStep: number;
  className?: string;
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <ol className={cn("flex w-full items-center", className)}>
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;
        const isLast = index === steps.length - 1;

        return (
          <li key={step.label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-2">
              <span
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-heading text-sm font-semibold",
                  isCompleted && "bg-accent text-white",
                  isCurrent && "border-2 border-accent text-accent",
                  !isCompleted && !isCurrent && "border border-border text-ink-muted",
                )}
              >
                {stepNumber}
              </span>
              <span
                className={cn(
                  "whitespace-nowrap text-xs font-medium",
                  isCurrent ? "text-ink" : "text-ink-muted",
                )}
              >
                {step.label}
              </span>
            </div>
            {!isLast ? (
              <div
                className={cn(
                  "mx-3 h-px flex-1",
                  isCompleted ? "bg-accent" : "bg-border",
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
