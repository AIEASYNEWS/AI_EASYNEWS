import type { InputHTMLAttributes, ReactNode } from 'react'
import { LineIcon } from '../ui/LineIcon'

export function ChoiceChip({ label, selected, onClick, removable, small }: { label: string; selected?: boolean; onClick: () => void; removable?: boolean; small?: boolean }) {
  return <button type="button" onClick={onClick} aria-pressed={removable ? undefined : selected} aria-label={removable ? `${label} 삭제` : undefined}
    className={`inline-flex cursor-pointer items-center justify-center gap-1 rounded-full border font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none ${small ? 'h-8 px-3 text-[13px]' : 'h-9 px-[14px] text-sm'} ${selected ? 'border-brand bg-brand text-white' : removable ? 'border-transparent bg-surface text-secondary' : 'border-slate-300 bg-white text-secondary hover:bg-surface'}`}>
    {selected && !removable && <LineIcon name="check" size={14} />}
    {label}
    {removable && <LineIcon name="close" size={14} />}
  </button>
}

export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return <label htmlFor={htmlFor} className="mb-2 block text-sm leading-5 font-bold text-ink">{children}</label>
}

export function TextInput({ invalid, className = '', ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input {...props} aria-invalid={invalid || undefined}
    className={`h-11 w-full min-w-0 rounded-lg border bg-white px-3 text-sm text-ink placeholder:text-slate-400 focus:border-brand focus:outline-none ${invalid ? 'border-red-500' : 'border-slate-300'} ${className}`} />
}

export function SideButton({ children, onClick, disabled, type = 'button' }: { children: ReactNode; onClick?: () => void; disabled?: boolean; type?: 'button' | 'submit' }) {
  return <button type={type} onClick={onClick} disabled={disabled}
    className="h-11 shrink-0 cursor-pointer rounded-full border border-slate-300 bg-white px-4 text-[13px] font-medium text-secondary hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:text-slate-400">{children}</button>
}

export function FieldMessage({ tone, children, id }: { tone: 'hint' | 'error' | 'success'; children: ReactNode; id?: string }) {
  return <p id={id} aria-live="polite" className={`mt-2 flex items-center gap-1 text-xs leading-[18px] ${tone === 'error' ? 'text-red-600' : tone === 'success' ? 'text-brand' : 'text-muted'}`}>
    {tone === 'error' && <LineIcon name="info" size={14} />}{tone === 'success' && <LineIcon name="check" size={14} />}{children}
  </p>
}

export function PillButton({ children, onClick, variant = 'primary', disabled, className = '', type = 'button', form }: { children: ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'outline'; disabled?: boolean; className?: string; type?: 'button' | 'submit'; form?: string }) {
  const styles = { primary: 'bg-brand text-white hover:bg-blue-700', secondary: 'bg-slate-100 text-secondary hover:bg-slate-200', outline: 'border border-slate-300 bg-white text-secondary hover:bg-surface' }
  return <button type={type} form={form} onClick={onClick} disabled={disabled}
    className={`inline-flex h-12 cursor-pointer items-center justify-center rounded-full px-5 text-[15px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 motion-reduce:transition-none ${styles[variant]} ${className}`}>{children}</button>
}

export function TopicLabel({ children }: { children: ReactNode }) {
  return <span className="inline-flex h-6 items-center rounded bg-surface px-2 text-xs font-medium text-secondary">{children}</span>
}
