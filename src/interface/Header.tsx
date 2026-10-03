import { ExternalLink, Info, Maximize2, Settings } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import packageJson from '../../package.json';
import { useCoreStore } from '../integration/store/coreStore';
import InfoModal from './InfoModal';

const version = packageJson.version;

/* ============================================================
   DEXSCREENER ROBINHOOD CHAIN
   ============================================================ */

const DEX_ROBINHOOD_API = '/api/dex/robinhood';
const DEXSCREENER_BASE_URL = 'https://dexscreener.com/robinhood';

/* ============================================================
   TYPES
   ============================================================ */

interface DexToken {
  address: string;
  name: string;
  symbol: string;
  logo?: string | null;

  priceUsd?: string | null;

  marketCap?: number | null;
  fdv?: number | null;
  liquidityUsd?: number | null;
  volume24h?: number | null;
  priceChange24h?: number | null;

  buys24h?: number | null;
  sells24h?: number | null;

  pairAddress?: string | null;
  dex?: string | null;
  labels?: string[];

  url?: string | null;
}

interface DexResponse {
  source?: string;
  chain?: string;
  chainId?: number;
  updatedAt?: string;
  stale?: boolean;
  items?: DexToken[];
}

/* ============================================================
   FORMATTERS
   ============================================================ */

const formatUSD = (value?: number | null): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
  }

  const number = Number(value);

  if (number >= 1_000_000_000) {
    return `$${(number / 1_000_000_000).toFixed(2)}B`;
  }

  if (number >= 1_000_000) {
    return `$${(number / 1_000_000).toFixed(2)}M`;
  }

  if (number >= 1_000) {
    return `$${(number / 1_000).toFixed(2)}K`;
  }

  if (number >= 1) {
    return `$${number.toFixed(2)}`;
  }

  if (number > 0) {
    return `$${number.toPrecision(3)}`;
  }

  return '$0';
};

const formatPercent = (value?: number | null): string => {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return '0.0%';
  }

  const number = Number(value);

  if (number > 0) {
    return `+${number.toFixed(1)}%`;
  }

  return `${number.toFixed(1)}%`;
};

/* ============================================================
   TOKEN ITEM
   ============================================================ */

interface DexTokenItemProps {
  token: DexToken;
}

const DexTokenItem: React.FC<DexTokenItemProps> = ({ token }) => {
  const name =
    token.name?.trim() ||
    token.symbol?.trim() ||
    'Unknown Token';

  const symbol =
    token.symbol?.trim() ||
    'TOKEN';

  const cleanSymbol = symbol.replace(/^\$/, '');

  const address = token.address?.trim();

  const tokenUrl =
    token.url?.trim() ||
    (token.pairAddress
      ? `${DEXSCREENER_BASE_URL}/${token.pairAddress}`
      : address
        ? `${DEXSCREENER_BASE_URL}/${address}`
        : DEXSCREENER_BASE_URL);

  const logo = token.logo || '';

  const marketCap = token.marketCap ?? 0;
  const liquidity = token.liquidityUsd ?? 0;
  const volume24h = token.volume24h ?? 0;
  const priceChange = token.priceChange24h ?? 0;

  const isPositive = priceChange > 0;
  const isNegative = priceChange < 0;

  return (
    <a
      href={tokenUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={`View ${name} on DexScreener`}
      className="
        group
        flex
        items-center
        gap-2
        h-14
        px-3
        shrink-0
        border-l
        border-zinc-100
        hover:bg-zinc-50
        transition-colors
        cursor-pointer
      "
    >
      {/* ======================================================
          TOKEN LOGO
      ====================================================== */}

      <div
        className="
          w-7
          h-7
          rounded-full
          overflow-hidden
          bg-zinc-100
          border
          border-zinc-200
          shrink-0
        "
      >
        {logo ? (
          <img
            src={logo}
            alt=""
            className="
              w-full
              h-full
              object-cover
              group-hover:scale-110
              transition-transform
            "
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div
            className="
              w-full
              h-full
              flex
              items-center
              justify-center
              text-[8px]
              font-black
              text-zinc-400
            "
          >
            $
          </div>
        )}
      </div>

      {/* ======================================================
          TOKEN NAME
      ====================================================== */}

      <div
        className="
          flex
          flex-col
          justify-center
          leading-none
          min-w-0
          w-[105px]
        "
      >
        <div className="flex items-center gap-1.5">
          <span
            className="
              text-[9px]
              font-black
              uppercase
              tracking-wider
              text-zinc-700
              truncate
            "
          >
            ${cleanSymbol}
          </span>

          <span
            className="
              flex
              items-center
              gap-1
              text-[6px]
              font-black
              uppercase
              tracking-wider
              text-blue-500
              shrink-0
            "
          >
            <span
              className="
                w-1.5
                h-1.5
                rounded-full
                bg-blue-400
                animate-pulse
              "
            />

            LIVE
          </span>
        </div>

        <span
          className="
            text-[8px]
            font-medium
            text-zinc-400
            truncate
            mt-1
          "
        >
          {name}
        </span>
      </div>

      {/* ======================================================
          MARKET CAP
      ====================================================== */}

      <div
        className="
          flex
          flex-col
          justify-center
          leading-none
          shrink-0
          min-w-[52px]
        "
      >
        <span
          className="
            text-[6px]
            font-bold
            uppercase
            tracking-wider
            text-zinc-300
          "
        >
          MCAP
        </span>

        <span
          className="
            text-[8px]
            font-bold
            font-mono
            text-zinc-600
            mt-1
          "
        >
          {formatUSD(marketCap)}
        </span>
      </div>

      {/* ======================================================
          LIQUIDITY
      ====================================================== */}

      <div
        className="
          hidden
          xl:flex
          flex-col
          justify-center
          leading-none
          shrink-0
          min-w-[52px]
        "
      >
        <span
          className="
            text-[6px]
            font-bold
            uppercase
            tracking-wider
            text-zinc-300
          "
        >
          LIQ
        </span>

        <span
          className="
            text-[8px]
            font-bold
            font-mono
            text-zinc-600
            mt-1
          "
        >
          {formatUSD(liquidity)}
        </span>
      </div>

      {/* ======================================================
          24H VOLUME
      ====================================================== */}

      <div
        className="
          hidden
          2xl:flex
          flex-col
          justify-center
          leading-none
          shrink-0
          min-w-[55px]
        "
      >
        <span
          className="
            text-[6px]
            font-bold
            uppercase
            tracking-wider
            text-zinc-300
          "
        >
          24H VOL
        </span>

        <span
          className="
            text-[8px]
            font-bold
            font-mono
            text-zinc-600
            mt-1
          "
        >
          {formatUSD(volume24h)}
        </span>
      </div>

      {/* ======================================================
          24H CHANGE
      ====================================================== */}

      <div
        className={`
          hidden
          2xl:flex
          flex-col
          justify-center
          leading-none
          shrink-0
          min-w-[48px]
          ${
            isPositive
              ? 'text-emerald-500'
              : isNegative
                ? 'text-red-500'
                : 'text-zinc-400'
          }
        `}
      >
        <span
          className="
            text-[6px]
            font-bold
            uppercase
            tracking-wider
            text-zinc-300
          "
        >
          24H %
        </span>

        <span
          className="
            text-[8px]
            font-bold
            font-mono
            mt-1
          "
        >
          {formatPercent(priceChange)}
        </span>
      </div>
    </a>
  );
};

/* ============================================================
   DEXSCREENER MARQUEE
   ============================================================ */

const DexScreenerTokenMarquee: React.FC = () => {
  const [tokens, setTokens] = useState<DexToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchTokens = async () => {
      try {
        const response = await fetch(DEX_ROBINHOOD_API, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(
            `DexScreener API returned HTTP ${response.status}`
          );
        }

        const data: DexResponse = await response.json();

        if (
          !data ||
          !Array.isArray(data.items)
        ) {
          throw new Error(
            'Invalid DexScreener response'
          );
        }

        if (cancelled) {
          return;
        }

        setTokens(data.items);
        setError(false);
        setLoading(false);
      } catch (err) {
        console.error(
          '[RobOnHood] Failed to fetch DexScreener Robinhood tokens:',
          err
        );

        if (cancelled) {
          return;
        }

        setError(true);
        setLoading(false);
      }
    };

    fetchTokens();

/*
 * Refresh every 5 minutes.
 */
const interval = window.setInterval(
  fetchTokens,
  5 * 60 * 1000
);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  /*
   * Duplicate tokens so the marquee
   * can loop continuously.
   */
  const marqueeTokens =
    tokens.length > 0
      ? [
          ...tokens,
          ...tokens,
        ]
      : [];

  return (
    <div
      className="
        flex
        items-center
        min-w-0
        flex-1
        mx-4
        h-14
        overflow-hidden
        relative
      "
    >
      {/* ======================================================
          LEFT LIVE LABEL
      ====================================================== */}

      <div
        className="
          flex
          items-center
          gap-2
          px-3
          h-full
          bg-white
          shrink-0
          z-20
          border-r
          border-zinc-100
        "
      >
        <span
          className="
            relative
            flex
            w-2
            h-2
          "
        >
          <span
            className="
              absolute
              inline-flex
              w-full
              h-full
              rounded-full
              bg-blue-400
              opacity-75
              animate-ping
            "
          />

          <span
            className="
              relative
              inline-flex
              w-2
              h-2
              rounded-full
              bg-blue-500
            "
          />
        </span>

        <span
          className="
            text-[8px]
            font-black
            uppercase
            tracking-[0.18em]
            text-zinc-500
            whitespace-nowrap
          "
        >
          DexScreener
        </span>

        <span
          className="
            hidden
            lg:inline
            text-[7px]
            font-bold
            uppercase
            tracking-wider
            text-zinc-300
            whitespace-nowrap
          "
        >
          Robinhood
        </span>
      </div>

      {/* ======================================================
          LEFT FADE
      ====================================================== */}

      <div
        className="
          absolute
          left-0
          top-0
          bottom-0
          w-8
          bg-gradient-to-r
          from-white
          to-transparent
          z-10
          pointer-events-none
        "
      />

      {/* ======================================================
          MARQUEE
      ====================================================== */}

      <div
        className="
          min-w-0
          flex-1
          overflow-hidden
          h-full
        "
      >
        {loading && tokens.length === 0 ? (
          <div
            className="
              h-full
              flex
              items-center
              justify-center
              text-[8px]
              font-bold
              uppercase
              tracking-wider
              text-zinc-300
            "
          >
            Loading Robinhood markets...
          </div>
        ) : error && tokens.length === 0 ? (
          <a
            href={DEXSCREENER_BASE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="
              h-full
              flex
              items-center
              justify-center
              text-[8px]
              font-bold
              uppercase
              tracking-wider
              text-zinc-400
              hover:text-zinc-600
            "
          >
            View Robinhood markets on DexScreener →
          </a>
        ) : (
          <div
            className="
              flex
              items-center
              h-full
              w-max
              animate-dex-marquee
              hover:[animation-play-state:paused]
            "
          >
            {marqueeTokens.map(
              (token, index) => {
                const address =
                  token.address ||
                  `unknown-${index}`;

                return (
                  <DexTokenItem
                    key={`${address}-${index}`}
                    token={token}
                  />
                );
              }
            )}
          </div>
        )}
      </div>

      {/* ======================================================
          RIGHT FADE
      ====================================================== */}

      <div
        className="
          absolute
          right-0
          top-0
          bottom-0
          w-8
          bg-gradient-to-l
          from-white
          to-transparent
          z-10
          pointer-events-none
        "
      />

      {/* ======================================================
          MARQUEE CSS
      ====================================================== */}

      <style>
        {`
          @keyframes dex-marquee {
            from {
              transform: translateX(0);
            }

            to {
              transform: translateX(-50%);
            }
          }

          .animate-dex-marquee {
            animation:
              dex-marquee
              55s
              linear
              infinite;
            will-change: transform;
          }
        `}
      </style>
    </div>
  );
};

/* ============================================================
   HEADER
   ============================================================ */

const Header: React.FC = () => {
  const { setViewMode } = useCoreStore();

  const [
    isInfoOpen,
    setIsInfoOpen,
  ] = useState(false);

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
          shrink-0
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
          DEXSCREENER LIVE TOKEN FEED
      ====================================================== */}

      <DexScreenerTokenMarquee />

      {/* ======================================================
          RIGHT: GLOBAL CONTROLS
      ====================================================== */}

      <div
        className="
          flex
          items-center
          gap-3
          shrink-0
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

        {/* DEXSCREENER */}

        <a
          href={DEXSCREENER_BASE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="
            text-zinc-400
            hover:text-darkDelegation
            transition-colors
            p-1
            cursor-pointer
          "
          title="Open DexScreener Robinhood Markets"
        >
          <ExternalLink size={16} />
        </a>

        {/* DIVIDER */}

        <div
          className="
            w-px
            h-4
            bg-zinc-200
          "
        />

        {/* FULLSCREEN */}

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
              cursor-pointer
            "
            title="Fullscreen Browser"
          >
            <Maximize2 size={16} />
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
    </header>
  );
};

export default Header;