import { Info, Maximize2, Settings } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import packageJson from '../../package.json';
import { useCoreStore } from '../integration/store/coreStore';
import InfoModal from './InfoModal';

const version = packageJson.version;

/* ============================================================
   LAUNCHPAD.MEME ROBINHOOD CHAIN
   ============================================================ */

const NEW_TOKENS_API =
  '/api/launchpad/tokens/new?chain=robinhood&limit=50';

const TOKEN_PROFILES_API =
  '/api/launchpad-feed/robinhood.json';

const LAUNCHPAD_BASE_URL =
  'https://launchpad.meme/coin/';

const ROBINHOOD_CHAIN = 'robinhood';
const ROBINHOOD_CHAIN_ID = 4663;

/* ============================================================
   TYPES
   ============================================================ */

interface NewToken {
  id?: number;
  chain?: string;
  address?: string;
  token?: string;
  name?: string;
  symbol?: string;
  raw_symbol?: string;
  status?: string;
  url?: string;
  market_cap_usd?: number;
  liquidity_usd?: number;
  volume_24h_usd?: number;
  price_usd?: number;
  price_change_24h?: number;
  created_at?: string;
  creator?: {
    wallet?: string;
    username?: string;
  };
}

interface TokenProfile {
  token_id?: number;
  chain?: string;
  chain_id?: number;
  address?: string;
  pool_address?: string;
  name?: string;
  symbol?: string;
  created_at?: string;

  metadata?: {
    logo_url?: string;
    icon?: string;
    header?: string;
    website?: string;
    x?: string;
    telegram?: string;
    discord?: string;
    name?: string;
    symbol?: string;
    description?: string;
    metadata_url?: string;
  };

  market?: {
    price_usd?: number;
    market_cap_usd?: number;
    liquidity_usd?: number;
    volume_24h_usd?: number;
    price_change_5m?: number;
    price_change_1h?: number;
    price_change_24h?: number;
    holders?: number;
    buys_24h?: number;
    sells_24h?: number;
  };

  organic_momentum?: {
    window?: string;
    score?: number;
    tier?: string;
    eligible?: boolean;
    organic_volume_usd?: number;
    adjusted_volume_usd?: number;
    buy_volume_usd?: number;
    sell_volume_usd?: number;
    buys?: number;
    sells?: number;
    tx_count?: number;
    qualified_tx_count?: number;
    unique_traders?: number;
    unique_buyers?: number;
    unique_sellers?: number;
  };

  links?: {
    launchpad?: string;
    explorer?: string;
    uniswap?: string;
  };
}

interface LaunchpadToken
  extends NewToken {
  profile?: TokenProfile;
}

/* ============================================================
   FORMATTERS
   ============================================================ */

const formatUSD = (
  value?: number
): string => {
  if (!Number.isFinite(value)) {
    return '—';
  }

  const number = Number(value);

  if (number >= 1_000_000_000) {
    return `$${(
      number / 1_000_000_000
    ).toFixed(2)}B`;
  }

  if (number >= 1_000_000) {
    return `$${(
      number / 1_000_000
    ).toFixed(2)}M`;
  }

  if (number >= 1_000) {
    return `$${(
      number / 1_000
    ).toFixed(2)}K`;
  }

  if (number >= 1) {
    return `$${number.toFixed(2)}`;
  }

  if (number > 0) {
    return `$${number.toPrecision(3)}`;
  }

  return '$0';
};

const formatPercent = (
  value?: number
): string => {
  if (!Number.isFinite(value)) {
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

interface LaunchpadTokenItemProps {
  token: LaunchpadToken;
}

const LaunchpadTokenItem: React.FC<
  LaunchpadTokenItemProps
> = ({ token }) => {
  const profile = token.profile;

  const name =
    profile?.metadata?.name?.trim() ||
    profile?.name?.trim() ||
    token.name?.trim() ||
    token.symbol?.trim() ||
    'Unknown Token';

  const symbol =
    profile?.metadata?.symbol?.trim() ||
    profile?.symbol?.trim() ||
    token.symbol?.trim() ||
    token.raw_symbol?.trim() ||
    'TOKEN';

  const cleanSymbol =
    symbol.replace(/^\$/, '');

  const address =
    token.address?.trim() ||
    token.token?.trim() ||
    profile?.address?.trim();

  const tokenUrl =
    token.url?.trim() ||
    profile?.links?.launchpad?.trim() ||
    (address
      ? `${LAUNCHPAD_BASE_URL}${address}`
      : 'https://launchpad.meme/');

  const logo =
    profile?.metadata?.logo_url ||
    profile?.metadata?.icon ||
    '';

  const marketCap =
    profile?.market?.market_cap_usd ??
    token.market_cap_usd;

  const liquidity =
    profile?.market?.liquidity_usd ??
    token.liquidity_usd;

  const volume24h =
    profile?.market?.volume_24h_usd ??
    token.volume_24h_usd;

  const priceChange =
    profile?.market?.price_change_24h ??
    token.price_change_24h ??
    0;

  const isPositive =
    priceChange > 0;

  const isNegative =
    priceChange < 0;

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
              event.currentTarget.style.display =
                'none';
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
        <div
          className="
            flex
            items-center
            gap-1.5
          "
        >
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

          {/* NEW */}

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
              shrink-0
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
          24H
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
   LAUNCHPAD MARQUEE
   ============================================================ */

const LaunchpadTokenMarquee: React.FC = () => {
  const [tokens, setTokens] =
    useState<LaunchpadToken[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchTokens = async () => {
      try {
        /*
         * ------------------------------------------------------
         * STEP 1
         * Get the newest launches.
         * ------------------------------------------------------
         */

        const [
          newTokensResponse,
          profilesResponse,
        ] = await Promise.all([
          fetch(
            NEW_TOKENS_API,
            {
              method: 'GET',
              headers: {
                Accept:
                  'application/json',
              },
              cache: 'no-store',
            }
          ),

          fetch(
            TOKEN_PROFILES_API,
            {
              method: 'GET',
              headers: {
                Accept:
                  'application/json',
              },
              cache: 'no-store',
            }
          ),
        ]);

        if (
          !newTokensResponse.ok
        ) {
          throw new Error(
            `New token API returned HTTP ${newTokensResponse.status}`
          );
        }

        if (
          !profilesResponse.ok
        ) {
          throw new Error(
            `Profile API returned HTTP ${profilesResponse.status}`
          );
        }

        const [
          newTokensData,
          profilesData,
        ] = await Promise.all([
          newTokensResponse.json(),
          profilesResponse.json(),
        ]);

        if (
          !newTokensData ||
          !Array.isArray(
            newTokensData.items
          )
        ) {
          throw new Error(
            'Invalid new-token response'
          );
        }

        if (
          !profilesData ||
          !Array.isArray(
            profilesData.items
          )
        ) {
          throw new Error(
            'Invalid token-profile response'
          );
        }

        if (cancelled) {
          return;
        }

        /*
         * ------------------------------------------------------
         * STEP 2
         * Build a profile lookup by token address.
         * ------------------------------------------------------
         */

        const profileMap =
          new Map<
            string,
            TokenProfile
          >();

        (
          profilesData.items as TokenProfile[]
        ).forEach(
          (
            profile
          ) => {
            if (
              !profile ||
              !profile.address
            ) {
              return;
            }

            if (
              String(
                profile.chain || ''
              ).toLowerCase() !==
              ROBINHOOD_CHAIN
            ) {
              return;
            }

            profileMap.set(
              profile.address.toLowerCase(),
              profile
            );
          }
        );

        /*
         * ------------------------------------------------------
         * STEP 3
         * Filter newest launches to Robinhood Chain.
         * ------------------------------------------------------
         */

        const cleanTokens =
          (
            newTokensData.items as NewToken[]
          )
            .filter(
              (
                token
              ) => {
                if (
                  !token
                ) {
                  return false;
                }

                const chain =
                  String(
                    token.chain ||
                      ''
                  )
                    .trim()
                    .toLowerCase();

                const address =
                  token.address?.trim() ||
                  token.token?.trim();

                return (
                  chain ===
                    'robinhood chain' &&
                  Boolean(address)
                );
              }
            )
            .sort(
              (
                a,
                b
              ) => {
                const aTime =
                  a.created_at
                    ? new Date(
                        a.created_at
                      ).getTime()
                    : 0;

                const bTime =
                  b.created_at
                    ? new Date(
                        b.created_at
                      ).getTime()
                    : 0;

                return (
                  bTime - aTime
                );
              }
            )
            .slice(0, 30)
            .map(
              (
                token
              ): LaunchpadToken => {
                const address =
                  (
                    token.address ||
                    token.token ||
                    ''
                  ).toLowerCase();

                return {
                  ...token,
                  profile:
                    profileMap.get(
                      address
                    ),
                };
              }
            );

        setTokens(
          cleanTokens
        );

        setError(false);
        setLoading(false);
      } catch (err) {
        console.error(
          '[RobOnHood] Failed to fetch Launchpad Robinhood tokens:',
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
     * Refresh every 15 seconds.
     */

    const interval =
      window.setInterval(
        fetchTokens,
        15_000
      );

    return () => {
      cancelled = true;
      window.clearInterval(
        interval
      );
    };
  }, []);

  /*
   * Duplicate the tokens so the marquee
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
        {loading &&
        tokens.length === 0 ? (
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
        ) : error &&
          tokens.length === 0 ? (
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
              (
                token,
                index
              ) => {
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
  const { setViewMode } =
    useCoreStore();

  const [
    isInfoOpen,
    setIsInfoOpen,
  ] = useState(false);

  /* ==========================================================
     FULLSCREEN
     ========================================================== */

  const handleFullscreen =
    () => {
      if (
        !document.fullscreenElement
      ) {
        document.documentElement.requestFullscreen();
      } else {
        if (
          document.exitFullscreen
        ) {
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
                setIsInfoOpen(
                  true
                )
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
            setViewMode(
              'design'
            )
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
            onClick={
              handleFullscreen
            }
            className="
              text-zinc-400
              hover:text-darkDelegation
              transition-colors
              p-1
              cursor-pointer
            "
            title="Fullscreen Browser"
          >
            <Maximize2
              size={16}
            />
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
            setIsInfoOpen(
              false
            )
          }
        />
      )}
    </header>
  );
};

export default Header;