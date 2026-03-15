'use client'

interface CircularProgressProps {
  percentage: number
  size?: number
  strokeWidth?: number
}

export default function CircularProgress({ 
  percentage, 
  size = 160, 
  strokeWidth = 12 
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Background circle */}
      <svg className="absolute transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#F5B301"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {/* Center content */}
      <div className="flex flex-col items-center justify-center z-10">
        <span className="text-4xl font-bold text-slate-900">{percentage}%</span>
        <span className="text-sm text-slate-500 font-medium">Complete</span>
      </div>
    </div>
  )
}
