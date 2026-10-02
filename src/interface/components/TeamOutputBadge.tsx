import {
  Check,
  Copy,
  FileText,
  Image as ImageIcon,
  Music,
  Video,
} from 'lucide-react';
import React, { useState } from 'react';
import { AgenticSystem } from '../../data/agents';
import { InfoTooltip } from './InfoTooltip';
import { USER_COLOR, USER_COLOR_SOFT } from '../../theme/brand';

interface TeamOutputBadgeProps {
  system: AgenticSystem;
  className?: string;
}

/* ============================================================
   ROBONHOOD CONTRACT
   ============================================================ */

   const ROBONHOOD_CONTRACT: string =
   '0x000000000000000000000000000000000000dEaD';

export const TeamOutputBadge: React.FC<TeamOutputBadgeProps> = ({
  system,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyContract = async () => {
    try {
      await navigator.clipboard.writeText(
        ROBONHOOD_CONTRACT
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch (error) {
      console.error(
        '[RobOnHood] Failed to copy contract address:',
        error
      );
    }
  };

  const shortenedContract =
    ROBONHOOD_CONTRACT.length > 14
      ? `${ROBONHOOD_CONTRACT.slice(
          0,
          6
        )}...${ROBONHOOD_CONTRACT.slice(-6)}`
      : ROBONHOOD_CONTRACT;

  return (
    <div
      className={`
        flex
        items-center
        gap-3
        px-3
        py-1.5
        bg-zinc-50/50
        border
        border-zinc-100/50
        cursor-default
        rounded-xl
        backdrop-blur-sm
        ${className}
      `}
    >
      {/* ======================================================
          LEFT COLUMN
      ====================================================== */}

      <div className="flex flex-col justify-center gap-1 pr-3">
        {/* Output Type */}

        <div className="flex items-center gap-1.5 text-zinc-400">
          {system.outputType === 'text' && (
            <FileText
              size={11}
              strokeWidth={2.5}
            />
          )}

          {system.outputType === 'image' && (
            <ImageIcon
              size={11}
              strokeWidth={2.5}
            />
          )}

          {system.outputType === 'music' && (
            <Music
              size={11}
              strokeWidth={2.5}
            />
          )}

          {system.outputType === 'video' && (
            <Video
              size={11}
              strokeWidth={2.5}
            />
          )}

          <span
            className="
              text-[8px]
              font-black
              uppercase
              tracking-widest
              text-zinc-500
              leading-none
            "
          >
            {system.outputType || 'TEXT'}
          </span>
        </div>

        {/* Auto Approve */}

        {system.outputAutoApprove !== undefined && (
          <InfoTooltip
            text={
              system.outputAutoApprove
                ? 'Output will be generated and delivered automatically'
                : 'Output requires your manual review and approval before generation'
            }
          >
            <div className="flex items-center gap-1.5">
              <div
                className="w-1 h-1 rounded-full"
                style={{
                  backgroundColor:
                    system.outputAutoApprove
                      ? '#10b981'
                      : USER_COLOR,
                  boxShadow:
                    system.outputAutoApprove
                      ? undefined
                      : `0 0 8px ${USER_COLOR_SOFT}`,
                }}
              />

              <span
                className="
                  text-[7px]
                  font-bold
                  text-zinc-300
                  uppercase
                  tracking-tighter
                  leading-none
                  whitespace-nowrap
                "
              >
                {system.outputAutoApprove
                  ? 'AUTO APPROVE'
                  : 'MANUAL REVIEW'}
              </span>
            </div>
          </InfoTooltip>
        )}
      </div>

      {/* DIVIDER */}

      <div className="w-px h-7 bg-zinc-200/50" />

      {/* ======================================================
          RIGHT COLUMN
      ====================================================== */}

      <div
        className="
          flex
          flex-col
          gap-1
          min-w-0
          pl-1
        "
      >
        {/* Generation Model */}

        <span
          className="
            text-[7px]
            font-black
            text-zinc-300
            uppercase
            tracking-widest
            leading-none
          "
        >
          GENERATION MODEL
        </span>

        <span
          className="
            text-[10px]
            font-bold
            text-zinc-600
            font-mono
            lowercase
            leading-tight
          "
        >
          robonhoodai
        </span>

        {/* Contract Address */}

        <button
  type="button"
  onClick={handleCopyContract}
          title={
            copied
              ? 'Contract address copied'
              : 'Click to copy contract address'
          }
          className="
            flex
            items-center
            gap-1
            text-left
            group
            cursor-pointer
            disabled:cursor-default
          "
        >
          <span
            className="
              text-[6px]
              font-black
              text-zinc-300
              uppercase
              tracking-widest
              leading-none
            "
          >
            CONTRACT
          </span>

          <span
            className="
              text-[7px]
              font-mono
              font-bold
              text-zinc-400
              group-hover:text-blue-500
              transition-colors
              truncate
            "
          >
            {copied
              ? 'COPIED'
              : shortenedContract}
          </span>

          {copied ? (
            <Check
              size={9}
              className="text-emerald-500 shrink-0"
            />
          ) : (
            <Copy
              size={9}
              className="
                text-zinc-300
                group-hover:text-blue-500
                transition-colors
                shrink-0
              "
            />
          )}
        </button>
      </div>
    </div>
  );
};