'use client'

import { useEffect, useRef } from 'react'
import { ChevronDown, Zap, Eye, Maximize2, Type, Smile } from 'lucide-react'

export default function TradingChart() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Dynamic import to avoid SSR issues
    import('lightweight-charts').then(({ createChart, ColorType }) => {
      const chart = createChart(containerRef.current!, {
        layout: {
          background: { type: ColorType.Solid, color: '#ffffff' },
          textColor: '#000000',
        },
        width: containerRef.current!.clientWidth,
        height: containerRef.current!.clientHeight,
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
        },
      })

      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#10b981',
        downColor: '#ef4444',
        borderVisible: true,
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444',
      })

      // Mock data
      const data = [
        { time: '2024-01-01' as const, open: 102000, high: 103500, low: 101500, close: 103000 },
        { time: '2024-01-02' as const, open: 103000, high: 103800, low: 102200, close: 102800 },
        { time: '2024-01-03' as const, open: 102800, high: 102500, low: 101200, close: 101800 },
        { time: '2024-01-04' as const, open: 101800, high: 105500, low: 101500, close: 105000 },
        { time: '2024-01-05' as const, open: 105000, high: 106000, low: 104500, close: 105500 },
        { time: '2024-01-06' as const, open: 105500, high: 108000, low: 105000, close: 107500 },
        { time: '2024-01-07' as const, open: 107500, high: 109000, low: 107000, close: 108500 },
        { time: '2024-01-08' as const, open: 108500, high: 109500, low: 108000, close: 109000 },
        { time: '2024-01-09' as const, open: 109000, high: 109200, low: 107800, close: 108200 },
        { time: '2024-01-10' as const, open: 108200, high: 108500, low: 106800, close: 107200 },
      ]

      candlestickSeries.setData(data)
      chart.timeScale().fitContent()

      const handleResize = () => {
        if (containerRef.current) {
          chart.applyOptions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight })
        }
      }

      window.addEventListener('resize', handleResize)

      return () => {
        window.removeEventListener('resize', handleResize)
        chart.remove()
      }
    })
  }, [])

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Chart header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          {/* Pair selector */}
          <button className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded border border-gray-200">
            <span className="text-sm font-semibold text-gray-950">BTC / USDT</span>
            <ChevronDown size={16} className="text-gray-600" />
          </button>

          {/* Timeframe buttons */}
          <div className="flex gap-1 bg-gray-50 p-1 rounded">
            {['1m', '5m', '1h', '4h', '1d'].map((tf) => (
              <button
                key={tf}
                className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                  tf === '1h' ? 'bg-white text-gray-950 border border-gray-200' : 'text-gray-600 hover:text-gray-950'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Price info */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-950">$109,000</p>
            <p className="text-xs text-green-600 font-medium">+6.86%</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-200">
        <button className="p-2 hover:bg-gray-100 rounded transition-colors" title="Crosshair">
          <Zap size={16} className="text-gray-600" />
        </button>
        <button className="p-2 hover:bg-gray-100 rounded transition-colors" title="Measure">
          <Eye size={16} className="text-gray-600" />
        </button>
        <button className="p-2 hover:bg-gray-100 rounded transition-colors" title="Draw">
          <Type size={16} className="text-gray-600" />
        </button>
        <button className="p-2 hover:bg-gray-100 rounded transition-colors" title="Draw tools">
          <Smile size={16} className="text-gray-600" />
        </button>
        <div className="flex-1"></div>
        <button className="p-2 hover:bg-gray-100 rounded transition-colors" title="Fullscreen">
          <Maximize2 size={16} className="text-gray-600" />
        </button>
      </div>

      {/* Chart container */}
      <div ref={containerRef} className="flex-1" />
    </div>
  )
}
