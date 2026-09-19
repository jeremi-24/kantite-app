import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-slate-900 text-slate-50 hover:bg-slate-800',
        secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
        destructive: 'bg-red-100 text-red-700 hover:bg-red-200',
        success: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200',
        warning: 'bg-amber-100 text-amber-800 hover:bg-amber-200',
        info: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200',
        danger: 'bg-rose-100 text-rose-800 hover:bg-rose-200',
        purple: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
        outline: 'text-slate-950 border border-slate-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
