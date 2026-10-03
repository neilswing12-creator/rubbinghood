import React from 'react'
import { useConnect } from 'wagmi'

interface WalletModalProps {
  open: boolean
  onClose: () => void
}

export const WalletModal: React.FC<WalletModalProps> = ({
  open,
  onClose,
}) => {
  const { connectors, connect, isPending, error } = useConnect()

  if (!open) {
    return null
  }

  return (
    <div
      className="
        fixed
        inset-0
        z-[999]
        flex
        items-center
        justify-center
        bg-black/30
        px-4
        backdrop-blur-sm
      "
      onClick={onClose}
    >
      <div
        className="
          w-full
          max-w-[380px]
          rounded-2xl
          border
          border-zinc-200
          bg-white
          p-5
          shadow-2xl
        "
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <div className="text-sm font-bold text-zinc-900">
              Connect Wallet
            </div>

            <div className="mt-1 text-xs text-zinc-400">
              Connect to Robinhood Chain
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              text-xl
              leading-none
              text-zinc-400
              transition
              hover:text-zinc-800
            "
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Wallets */}
        <div className="space-y-2">
          {connectors.map((connector) => {
            const name = connector.name.toLowerCase()

            const isPhantom = name.includes('phantom')
            const isMetaMask = name.includes('metamask')

            return (
              <button
                key={connector.uid}
                type="button"
                disabled={isPending}
                onClick={() => {
                  connect(
                    {
                      connector,
                      chainId: 4663,
                    },
                    {
                      onSuccess: () => {
                        onClose()
                      },
                    },
                  )
                }}
                className="
                  flex
                  w-full
                  items-center
                  gap-3
                  rounded-xl
                  border
                  border-zinc-200
                  bg-white
                  p-3
                  text-left
                  transition
                  hover:border-zinc-300
                  hover:bg-zinc-50
                  disabled:cursor-wait
                  disabled:opacity-50
                "
              >
                <div
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-zinc-100
                    text-lg
                  "
                >
                  {isPhantom
                    ? '👻'
                    : isMetaMask
                      ? '🦊'
                      : '🔗'}
                </div>

                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-zinc-900">
                    {connector.name}
                  </div>

                  <div className="mt-0.5 text-[10px] text-zinc-400">
                    {isPhantom
                      ? 'Connect with Phantom'
                      : isMetaMask
                        ? 'Connect with MetaMask'
                        : 'EVM wallet'}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Error */}
        {error && (
          <div
            className="
              mt-3
              rounded-lg
              bg-red-50
              p-3
              text-[10px]
              leading-relaxed
              text-red-600
            "
          >
            {error.message}
          </div>
        )}

        {/* Network information */}
        <div className="mt-5 border-t border-zinc-100 pt-4 text-center">
          <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
            Network
          </div>

          <div className="mt-1 text-xs font-semibold text-zinc-700">
            Robinhood Chain
          </div>

          <div className="mt-1 font-mono text-[9px] text-zinc-400">
            Chain ID 4663
          </div>
        </div>
      </div>
    </div>
  )
}