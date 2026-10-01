import { Info, KeyRound, Maximize2, Settings } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import packageJson from '../../package.json';
import { useCoreStore } from '../integration/store/coreStore';
import { useUiStore } from '../integration/store/uiStore';
import BYOKModal from './BYOKModal';
import InfoModal from './InfoModal';

const version = packageJson.version;

/* ============================================================
   ROBONHOOD MARKET CONFIG
   ============================================================ */

interface MarketConfig {
  symbol: string;
  poolAddress: string;
}

const MARKETS: MarketConfig[] = [
  {
    symbol: 'NVDA',
    poolAddress:
      '0xd4eb21209c4d6093f80b5b84f5c45cc093ea14a3',
  },
  {
    symbol: 'MARKET 2',
    poolAddress:
      '0x5875d407a42965b0e768c8925cea290e06fa50603ef34fc99eb92a1050e6ae36',
  },
  {
    symbol: 'MARKET 3',
    poolAddress:
      '0xc61284332117c3fb23a2a56cceffd07f7af60029',
  },
];

/* ============================================================
   TYPES
   ============================================================ */

interface MarketData {
  price: string;
  change24h: number | null;
  loading: boolean;
  error: boolean;
}

/* ============================================================
   PRICE FORMATTER
   ============================================================ */

const formatPrice = (price: number): string => {
  if (!Number.isFinite(price)) {
    return '—';
  }

  if (price === 0) {
    return '$0';
  }

  if (price < 0.000001) {
    return `$${price.toFixed(10)}`;
  }

  if (price < 0.0001) {
    return `$${price.toFixed(8)}`;
  }

  if (price < 0.01) {
    return `$${price.toFixed(6)}`;
  }

  if (price < 1) {
    return `$${price.toFixed(4)}`;
  }

  return `$${price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/* ============================================================
   SINGLE MARKET DISPLAY
   ============================================================ */

interface MarketTickerProps {
  market: MarketConfig;
  data: MarketData;
}

const MarketTicker: React.FC<MarketTickerProps> = ({
  market,
  data,
}) => {
  const isPositive =
    data.change24h !== null &&
    data.change24h >= 0;

  const geckoUrl =
    `https://www.geckoterminal.com/robinhood/pools/${market.poolAddress}`;

  return (
    <a
      href={geckoUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={`View ${market.symbol} on GeckoTerminal`}
      className="
        flex
        items-center
        gap-2
        h-9
        px-3
        border-l
        border-zinc-100
        shrink-0
        hover:bg-zinc-50
        transition-colors
        cursor-pointer
      "
    >
      {/* Symbol */}
      <div className="flex flex-col justify-center leading-none">
        <span
          className="
            text-[8px]
            font-black
            uppercase
            tracking-widest
            text-zinc-400
          "
        >
          {market.symbol}
        </span>

        <span
          className="
            text-[11px]
            font-bold
            text-zinc-700
            font-mono
            mt-1
          "
        >
          {data.loading
            ? 'Loading...'
            : data.price}
        </span>
      </div>

      {/* 24H CHANGE */}
      {data.change24h !== null && (
        <span
          className={`
            text-[8px]
            font-bold
            whitespace-nowrap
            ${
              isPositive
                ? 'text-emerald-500'
                : 'text-red-500'
            }
          `}
        >
          {isPositive ? '▲' : '▼'}{' '}
          {Math.abs(data.change24h).toFixed(2)}%
        </span>
      )}

      {/* LIVE STATUS */}
      <span
        className={`
          w-1.5
          h-1.5
          rounded-full
          ${
            data.error
              ? 'bg-red-400'
              : data.loading
                ? 'bg-zinc-300'
                : 'bg-emerald-400'
          }
        `}
      />
    </a>
  );
};

/* ============================================================
   MARKET TICKER CONTAINER
   ============================================================ */

const MarketTickers: React.FC = () => {
  const [marketData, setMarketData] =
    useState<Record<string, MarketData>>(() => {
      const initial: Record<string, MarketData> = {};

      MARKETS.forEach((market) => {
        initial[market.poolAddress] = {
          price: '—',
          change24h: null,
          loading: true,
          error: false,
        };
      });

      return initial;
    });

  useEffect(() => {
    let cancelled = false;

    const fetchMarkets = async () => {
      await Promise.all(
        MARKETS.map(async (market) => {
          try {
            const apiUrl =
              `https://api.geckoterminal.com/api/v2/networks/robinhood/pools/${market.poolAddress}`;

            const response = await fetch(apiUrl, {
              method: 'GET',
              headers: {
                Accept:
                  'application/json;version=20230203',
              },
              cache: 'no-store',
            });

            if (!response.ok) {
              throw new Error(
                `HTTP ${response.status}`
              );
            }

            const json = await response.json();

            const attributes =
              json?.data?.attributes;

            if (!attributes) {
              throw new Error(
                'Pool data unavailable'
              );
            }

            /*
             * GeckoTerminal pool endpoint
             *
             * base_token_price_usd
             * price_change_percentage.h24
             */

            const rawPrice =
              attributes.base_token_price_usd;

            const numericPrice =
              Number(rawPrice);

            if (!Number.isFinite(numericPrice)) {
              throw new Error(
                'Invalid price'
              );
            }

            const rawChange =
              attributes
                ?.price_change_percentage
                ?.h24;

            const numericChange =
              Number(rawChange);

            if (cancelled) {
              return;
            }

            setMarketData((previous) => ({
              ...previous,
              [market.poolAddress]: {
                price:
                  formatPrice(
                    numericPrice
                  ),
                change24h:
                  Number.isFinite(
                    numericChange
                  )
                    ? numericChange
                    : null,
                loading: false,
                error: false,
              },
            }));
          } catch (error) {
            console.error(
              `[RobOnHood] Failed to fetch ${market.symbol}:`,
              error
            );

            if (cancelled) {
              return;
            }

            setMarketData((previous) => ({
              ...previous,
              [market.poolAddress]: {
                price: '—',
                change24h: null,
                loading: false,
                error: true,
              },
            }));
          }
        })
      );
    };

    // Initial load
    fetchMarkets();

    /*
     * Refresh once per minute.
     * GeckoTerminal public API data is cached/rate-limited.
     */
    const interval =
      window.setInterval(
        fetchMarkets,
        60_000
      );

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <div
      className="
        flex
        items-center
        shrink-0
        overflow-hidden
      "
    >
      {MARKETS.map((market) => (
        <MarketTicker
          key={market.poolAddress}
          market={market}
          data={
            marketData[
              market.poolAddress
            ]
          }
        />
      ))}
    </div>
  );
};

/* ============================================================
   HEADER
   ============================================================ */

const Header: React.FC = () => {
  const {
    llmConfig,
    isBYOKOpen,
    setBYOKOpen,
  } = useUiStore();

  const { setViewMode } = useCoreStore();

  const [
    isInfoOpen,
    setIsInfoOpen,
  ] = useState(false);

  const hasKey =
    !!llmConfig.apiKey;

  /* ==========================================================
     FULLSCREEN
     ========================================================== */

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  /* ==========================================================
     RENDER
     ========================================================== */

  return (
    <header
      className="
        h-14
        border-b
        border-zinc-100
        flex
        items-center
        justify-between
        px-6
        bg-white
        shrink-0
        relative
        z-40
      "
    >
      {/* ======================================================
          LEFT: PROJECT TITLE
      ====================================================== */}

      <div
        className="
          flex
          items-center
          min-w-0
        "
      >
        <img
          src="images/robonhood.svg"
          alt="RobOnHood"
          className="
            h-10
            w-auto
            shrink-0
          "
        />

        <div
          className="
            flex
            items-center
            gap-3
            self-start
            mt-3
            ml-2
            min-w-0
          "
        >
          {/* INFO + VERSION */}

          <div
            className="
              flex
              items-center
              gap-1
              shrink-0
            "
          >
            <button
              onClick={() =>
                setIsInfoOpen(true)
              }
              className="
                text-zinc-300
                hover:text-zinc-500
                transition-colors
                cursor-pointer
              "
              title="Information"
            >
              <Info
                size={14}
                strokeWidth={2}
              />
            </button>

            <span
              className="
                text-[10px]
                font-medium
                text-zinc-400
                font-mono
              "
            >
              v{version}
            </span>
          </div>

          {/* ROBONHOOD */}

          <div
            className="
              flex
              items-center
              gap-3
              min-w-0
            "
          >
            <a
              href="https://robonhood.fun"
              target="_blank"
              rel="noopener noreferrer"
              className="
                text-[10px]
                font-medium
                text-zinc-400
                hover:text-darkDelegation
                transition-colors
                truncate
              "
            >
              @robonhood
            </a>
          </div>
        </div>
      </div>

      {/* ======================================================
          THREE LIVE MARKETS
      ====================================================== */}

      <MarketTickers />

      {/* ======================================================
          RIGHT: GLOBAL CONTROLS
      ====================================================== */}

      <div
        className="
          flex
          items-center
          gap-3
        "
      >
        {/* MANAGE TEAMS */}

        <button
          onClick={() =>
            setViewMode('design')
          }
          className="
            flex
            items-center
            gap-2
            px-3
            py-1
            bg-darkDelegation
            hover:bg-darkDelegation
            text-white
            rounded-lg
            transition-all
            shadow-lg
            shadow-black/10
            active:scale-95
            cursor-pointer
            h-9
            shrink-0
            ml-1
          "
          title="Manage Teams"
        >
          <Settings
            size={14}
            className="
              group-hover:rotate-45
              transition-transform
            "
          />

          <span
            className="
              text-[10px]
              font-black
              uppercase
              tracking-wider
              ml-1
              hidden
              sm:inline
            "
          >
            Manage Teams
          </span>
        </button>

        {/* DIVIDER */}

        <div
          className="
            w-px
            h-4
            bg-zinc-200
          "
        />

        {/* FULLSCREEN + API */}

        <div
          className="
            flex
            items-center
            gap-2
          "
        >
          <button
            onClick={handleFullscreen}
            className="
              text-zinc-400
              hover:text-darkDelegation
              transition-colors
              p-1
            "
            title="Fullscreen Browser"
          >
            <Maximize2 size={16} />
          </button>

          <button
            onClick={() =>
              setBYOKOpen(true)
            }
            className="
              relative
              text-zinc-400
              hover:text-darkDelegation
              transition-colors
              p-1
            "
            title="API Key (BYOK)"
          >
            <KeyRound
              size={16}
              className={
                hasKey
                  ? 'text-emerald-500 hover:text-emerald-600'
                  : ''
              }
            />

            {hasKey && (
              <span
                className="
                  absolute
                  top-0.5
                  right-0.5
                  w-1.5
                  h-1.5
                  rounded-full
                  bg-emerald-400
                "
              />
            )}
          </button>
        </div>
      </div>

      {/* ======================================================
          INFO MODAL
      ====================================================== */}

      {isInfoOpen && (
        <InfoModal
          key="info-modal"
          onClose={() =>
            setIsInfoOpen(false)
          }
        />
      )}

      {/* ======================================================
          BYOK MODAL
      ====================================================== */}

      {isBYOKOpen && (
        <BYOKModal
          key="byok-modal"
          onClose={() =>
            setBYOKOpen(false)
          }
        />
      )}
    </header>
  );
};

export default Header;