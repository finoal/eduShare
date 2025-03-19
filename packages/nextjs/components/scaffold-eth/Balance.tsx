"use client";

import { useState } from "react";
import { Address, formatEther } from "viem";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { useWatchBalance } from "~~/hooks/scaffold-eth/useWatchBalance";
import { useGlobalState } from "~~/services/store/store";

type BalanceProps = {
  address?: Address;
  className?: string;
  usdMode?: boolean;
};

/**
 * Display (ETH & USD) balance of an ETH address.
 */
export const Balance = ({ address, className = "", usdMode }: BalanceProps) => {
  const { targetNetwork } = useTargetNetwork();
  const price = useGlobalState(state => state.nativeCurrencyPrice);
  const {
    data: balance,
    isError,
    isLoading,
  } = useWatchBalance({
    address,
  });

  const [displayUsdMode, setDisplayUsdMode] = useState(price > 0 ? Boolean(usdMode) : false);

  const toggleBalanceMode = () => {
    if (price > 0) {
      setDisplayUsdMode(prevMode => !prevMode);
    }
  };

  if (!address || isLoading || balance === null) {
    return (
      <div className="animate-pulse flex space-x-4">
        <div className="rounded-md bg-pink-200 h-6 w-6"></div>
        <div className="flex items-center space-y-6">
          <div className="h-2 w-28 bg-pink-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={`border-2 border-pink-400 rounded-md px-2 flex flex-col items-center max-w-fit cursor-pointer`}>
        <div className="text-pink-600">Error</div>
      </div>
    );
  }

  const formattedBalance = balance ? Number(formatEther(balance.value)) : 0;

  return (
    <button
      className={`btn btn-sm btn-ghost flex flex-col font-normal items-center hover:bg-pink-50 text-pink-600 ${className}`}
      onClick={toggleBalanceMode}
    >
      <div className="w-full flex items-center justify-center">
        {displayUsdMode ? (
          <>
            <span className="text-[0.8em] font-bold mr-1 text-pink-500">$</span>
            <span className="text-pink-600">{(formattedBalance * price).toFixed(2)}</span>
          </>
        ) : (
          <>
            <span className="text-pink-600">{formattedBalance.toFixed(4)}</span>
            <span className="text-[0.8em] font-bold ml-1 text-pink-500">
              {targetNetwork.nativeCurrency.symbol}
            </span>
          </>
        )}
      </div>
    </button>
  );
};
