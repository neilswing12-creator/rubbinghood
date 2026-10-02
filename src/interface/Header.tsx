import { Info, Maximize2, Settings } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import packageJson from '../../package.json';
import { useCoreStore } from '../integration/store/coreStore';
import InfoModal from './InfoModal';

const version = packageJson.version;

/* ============================================================
   LAUNCHPAD.MEME ROBINHOOD CHAIN NEW TOKEN FEED
   ============================================================ */

const LAUNCHPAD_TOKEN_API =
  '/api/launchpad/tokens/new?chain=robinhood&limit=50';

const LAUNCHPAD_BASE_URL = 'https://launchpad.meme/coin/';

const ROBINHOOD_CHAIN = 'robinhood chain';
const ROBINHOOD_CHAIN_ID = 4663;

interface LaunchpadToken {
  id?: number;
  chain?: string;
  address?: string;
  token?: string;
  name?: string;
  symbol?: string;
  raw_symbol?: string;
  status?: string;
  dex?: string;
  graduation_dex?: string;
  url?: string;
  explorer_url?: string;
  market_cap_usd?: number;
  liquidity_usd?: number;
  volume_24h_usd?: number;
  price_usd?: number;
  price_change_24h?: number;
  bonding_progress?: number;
  migration_threshold_usd?: number;
  created_at?: string;
  creator?: {
    wallet?: string;
    username?: string;
    public_id?: string;
  };
}

/* ============================================================
   FORMAT MARKET CAP
   ============================================================ */

const formatMarketCap = (value?: number): string => {
  if (!Number.isFinite(value)) {
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
    return `$${(number / 1_000).toFixed(1)}K`;
  }

  return `$${number.toFixed(0)}`;
};

/* ============================================================
   SINGLE LAUNCHPAD TOKEN
   ============================================================ */

interface LaunchpadTokenItemProps {
  token: LaunchpadToken;
}

const LaunchpadTokenItem: React.FC<LaunchpadTokenItemProps> = ({
  token,
}) => {
  const name =
    token.name?.trim() ||
    token.symbol?.trim() ||
    'Unknown Token';

  const symbol =
    token.symbol?.trim() ||
    token.raw_symbol?.trim() ||
    'TOKEN';

  const cleanSymbol = symbol.replace(/^\$/, '');

  const marketCap = token.market_cap_usd;

  const tokenAddress =
    token.address?.trim() ||
    token.token?.trim();

  const tokenUrl =
    token.url?.trim() ||
    (tokenAddress
      ? `${LAUNCHPAD_BASE_URL}${tokenAddress}`
      : 'https://launchpad.meme/');

  return (
    <a
      href={tokenUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={`View ${name} on Launchpad.meme`}
      className="
        group
        flex
        items-center
        gap-2
        h-9
        px-3
        shrink-0
        border-l
        border-zinc-100
        hover:bg-zinc-50
        transition-colors
        cursor-pointer
      "
    >
      {/* TOKEN IMAGE */}

      <div
        className="
          w-6
          h-6
          rounded-full
          overflow-hidden
          bg-zinc-100
          border
          border-zinc-200
          shrink-0
        "
      >
        {/*

          The /api/public/tokens/new endpoint does not return
          a logo URL directly.

          We therefore use a clean token placeholder here.

          The richer /token-list/robinhood.json endpoint can
          be added later if we want actual token images.
        */}

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
            uppercase
          "
        >
          {cleanSymbol.slice(0, 2)}
        </div>
      </div>

      {/* TOKEN NAME */}

      <div className="flex flex-col justify-center leading-none min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className="
              text-[9px]
              font-black
              uppercase
              tracking-wider
              text-zinc-700
              max-w-[90px]
              truncate
            "
          >
            ${cleanSymbol}
          </span>

          {/* NEW INDICATOR */}

          <span
            className="
              flex
              items-center
              gap-1
              text-[6px]
              font-black
              uppercase
              tracking-wider
              text-emerald-500
            "
          >
            <span
              className="
                w-1.5
                h-1.5
                rounded-full
                bg-emerald-400
                animate-pulse
              "
            />

            NEW
          </span>
        </div>

        <span
          className="
            text-[8px]
            font-medium
            text-zinc-400
            truncate
            max-w-[110px]
            mt-1
          "
        >
          {name}
        </span>
      </div>

      {/* MARKET CAP */}

      <div
        className="
          flex
          flex-col
          justify-center
          leading-none
          shrink-0
        "
      >
        <span
          className="
            text-[7px]
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
            text-[9px]
            font-bold
            font-mono
            text-zinc-600
            mt-1
          "
        >
          {formatMarketCap(marketCap)}
        </span>
      </div>
    </a>
  );
};

/* ============================================================
   LAUNCHPAD.MEME MARQUEE
   ============================================================ */

const LaunchpadTokenMarquee: React.FC = () => {
  const [tokens, setTokens] = useState<LaunchpadToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchTokens = async () => {
      try {
        const response = await fetch(LAUNCHPAD_TOKEN_API, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(
            `Launchpad API returned HTTP ${response.status}`
          );
        }

        const data = await response.json();

        if (!data || !Array.isArray(data.items)) {
          throw new Error(
            'Invalid Launchpad.meme response'
          );
        }

        if (cancelled) {
          return;
        }

        /*
         * IMPORTANT:
         *
         * The API can return tokens from multiple chains even
         * when chain=robinhood is supplied.
         *
         * Therefore we explicitly filter the response to
         * Robinhood Chain.
         */

        const cleanTokens: LaunchpadToken[] = data.items
          .filter((token: LaunchpadToken) => {
            if (!token) {
              return false;
            }

            const chain =
              String(token.chain || '').trim().toLowerCase();

            const address =
              token.address?.trim() ||
              token.token?.trim();

            return (
              chain === ROBINHOOD_CHAIN &&
              ROBINHOOD_CHAIN_ID === 4663 &&
              Boolean(address)
            );
          })
          .sort((a: LaunchpadToken, b: LaunchpadToken) => {
            const aTime = a.created_at
              ? new Date(a.created_at).getTime()
              : 0;

            const bTime = b.created_at
              ? new Date(b.created_at).getTime()
              : 0;

            return bTime - aTime;
          });

        setTokens(cleanTokens);
        setError(false);
        setLoading(false);
      } catch (err) {
        console.error(
          '[RobOnHood] Failed to fetch Launchpad.meme Robinhood tokens:',
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
     * Refresh the newest-token feed every 15 seconds.
     *
     * Launchpad's documentation recommends caching public
     * indexer responses for roughly 5–15 seconds.
     */

    const interval = window.setInterval(
      fetchTokens,
      15_000
    );

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  /*
   * Duplicate the list so the CSS marquee can continuously
   * move from right → left without an empty gap.
   */

  const marqueeTokens =
    tokens.length > 0
      ? [...tokens, ...tokens]
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
      {/* LEFT LIVE LABEL */}

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
              bg-emerald-400
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
              bg-emerald-500
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
          Launchpad
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
          New Tokens
        </span>
      </div>

      {/* FADE LEFT */}

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

      {/* MARQUEE */}

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
            Loading new Robinhood tokens...
          </div>
        ) : error && tokens.length === 0 ? (
          <a
            href="https://launchpad.meme/?lang=en&sort=chain_robinhood"
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
            View Launchpad.meme Robinhood Tokens →
          </a>
        ) : (
          <div
            className="
              flex
              items-center
              h-full
              w-max
              animate-launchpad-marquee
              hover:[animation-play-state:paused]
            "
          >
            {marqueeTokens.map(
              (token, index) => {
                const address =
                  token.address ||
                  token.token ||
                  `unknown-${index}`;

                return (
                  <LaunchpadTokenItem
                    key={`${address}-${index}`}
                    token={token}
                  />
                );
              }
            )}
          </div>
        )}
      </div>

      {/* FADE RIGHT */}

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

      {/* INLINE MARQUEE CSS */}

      <style>
        {`
          @keyframes launchpad-marquee {
            from {
              transform: translateX(0);
            }

            to {
              transform: translateX(-50%);
            }
          }

          .animate-launchpad-marquee {
            animation:
              launchpad-marquee
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
          LAUNCHPAD.MEME LIVE TOKEN FEED
      ====================================================== */}

      <LaunchpadTokenMarquee />

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