'use client'

interface WakeUpViewProps {
  onWakeUp: () => void
  onSnooze: () => void
  snoozeCount: number
}

export function WakeUpView({ onWakeUp, onSnooze, snoozeCount }: WakeUpViewProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center space-y-10">
      {/* AI Avatar with pulse animation */}
      <div className="relative">
        <div className="w-32 h-32 rounded-full bg-[#F5B301] flex items-center justify-center animate-pulse-ring shadow-lg shadow-[#F5B301]/30">
          <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center">
            <span className="material-symbols-outlined text-[#F5B301] text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              wb_sunny
            </span>
          </div>
        </div>
        {/* Ping indicator */}
        <div className="absolute top-2 right-2">
          <span className="flex h-4 w-4 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F5B301] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-[#F5B301]"></span>
          </span>
        </div>
      </div>

      {/* Greeting */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-gray-900">Good Morning!</h1>
        <p className="text-lg text-gray-500">Time to start your miracle morning</p>
      </div>

      {/* Audio bars animation */}
      <div className="flex items-end gap-1.5 h-10">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="w-1.5 bg-[#F5B301] rounded-full audio-bar"
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-sm space-y-4">
        <button 
          onClick={onWakeUp}
          className="w-full bg-[#F5B301] hover:bg-[#E5A501] text-black font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-[#F5B301]/30 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">wb_sunny</span>
          I&apos;m Up!
        </button>
        <button
          onClick={onSnooze}
          disabled={snoozeCount >= 3}
          className="w-full bg-white border border-gray-200 text-gray-700 font-semibold py-4 px-6 rounded-xl transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">snooze</span>
          5 More Minutes {snoozeCount > 0 && `(${snoozeCount}/3)`}
        </button>
      </div>

      {/* Motivational hint */}
      {snoozeCount >= 2 && (
        <p className="text-sm text-gray-500 animate-pulse">
          💪 You&apos;ve got this! One more push!
        </p>
      )}
    </div>
  )
}
