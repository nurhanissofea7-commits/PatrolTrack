'use client'
import { cn } from '@/lib/utils'
import { avatarColorClasses, initials } from '@/lib/patrol'

export function GuardAvatar({ name, color, size = 'md', className }: { name: string; color: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-base',
  }
  return (
    <div className={cn('flex items-center justify-center rounded-full font-semibold ring-2 ring-background', avatarColorClasses(color), sizes[size], className)}>
      {initials(name)}
    </div>
  )
}
