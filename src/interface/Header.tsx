import { Info, KeyRound, Maximize2, Settings } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import packageJson from '../../package.json';
import { useCoreStore } from '../integration/store/coreStore';
import { useUiStore } from '../integration/store/uiStore';
import BYOKModal from './BYOKModal';
import InfoModal from './InfoModal';

const version = packageJson.version;

// ============================================================
// ROBONHOOD TOKEN
// ============================================================

const TOKEN_ADDRESS =
  '0x47e4c1b85d12fe1f13405224426dd8cca51df5e0';

const TOKEN_SYMBOL = '$TOKEN';

const GECKO_API_URL =
  `https://api.geckoterminal.com/api/v2/simple/networks/robinhood/token_price/${TOKEN_ADDRESS}`;

// ============================================================
// TOKEN PRICE TICKER
// ============================================================

const TokenPriceTicker: React.FC = () => {
  const [price, setPrice] = useState<string>('—');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    const fetchTokenPrice = async () => {
      try {
        setError(false);

        const response = await fetch(GECKO_API_URL, {
          method: 'GET',
          headers: {
            Accept:
              'application/json;version=20230203',
          },
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(
            `GeckoTerminal HTTP ${response.status}`
          );
        }

        const json = await response.json();

        if (cancelled) {
          return;
        }

        /*
         * GeckoTerminal simple token-price response:
         *
         * {
         *   data: {
         *     id: "robinhood",
         *     type: "simple_token_price",
         *     attributes: {
         *       token_prices: {
         *         "0x...": "0.000123"
         *       }
         *     }
         *   }
         * }
         */

        const tokenPrices =
          json?.data?.attributes?.token_prices;

        const rawPrice =
          tokenPrices?.[TOKEN_ADDRESS] ??
          tokenPrices?.[TOKEN_ADDRESS.toLowerCase()];

        if (rawPrice === undefined || rawPrice === null) {
          throw new Error(
            'Token price not found in GeckoTerminal response'
          );
        }

        const numericPrice = Number(rawPrice);

        if (!Number.isFinite(numericPrice)) {
          throw new Error('Invalid token price');
        }

        setPrice(formatTokenPrice(numericPrice));
      } catch (err) {
        console.error(
          '[RobOnHood] Failed to fetch token price:',
          err
        );

        if (!cancelled) {
          setError(true);
          setPrice('—');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    // Initial request
    fetchTokenPrice();

    /*
     * GeckoTerminal public API data is cached for about
     * one minute, so don't poll more frequently than that.
     */
    const interval = window.setInterval(
      fetchTokenPrice,
      60_000
    );

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <a
      href={`https://www.geckoterminal.com/robinhood/token/${TOKEN_ADDRESS}`}
      target="_blank"
      rel="noopener noreferrer"
      className="
        flex
        items-center
        gap-3
        h-9
        px-4
        border-l
        border-r
        border-zinc-100
        shrink-0
        hover:bg-zinc-50
        transition-colors
        cursor-pointer
      "
      title="View token on GeckoTerminal"
    >
      {/* Token label */}
      <div className="flex flex-col justify-center leading-none">
        <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">
          {TOKEN_SYMBOL}
        </span>

        <span className="text-[11px] font-bold text-zinc-700 font-mono mt-1">
          {loading ? 'Loading...' : price}
        </span>
      </div>

      {/* Live indicator */}
      <div className="flex items-center gap-1">
        <span
          className={`
            w-1.5
            h-1.5
            rounded-full
            ${
              error
                ? 'bg-red-400'
                : loading
                  ? 'bg-zinc-300'
                  : 'bg-emerald-400'
            }
          `}
        />

        <span className="text-[7px] font-bold uppercase tracking-wider text-zinc-400">
          {error ? 'Offline' : 'Live'}
        </span>
      </div>
    </a>
  );
};

// ============================================================
// PRICE FORMATTER
// ============================================================

const formatTokenPrice = (price: number): string => {
  if (!Number.isFinite(price)) {
    return '—';
  }

  if (price === 0) {
    return '$0';
  }

  /*
   * Very small token prices need more decimal places.
   */

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
    maximumFractionDigits: 4,
  })}`;
};

// ============================================================
// HEADER
// ============================================================

const Header: React.FC = () => {
  const {
    llmConfig,
    isBYOKOpen,
    setBYOKOpen,
  } = useUiStore();

  const { setViewMode } = useCoreStore();

  const [isInfoOpen, setIsInfoOpen] =
    useState(false);

  const hasKey = !!llmConfig.apiKey;

  // ==========================================================
  // FULLSCREEN
  // ==========================================================

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // ==========================================================
  // RENDER
  // ==========================================================

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

      <div className="flex items-center min-w-0">

        <img
          src="images/robonhood.svg"
          alt="RobOnHood"
          className="h-10 w-auto shrink-0"
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

          {/* Version / Info */}

          <div className="flex items-center gap-1 shrink-0">

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

          {/* RobOnHood Link */}

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

            <a
              href={`https://www.geckoterminal.com/robinhood/token/${TOKEN_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="
                text-zinc-300
                hover:text-darkDelegation
                transition-colors
                shrink-0
              "
              title="View token on GeckoTerminal"
            >
              {/* Token link icon intentionally minimal */}
            </a>

          </div>

        </div>
      </div>

      {/* ======================================================
          LIVE TOKEN PRICE
      ====================================================== */}

      <TokenPriceTicker />

      {/* ======================================================
          RIGHT: GLOBAL CONTROLS
      ====================================================== */}

      <div className="flex items-center gap-3">

        {/* Manage Teams */}

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

        {/* Divider */}

        <div
          className="
            w-px
            h-4
            bg-zinc-200
          "
        />

        {/* Fullscreen + API */}

        <div className="flex items-center gap-2">

          {/* Fullscreen */}

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

          {/* API Key */}

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