"use client";

import { useState, useEffect } from "react";
import type { NextPage } from "next";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldEventHistory } from "~~/hooks/scaffold-eth";
import { useAccount } from "wagmi";
import { ChevronLeftIcon, ChevronRightIcon, ClockIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

// 定义交易类型
type TransactionType = "购买" | "上架" | "下架" | "创建";

// 根据事件名称确定交易类型
const getTransactionType = (eventName: string): TransactionType => {
  switch (eventName) {
    case "NftPurchased":
      return "购买";
    case "NftListed":
      return "上架";
    case "NftUnlisted":
      return "下架";
    default:
      return "创建";
  }
};

// 定义事件类型接口
interface EventWithType {
  eventType: string;
  args: {
    tokenId?: bigint;
    buyer?: `0x${string}`;
    seller?: `0x${string}`;
    price?: bigint;
    amount?: bigint;
    timestamp?: bigint;
    transactionId?: bigint;
  };
}

const Transfers: NextPage = () => {
  const { address } = useAccount();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filteredEvents, setFilteredEvents] = useState<EventWithType[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [showOnlyMyTransactions, setShowOnlyMyTransactions] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [latestTransactions, setLatestTransactions] = useState<EventWithType[]>([]);
  const [showLatestModal, setShowLatestModal] = useState(false);

  // 获取所有交易事件
  const { data: purchaseEvents, isLoading: isPurchaseLoading } = useScaffoldEventHistory({
    contractName: "YourCollectible",
    eventName: "NftPurchased",
    fromBlock: 0n,
  });

  const { data: listEvents, isLoading: isListLoading } = useScaffoldEventHistory({
    contractName: "YourCollectible",
    eventName: "NftListed",
    fromBlock: 0n,
  });

  const { data: unlistEvents, isLoading: isUnlistLoading } = useScaffoldEventHistory({
    contractName: "YourCollectible",
    eventName: "NftUnlisted",
    fromBlock: 0n,
  });

  // 刷新所有数据
  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      // 重新加载页面来刷新数据
      window.location.reload();
      setLastRefreshTime(new Date());
    } catch (error) {
      console.error("刷新数据失败:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // 查看最新交易记录
  const viewLatestTransactions = () => {
    // 获取最新的5条交易记录
    const latest = [...filteredEvents].slice(0, 5);
    setLatestTransactions(latest);
    setShowLatestModal(true);
  };

  // 合并并处理所有事件
  useEffect(() => {
    if (purchaseEvents && listEvents && unlistEvents) {
      // 合并所有事件并添加类型标识
      const allEvents: EventWithType[] = [
        ...purchaseEvents.map(event => ({ ...event, eventType: "NftPurchased" })),
        ...listEvents.map(event => ({ ...event, eventType: "NftListed" })),
        ...unlistEvents.map(event => ({ ...event, eventType: "NftUnlisted" }))
      ];

      // 按时间戳排序（最新的在前）
      const sortedEvents = allEvents.sort((a, b) => 
        Number(b.args.timestamp) - Number(a.args.timestamp)
      );

      // 如果选择只显示我的交易
      const filtered = showOnlyMyTransactions && address 
        ? sortedEvents.filter(event => {
            if (event.eventType === "NftPurchased") {
              return event.args.buyer === address || event.args.seller === address;
            } else if (event.eventType === "NftListed" || event.eventType === "NftUnlisted") {
              return event.args.seller === address;
            }
            return false;
          })
        : sortedEvents;

      setFilteredEvents(filtered);
      setTotalPages(Math.ceil(filtered.length / pageSize));
    }
  }, [purchaseEvents, listEvents, unlistEvents, pageSize, showOnlyMyTransactions, address]);

  // 处理页码变化
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // 获取当前页的事件
  const getCurrentPageEvents = () => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredEvents.slice(startIndex, endIndex);
  };

  // 切换显示模式
  const toggleShowMyTransactions = () => {
    setShowOnlyMyTransactions(!showOnlyMyTransactions);
    setCurrentPage(1); // 重置到第一页
  };

  const isLoading = isPurchaseLoading || isListLoading || isUnlistLoading;

  if (isLoading)
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-b from-pink-100 to-white">
        <div className="loader ease-linear rounded-full border-4 border-t-4 border-pink-200 border-t-pink-500 h-12 w-12 animate-spin"></div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-100 to-white py-10">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center mb-8">
          <h1 className="text-3xl font-bold text-pink-700 mb-4">交易历史记录</h1>
          <div className="flex items-center space-x-3">
            <button 
              onClick={toggleShowMyTransactions}
              className={`px-4 py-2 rounded-lg transition-colors ${
                showOnlyMyTransactions 
                  ? "bg-pink-500 text-white" 
                  : "bg-white text-pink-700 border border-pink-300"
              }`}
            >
              {showOnlyMyTransactions ? "查看所有交易" : "只看我的交易"}
            </button>
            
            <button 
              onClick={viewLatestTransactions}
              className="px-4 py-2 rounded-lg bg-white text-pink-700 border border-pink-300 hover:bg-pink-50 flex items-center"
              disabled={filteredEvents.length === 0}
            >
              <ClockIcon className="h-5 w-5 mr-1" />
              查看最新交易
            </button>
            
            <button 
              onClick={refreshData}
              className="px-4 py-2 rounded-lg bg-white text-pink-700 border border-pink-300 hover:bg-pink-50 flex items-center"
              disabled={isRefreshing}
            >
              <ArrowPathIcon className={`h-5 w-5 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? "刷新中..." : "刷新数据"}
            </button>
          </div>
          
          <div className="text-sm text-pink-600 mt-2">
            最后更新时间: {lastRefreshTime.toLocaleString()}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-pink-200 mb-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-pink-100">
                  <th className="py-3 px-4 text-left text-pink-800">交易序号</th>
                  <th className="py-3 px-4 text-left text-pink-800">交易时间</th>
                  <th className="py-3 px-4 text-left text-pink-800">类型</th>
                  <th className="py-3 px-4 text-left text-pink-800">资源ID</th>
                  <th className="py-3 px-4 text-left text-pink-800">买家/卖家</th>
                  <th className="py-3 px-4 text-left text-pink-800">金额 (ETH)</th>
                </tr>
              </thead>
              <tbody>
                {getCurrentPageEvents().length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-pink-600">
                      没有交易记录
                    </td>
                  </tr>
                ) : (
                  getCurrentPageEvents().map((event, index) => {
                    // 根据事件类型确定显示的信息
                    const transactionType = getTransactionType(event.eventType);
                    const tokenId = event.args.tokenId?.toString();
                    
                    // 根据事件类型确定买家和卖家
                    let buyer, seller;
                    if (event.eventType === "NftPurchased") {
                      buyer = event.args.buyer;
                      seller = event.args.seller;
                    } else if (event.eventType === "NftListed" || event.eventType === "NftUnlisted") {
                      seller = event.args.seller;
                    }
                    
                    // 金额显示
                    const amount = event.args.price || event.args.amount;
                    const amountInEth = amount ? (Number(amount) / 1e18).toFixed(4) : "0";
                    
                    return (
                      <tr key={index} className={index % 2 === 0 ? "bg-pink-50" : "bg-white"}>
                        <td className="py-3 px-4 text-pink-800">{event.args.transactionId?.toString()}</td>
                        <td className="py-3 px-4 text-pink-800">{new Date(Number(event.args.timestamp) * 1000).toLocaleString()}</td>
                        <td className="py-3 px-4 text-pink-800">{transactionType}</td>
                        <td className="py-3 px-4 text-pink-800">{tokenId}</td>
                        <td className="py-3 px-4">
                          {buyer && (
                            <div className="mb-1">
                              <span className="text-pink-600 mr-2">买家:</span>
                              <Address address={buyer} />
                            </div>
                          )}
                          {seller && (
                            <div>
                              <span className="text-pink-600 mr-2">卖家:</span>
                              <Address address={seller} />
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-pink-800">{amountInEth} ETH</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 分页控件 */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center space-x-2">
            <button
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={`p-2 rounded-full ${
                currentPage === 1 
                  ? "text-pink-300 cursor-not-allowed" 
                  : "text-pink-600 hover:bg-pink-100"
              }`}
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            
            <div className="flex space-x-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  // 显示当前页附近的页码和首尾页
                  return (
                    page === 1 ||
                    page === totalPages ||
                    Math.abs(page - currentPage) <= 2
                  );
                })
                .map((page, index, array) => {
                  // 添加省略号
                  if (index > 0 && array[index - 1] !== page - 1) {
                    return (
                      <span key={`ellipsis-${page}`} className="flex items-center px-3 py-1 text-pink-600">
                        ...
                      </span>
                    );
                  }
                  
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-1 rounded-md ${
                        currentPage === page
                          ? "bg-pink-500 text-white"
                          : "text-pink-600 hover:bg-pink-100"
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
            </div>
            
            <button
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className={`p-2 rounded-full ${
                currentPage === totalPages 
                  ? "text-pink-300 cursor-not-allowed" 
                  : "text-pink-600 hover:bg-pink-100"
              }`}
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
        )}
        
        {/* 页面大小选择器 */}
        <div className="flex justify-center mt-4">
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1); // 重置到第一页
            }}
            className="px-3 py-1 border border-pink-300 rounded-md text-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            <option value={5}>5条/页</option>
            <option value={10}>10条/页</option>
            <option value={20}>20条/页</option>
            <option value={50}>50条/页</option>
          </select>
        </div>
      </div>
      
      {/* 最新交易记录模态框 */}
      {showLatestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-3xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-pink-700">最新交易记录</h2>
              <button 
                onClick={() => setShowLatestModal(false)}
                className="text-pink-500 hover:text-pink-700"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-pink-100">
                    <th className="py-3 px-4 text-left text-pink-800">交易序号</th>
                    <th className="py-3 px-4 text-left text-pink-800">交易时间</th>
                    <th className="py-3 px-4 text-left text-pink-800">类型</th>
                    <th className="py-3 px-4 text-left text-pink-800">资源ID</th>
                    <th className="py-3 px-4 text-left text-pink-800">金额 (ETH)</th>
                  </tr>
                </thead>
                <tbody>
                  {latestTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-pink-600">
                        没有最新交易记录
                      </td>
                    </tr>
                  ) : (
                    latestTransactions.map((event, index) => {
                      const transactionType = getTransactionType(event.eventType);
                      const tokenId = event.args.tokenId?.toString();
                      const amount = event.args.price || event.args.amount;
                      const amountInEth = amount ? (Number(amount) / 1e18).toFixed(4) : "0";
                      
                      return (
                        <tr key={index} className={index % 2 === 0 ? "bg-pink-50" : "bg-white"}>
                          <td className="py-3 px-4 text-pink-800">{event.args.transactionId?.toString()}</td>
                          <td className="py-3 px-4 text-pink-800">{new Date(Number(event.args.timestamp) * 1000).toLocaleString()}</td>
                          <td className="py-3 px-4 text-pink-800">{transactionType}</td>
                          <td className="py-3 px-4 text-pink-800">{tokenId}</td>
                          <td className="py-3 px-4 text-pink-800">{amountInEth} ETH</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-end mt-6">
              <button 
                onClick={() => setShowLatestModal(false)}
                className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transfers;
