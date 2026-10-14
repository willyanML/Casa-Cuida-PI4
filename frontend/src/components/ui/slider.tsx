import * as React from "react"
import { cn } from "@/lib/utils"

interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number[]
  onValueChange: (value: number[]) => void
  min?: number
  max?: number
  step?: number
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, value, onValueChange, min = 0, max = 100, step = 1, ...props }, ref) => {
    const val = value[0] ?? min
    const percentage = ((val - min) / (max - min)) * 100

    return (
      <div className={cn("relative flex w-full touch-none select-none items-center py-2", className)}>
        <input
          ref={ref}
          type="range"
          min={min}
          max={max}
          step={step}
          value={val}
          onChange={(e) => onValueChange([parseFloat(e.target.value)])}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          {...props}
        />
        <div className="relative h-2 w-full grow overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full bg-sky-500 transition-all rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div
          className="absolute block h-5 w-5 rounded-full border-2 border-sky-400 bg-slate-900 shadow transition-transform pointer-events-none ring-offset-background"
          style={{ left: `calc(${percentage}% - 10px)` }}
        />
      </div>
    )
  }
)
Slider.displayName = "Slider"

export { Slider }
