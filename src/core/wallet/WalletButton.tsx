import React, { useState } from 'react'
import {
  useAccount,
  useChainId,
  useDisconnect,
} from 'wagmi'
import { WalletModal } from './WalletModal'

const ROBINHOOD_CHAIN_ID = 4663

const shortenAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export const WalletButton: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { disconnect } = useDisconnect()

  if (isConnected && address) {
    const isRobinhoodChain =
      chainId === ROBINHOOD_CHAIN_ID

    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((value) => !value)}
          className="
            flex
            items-center
            gap-2
            rounded-lg
            border
            border-zinc-200
            bg-white
            px-3
            py-2
            text-xs
            font-bold
            text-zinc-800
            shadow-sm
            transition
            hover:bg-zinc-50
          "
        >
          <span
            className={`
              h-2
              w-2
              rounded-full
              ${
                isRobinhoodChain
                  ? 'bg-emerald-500'
                  : 'bg-amber-500'
              }
            `}
          />

          <span className="font-mono">
            {shortenAddress(address)}
          </span>
        </button>

        {menuOpen && (
          <div
            className="
              absolute
              right-0
              top-full
              z-[100]
              mt-2
              w-64
              rounded-xl
              border
              border-zinc-200
              bg-white
              p-3
              shadow-xl
            "
          >
            <div className="mb-3">
              <div
                className="
                  text-[9px]
                  font-bold
                  uppercase
                  tracking-wider
                  text-zinc-400
                "
              >
                Connected Wallet
              </div>

              <div className="mt-1 font-mono text-xs text-zinc-800">
                {shortenAddress(address)}
              </div>
            </div>

            <div className="mb-3 rounded-lg bg-zinc-50 p-3">
              <div
                className="
                  text-[9px]
                  font-bold
                  uppercase
                  tracking-wider
                  text-zinc-400
                "
              >
                Network
              </div>

              <div className="mt-1 text-xs font-semibold text-zinc-800">
                {isRobinhoodChain
                  ? 'Robinhood Chain'
                  : `Chain ${chainId}`}
              </div>

              {!isRobinhoodChain && (
                <div className="mt-1 text-[10px] text-amber-600">
                  Please switch to Robinhood Chain.
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                disconnect()
                setMenuOpen(false)
              }}
              className="
                w-full
                rounded-lg
                border
                border-zinc-200
                px-3
                py-2
                text-xs
                font-semibold
                text-zinc-700
                transition
                hover:bg-zinc-50
              "
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="
          flex
          items-center
          gap-2
          rounded-lg
          bg-zinc-900
          px-4
          py-2
          text-xs
          font-bold
          text-white
          shadow-sm
          transition
          hover:bg-zinc-800
        "
      >
        <span
          className="
            h-1.5
            w-1.5
            rounded-full
            bg-emerald-400
          "
        />

        CONNECT WALLET
      </button>

      <WalletModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  )
}