import { CheckCircle, AlertCircle } from "lucide-react";

export const PASSWORD_RULES = [
  {
    label: "At least 8 characters long",
    error: "Password must be at least 8 characters long",
    test: (p: string) => p.length >= 8,
  },
  {
    label: "Contains uppercase letter",
    error: "Password must contain at least one uppercase letter",
    test: (p: string) => /[A-Z]/.test(p),
  },
  {
    label: "Contains lowercase letter",
    error: "Password must contain at least one lowercase letter",
    test: (p: string) => /[a-z]/.test(p),
  },
  {
    label: "Contains number",
    error: "Password must contain at least one number",
    test: (p: string) => /\d/.test(p),
  },
  {
    label: "Contains special character",
    error: "Password must contain at least one special character: ^ $ * . [ ] { } ( ) ? - \" ! @ # % & / \\ , > < ' : ; | ~ ` + =",
    test: (p: string) => /[^\w\s]/.test(p),
  },
] as const;

export function validatePassword(password: string): string[] {
  return PASSWORD_RULES.filter(r => !r.test(password)).map(r => r.error);
}

export function PasswordRequirement({ met, text }: { met: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      {met ? (
        <CheckCircle className="w-4 h-4 text-green-600" />
      ) : (
        <AlertCircle className="w-4 h-4 text-muted-foreground" />
      )}
      <span className={met ? "text-green-600" : "text-muted-foreground"}>{text}</span>
    </div>
  );
}

export function PasswordRequirements({ password }: { password: string }) {
  return (
    <div className="mt-3 space-y-2 text-sm">
      <div className="font-medium text-muted-foreground">Password Requirements:</div>
      <div className="space-y-1">
        {PASSWORD_RULES.map(rule => (
          <PasswordRequirement key={rule.label} met={rule.test(password)} text={rule.label} />
        ))}
      </div>
    </div>
  );
}
