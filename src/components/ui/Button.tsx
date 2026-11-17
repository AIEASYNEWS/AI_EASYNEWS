import type { ButtonHTMLAttributes } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'text'
}

const variants = {
  primary: 'min-h-14 rounded-xl bg-brand py-3 text-base font-bold text-white hover:bg-blue-700',
  secondary: 'min-h-12 rounded-lg bg-slate-100 py-3 text-sm font-medium text-secondary hover:bg-slate-200',
  text: 'min-h-11 rounded-lg bg-transparent py-2.5 text-sm font-medium text-secondary hover:bg-surface',
}

export function Button({ variant = 'primary', className = '', type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex w-full cursor-pointer items-center justify-center px-4 leading-6 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 motion-reduce:transition-none ${variants[variant]} ${className}`}
      {...props}
    />
  )
}
