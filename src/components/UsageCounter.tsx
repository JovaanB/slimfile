"use client";

interface UsageCounterProps {
  current: number;
  max: number;
}

export default function UsageCounter({ current, max }: UsageCounterProps) {
  const percentage = (current / max) * 100;
  const remaining = Math.max(0, max - current);

  const getColorClass = () => {
    if (percentage >= 100) return "text-red-600 bg-red-100 border-red-200";
    if (percentage >= 80)
      return "text-orange-600 bg-orange-100 border-orange-200";
    return "text-green-600 bg-green-100 border-green-200";
  };

  const getProgressColor = () => {
    if (percentage >= 100) return "bg-red-500";
    if (percentage >= 80) return "bg-orange-500";
    return "bg-green-500";
  };

  return (
    <div
      className={`px-4 py-2 rounded-2xl border ${getColorClass()} flex items-center space-x-3`}
    >
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium">
          {current >= max ? "🚫" : "⚡"}
        </span>
        <span className="text-sm font-semibold">
          {remaining} / {max}
        </span>
      </div>

      {/* Barre de progression circulaire */}
      <div className="relative w-8 h-8">
        <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 32 32">
          <circle
            cx="16"
            cy="16"
            r="12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            opacity="0.2"
          />
          <circle
            cx="16"
            cy="16"
            r="12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray={`${percentage * 0.75} 75`}
            className={`transition-all duration-500 ${getProgressColor()}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold">{remaining}</span>
        </div>
      </div>

      <div className="text-xs">
        {current >= max ? (
          <span className="font-medium">Limite atteinte</span>
        ) : (
          <span>compressions restantes</span>
        )}
      </div>
    </div>
  );
}
