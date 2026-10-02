import { Info, Maximize2, Settings } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import packageJson from '../../package.json';
import { useCoreStore } from '../integration/store/coreStore';
import InfoModal from './InfoModal';

const version = packageJson.version;

/* ============================================================
   PUMP.FUN NEW TOKEN FEED
   ============================================================ */

const PUMP_TOKEN_API =
  '/api/pump/coins?offset=0&limit=30&sort=created_timestamp&includeNsfw=false&order=DESC';

const PUMP_BASE_URL = 'https://pump.fun/coin/';

interface PumpToken {
  mint: string;
  name?: string;
  symbol?: string;
  image_uri?: string;
  created_timestamp?: number;
  market_cap_usd?: number;
  usd_market_cap?: number;
  complete?: boolean;
  nsfw?: boolean;
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
   SINGLE PUMP TOKEN
   ============================================================ */

interface PumpTokenItemProps {
  token: PumpToken;
}

const PumpTokenItem: React.FC<PumpTokenItemProps> = ({ token }) => {
  const name =
    token.name?.trim() ||
    token.symbol?.trim() ||
    'Unknown Token';

  const symbol =
    token.symbol?.trim() ||
    'TOKEN';

  const marketCap =
    token.usd_market_cap ??
    token.market_cap_usd;

  return (
    <a
      href={`${PUMP_BASE_URL}${token.mint}`}
      target="_blank"
      rel="noopener noreferrer"
      title={`View ${name} on Pump.fun`}
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
        {token.image_uri ? (
          <img
            src={token.image_uri}
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
            ${symbol}
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
   PUMP.FUN MARQUEE
   ============================================================ */

const PumpTokenMarquee: React.FC = () => {
  const [tokens, setTokens] = useState<PumpToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchTokens = async () => {
      try {
        const response = await fetch(PUMP_TOKEN_API, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error('Invalid Pump.fun response');
        }

        if (cancelled) {
          return;
        }

        const cleanTokens: PumpToken[] = data
          .filter(
            (token: PumpToken) =>
              token &&
              token.mint &&
              !token.nsfw
          )
          .sort(
            (a: PumpToken, b: PumpToken) =>
              (b.created_timestamp ?? 0) -
              (a.created_timestamp ?? 0)
          );

        setTokens(cleanTokens);
        setError(false);
        setLoading(false);
      } catch (err) {
        console.error(
          '[RobOnHood] Failed to fetch Pump.fun tokens:',
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

    // Refresh the newest-token feed every 15 seconds.
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
          Pump.fun
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
            Loading new tokens...
          </div>
        ) : error && tokens.length === 0 ? (
          <a
            href="https://pump.fun/explore?tab=created_timestamp"
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
            View Pump.fun New Tokens →
          </a>
        ) : (
          <div
            className="
              flex
              items-center
              h-full
              w-max
              animate-pump-marquee
              hover:[animation-play-state:paused]
            "
          >
            {marqueeTokens.map(
              (token, index) => (
                <PumpTokenItem
                  key={`${token.mint}-${index}`}
                  token={token}
                />
              )
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
          @keyframes pump-marquee {
            from {
              transform: translateX(0);
            }

            to {
              transform: translateX(-50%);
            }
          }

          .animate-pump-marquee {
            animation:
              pump-marquee
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
          PUMP.FUN LIVE TOKEN FEED
      ====================================================== */}

      <PumpTokenMarquee />

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