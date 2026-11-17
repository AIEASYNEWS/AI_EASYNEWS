export function StatusMessage({ children }: { children: string }) {
  if (!children) return null

  return (
    <p role="status" className="mx-5 mt-3 rounded-lg bg-surface px-4 py-3 text-sm leading-[21px] text-secondary">
      {children}
    </p>
  )
}
