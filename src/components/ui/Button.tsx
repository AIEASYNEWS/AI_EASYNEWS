import type { ButtonHTMLAttributes } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'text'
}

const variants = {
  primary: 'min-h-14 rounded-xl bg-[#333333] py-3 text-base font-bold text-white hover:bg-[#222222]',
  secondary: 'min-h-12 rounded-lg bg-[#e0e0e0] py-3 text-sm font-medium text-[#333333] hover:bg-[#d5d5d5]',
  text: 'min-h-11 rounded-lg bg-transparent py-2.5 text-sm font-medium text-[#333333] hover:bg-[#f5f5f5]',
}

export function Button({ variant = 'primary', className = '', type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex w-full cursor-pointer items-center justify-center px-4 leading-6 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#333333] disabled:cursor-not-allowed disabled:bg-[#e0e0e0] disabled:text-[#999999] motion-reduce:transition-none ${variants[variant]} ${className}`}
      {...props}
    />
  )
}
