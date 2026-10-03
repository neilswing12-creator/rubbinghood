import { createConfig, http } from 'wagmi'
import { injected } from 'wagmi/connectors'

export const robinhoodChain = {
  id: 4663,
  name: 'Robinhood Chain',

  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },

  rpcUrls: {
    default: {
      http: ['https://rpc.mainnet.chain.robinhood.com'],
    },
  },

  blockExplorers: {
    default: {
      name: 'Robinhood Explorer',
      url: 'https://robinhoodchain.blockscout.com',
    },
  },
} as const

export const walletConfig = createConfig({
  chains: [robinhoodChain],

  connectors: [
    injected(),
  ],

  transports: {
    [robinhoodChain.id]: http(
      'https://rpc.mainnet.chain.robinhood.com'
    ),
  },

  // Enables discovery of MetaMask, Phantom,
  // and other EIP-6963 compatible injected wallets.
  multiInjectedProviderDiscovery: true,
})