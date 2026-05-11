'use client'

import { Play, Pause, SkipBack, SkipForward, RotateCcw, Gauge } from 'lucide-react'
import { useSceneStore } from '@/store/use-scene-store'

const SPEEDS = [0.5, 1, 2, 4] as const

export function PlaybackBar() {
  const {
    boxes,
    loadingOrder,
    currentStep,
    playbackState,
    playbackSpeed,
    play,
    pause,
    reset,
    stepForward,
    stepBackward,
    setStep,
    setPlaybackSpeed,
  } = useSceneStore()

  if (boxes.length === 0) return null

  const total = loadingOrder.length
  const isPlaying = playbackState === 'playing'

  return (
    <div className="an-glass an-toolbar-border absolute bottom-28 left-1/2 -translate-x-1/2 flex items-center gap-3 p-3 rounded-2xl z-20 min-w-[480px] shadow-xl">

      {/* Reset */}
      <button
        type="button"
        onClick={reset}
        title="Reset (Home)"
        className="p-2 rounded-lg an-text-on-surface-muted hover:an-text-primary transition-colors"
      >
        <RotateCcw className="w-4 h-4" />
      </button>

      {/* Step backward */}
      <button
        type="button"
        onClick={stepBackward}
        disabled={currentStep === 0}
        title="Step backward (←)"
        className="p-2 rounded-lg disabled:opacity-30 an-text-on-surface-muted hover:an-text-primary transition-colors"
      >
        <SkipBack className="w-4 h-4" />
      </button>

      {/* Play / Pause */}
      <button
        type="button"
        onClick={() => (isPlaying ? pause() : play())}
        disabled={currentStep >= total}
        title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        className="p-2 rounded-lg an-bg-surface-container-high disabled:opacity-30 hover:opacity-80 transition-opacity"
      >
        {isPlaying
          ? <Pause className="w-5 h-5 an-text-primary" />
          : <Play className="w-5 h-5 an-text-primary" />}
      </button>

      {/* Step forward */}
      <button
        type="button"
        onClick={stepForward}
        disabled={currentStep >= total}
        title="Step forward (→)"
        className="p-2 rounded-lg disabled:opacity-30 an-text-on-surface-muted hover:an-text-primary transition-colors"
      >
        <SkipForward className="w-4 h-4" />
      </button>

      {/* Step counter + timeline scrubber */}
      <div className="flex items-center gap-2 flex-1">
        <span className="text-xs font-mono an-text-on-surface-muted tabular-nums w-12 text-right shrink-0">
          {currentStep}/{total}
        </span>
        <input
          type="range"
          min={0}
          max={total}
          value={currentStep}
          onChange={(e) => setStep(Number(e.target.value))}
          className="flex-1 accent-indigo-500 cursor-pointer"
        />
      </div>

      {/* Speed selector */}
      <div className="flex items-center gap-1 shrink-0">
        <Gauge className="w-3.5 h-3.5 an-text-on-surface-muted" />
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setPlaybackSpeed(s)}
            className={`px-1.5 py-0.5 text-[10px] font-mono rounded transition-colors ${
              playbackSpeed === s
                ? 'an-bg-surface-container-high an-text-primary font-bold'
                : 'an-text-on-surface-muted hover:an-text-primary'
            }`}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  )
}
