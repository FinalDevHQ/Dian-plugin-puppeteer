import { type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react"

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md ${className}`}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`flex flex-col gap-1 px-5 pt-4 pb-2 ${className}`}>{children}</div>
}

export function CardContent({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`px-5 pb-5 ${className}`}>{children}</div>
}

export function Label({ children, htmlFor, className = "" }: { children: ReactNode; htmlFor?: string; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={`text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground ${className}`}>
      {children}
    </label>
  )
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`flex h-9 w-full min-w-0 rounded-lg border bg-background px-3 py-1 text-sm shadow-xs outline-none transition-all duration-150 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    />
  )
}

type ButtonVariant = "default" | "secondary" | "ghost"
export function Button({
  variant = "default",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const variants: Record<ButtonVariant, string> = {
    default:   "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/95 shadow-sm shadow-primary/10",
    secondary: "bg-accent text-accent-foreground hover:bg-accent/80 active:bg-accent/70 border",
    ghost:     "hover:bg-accent hover:text-accent-foreground active:bg-accent/80",
  }
  return (
    <button
      {...props}
      className={`inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-4 text-sm font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${className}`}
    />
  )
}

export function Badge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${className}`}>
      {children}
    </span>
  )
}

export function StatCard({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string | number
  mono?: boolean
}) {
  return (
    <Card className="px-4 py-3">
      <div className="flex flex-col gap-1">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className={`truncate text-2xl font-bold tabular-nums ${mono ? "font-mono" : ""}`}>
          {value}
        </span>
      </div>
    </Card>
  )
}

export function RegSection({
  title,
  count,
  empty,
  children,
}: {
  title: string
  count: number
  empty: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">{title}</span>
        <span className="text-[10px] tabular-nums text-muted-foreground">{count}</span>
      </div>
      {count === 0 ? (
        <p className="rounded-lg border border-dashed py-4 text-center text-[11px] text-muted-foreground">
          {empty}
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">{children}</div>
      )}
    </div>
  )
}

export function MethodBadge({ method }: { method: string }) {
  const cls: Record<string, string> = {
    GET:    "border-emerald-600/30 bg-emerald-50 text-emerald-700",
    POST:   "border-blue-600/30 bg-blue-50 text-blue-700",
    PUT:    "border-amber-600/30 bg-amber-50 text-amber-700",
    PATCH:  "border-violet-600/30 bg-violet-50 text-violet-700",
    DELETE: "border-red-600/30 bg-red-50 text-red-700",
  }
  return (
    <Badge className={`shrink-0 font-mono ${cls[method] ?? ""}`}>
      {method}
    </Badge>
  )
}
