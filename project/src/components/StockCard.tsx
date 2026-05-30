import { TrendingUp, TrendingDown, Star } from 'lucide-react';
import { StockQuote } from '../types';

interface StockCardProps {
  quote: StockQuote;
  isWatchlisted?: boolean;
  onToggleWatchlist?: (symbol: string) => void;
  onClick?: (symbol: string) => void;
}

export default function StockCard({ quote, isWatchlisted, onToggleWatchlist, onClick }: StockCardProps) {
  const isPositive = quote.changePercent >= 0;

  return (
    <div
      onClick={() => onClick?.(quote.symbol)}
      className="bg-[#1a2235] hover:bg-[#1f2940] border border-slate-700/40 hover:border-slate-600/50 rounded-xl p-4 cursor-pointer transition-all duration-200 group relative overflow-hidden"
    >
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${isPositive ? 'bg-emerald-500/[0.03]' : 'bg-red-500/[0.03]'}`} />

      <div className="relative">
        <div className="flex items-start justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-sm">{quote.symbol}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-md font-semibold tabular-nums ${isPositive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
              {isPositive ? '+' : ''}{quote.changePercent.toFixed(2)}%
            </span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleWatchlist?.(quote.symbol); }}
            className={`p-1 rounded-lg transition-all ${isWatchlisted ? 'text-amber-400' : 'text-slate-600 opacity-0 group-hover:opacity-100 hover:text-amber-400'}`}
          >
            <Star className={`w-3.5 h-3.5 ${isWatchlisted ? 'fill-amber-400' : ''}`} />
          </button>
        </div>

        <p className="text-xl font-bold text-white tabular-nums leading-none mb-2">${quote.price.toFixed(2)}</p>

        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-1 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span className="text-xs font-medium tabular-nums">{isPositive ? '+' : ''}{quote.change.toFixed(2)}</span>
          </div>
          <span className="text-slate-600 text-xs tabular-nums">{(quote.volume / 1e6).toFixed(1)}M</span>
        </div>
      </div>

      <div className={`absolute bottom-0 right-0 left-0 h-[2px] rounded-b-xl ${isPositive ? 'bg-gradient-to-r from-transparent via-emerald-500/50 to-emerald-400/70' : 'bg-gradient-to-r from-transparent via-red-500/50 to-red-400/70'}`} />
    </div>
  );
}
