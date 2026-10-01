import React from 'react';
import { X } from 'lucide-react';

interface InfoModalProps {
  onClose: () => void;
}

const InfoModal: React.FC<InfoModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-6 pointer-events-auto overflow-hidden">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-white/60 backdrop-blur-xl animate-in fade-in duration-500"
      />
      <div
        className="relative w-full max-w-xl bg-white rounded-[40px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] p-8 md:p-10 border border-zinc-100 animate-in fade-in slide-in-from-bottom-4 duration-500"
      >
        {/* Close Button X */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-zinc-300 hover:text-zinc-500 hover:bg-zinc-100 rounded-full transition-all active:scale-95 cursor-pointer"
        >
          <X size={20} strokeWidth={2.5} />
        </button>

        <div className="max-w-md mx-auto">
          <div className="flex justify-center mb-8">
            <img
              src="images/robonhood.svg"
              alt="RobOnHood Logo"
              width={256}
              className="h-auto"
            />
          </div>

          <h2 className="text-3xl font-black text-darkDelegation leading-[1.2] mb-6 tracking-tight text-center">
          Trade Smarter. See the Market Come Alive. We Moon!
          </h2>

          <div className="space-y-6 text-zinc-500 text-[15px] leading-relaxed text-center sm:text-left">
            <p>
            AI-powered 3D agents. Real-time market insights. Your next move, visualized.
            </p>
            <p>
            Robonhood brings live 3D AI agents to the world of on-chain trading, giving you interactive insights as the market moves. Watch your AI agents analyze market activity, uncover opportunities, and help you make more informed trading decisions.
            </p>
          </div>

          <div className="mt-6 flex flex-col items-center gap-6">
            <a
              href="https://basedbot.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 px-8 py-3.5 bg-zinc-100 text-zinc-600 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-zinc-200 transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
  <path d="M5.25 3.5a2.25 2.25 0 1 1 4.5 0 2.25 2.25 0 0 1-4.5 0Zm2.25-1a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"/>
  <path d="M1.5 10.75a2.25 2.25 0 1 1 4.5 0 2.25 2.25 0 0 1-4.5 0Zm2.25-1a1 1 0 1 0 0 2 1 1 0 0 0-1-1Z"/>
  <path d="M10 10.75a2.25 2.25 0 1 1 4.5 0 2.25 2.25 0 0 1-4.5 0Zm2.25-1a1 1 0 1 0 0 2 1 1 0 0 0-1-1Z"/>
  <path d="m6.9 5.05.7.7-2.55 2.55-.7-.7L6.9 5.05Zm2.2 0 2.55 2.55-.7.7L8.4 5.75l.7-.7ZM6 10.15h4v1.1H6v-1.1Z"/>
</svg>
              Trade on BasedBot
            </a>

            <div className="pt-4 border-t border-zinc-50 w-full flex flex-col items-center">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em] text-center leading-loose">
                CA: <a href="https://robonhood.fun" target="_blank" rel="noopener noreferrer" className="text-zinc-600 hover:text-darkDelegation transition-colors underline decoration-zinc-100 underline-offset-4">RobOnHood (robonhood.fun)</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoModal;


