"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { PurchaseCard } from "./PurchaseCard";
import { useAccount } from "wagmi";
import { useScaffoldContract } from "~~/hooks/scaffold-eth";
import { getMetadataFromIPFS } from "~~/utils/simpleNFT/ipfs-fetch";

export interface Collectible {
  id: number;
  uri: string;
  owner: string;
  isAccredited: boolean;
  price?: bigint;
  isListed?: boolean;
  eduUri?: string;
  resourceType?: string;
  subject?: string;
  educationLevel?: string;
  downloadCount?: number;
  rating?: number;
  ratingCount?: number;
  creationTime?: number;
  // 添加从IPFS元数据中获取的属性
  name?: string;
  description?: string;
  image?: string;
  eduResource?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  attributes?: Array<{trait_type: string, value: string}>;
  kind?: string;
}

export const MyPurchases = () => {
  const { address } = useAccount();
  const [collectibles, setCollectibles] = useState<Collectible[]>([]);
  const [filteredCollectibles, setFilteredCollectibles] = useState<Collectible[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;
  
  // 使用useRef跟踪组件是否已经加载数据
  const hasLoadedData = useRef(false);

  const { data: yourCollectible } = useScaffoldContract({
    contractName: "YourCollectible",
  });

  // 更新单个收藏品
  const updateCollectible = useCallback((updatedNft: Collectible) => {
    setCollectibles(prev => 
      prev.map(nft => nft.id === updatedNft.id ? updatedNft : nft)
    );
  }, []);

  // 获取用户购买的教育资源
  const fetchPurchasedResources = useCallback(async () => {
    // 如果已经加载过数据，则不再重复加载
    if (hasLoadedData.current || !yourCollectible || !address) return;
    
    setIsLoading(true);
    try {
      // 调用合约方法获取用户购买的资源
      const resources = await yourCollectible.read.getResourcesByBuy([address]);
      
      const collectiblesPromises = resources.map(async (resource: any) => {
        const tokenId = Number(resource.tokenId);
        const uri = resource.tokenUri;
        const isListed = resource.isListed;
        const price = resource.price;
        
        // 从IPFS获取元数据
        let metadata;
        try {
          if (uri.startsWith('{')) {
            metadata = JSON.parse(uri);
          } else {
            metadata = await getMetadataFromIPFS(uri);
          }
        } catch (error) {
          console.error(`获取元数据失败 (ID: ${tokenId}):`, error);
          metadata = { name: `资源 #${tokenId}`, description: "无法加载描述" };
        }
        
        return {
          id: tokenId,
          uri: uri,
          owner: resource.creator,
          isAccredited: resource.isAccredited,
          price: price,
          isListed: isListed,
          eduUri: resource.eduUri,
          resourceType: resource.resourceType,
          subject: resource.subject,
          educationLevel: resource.educationLevel,
          downloadCount: Number(resource.downloadCount),
          rating: Number(resource.rating),
          ratingCount: Number(resource.ratingCount),
          creationTime: Number(resource.creationTime),
          ...metadata,
        };
      });
      
      const newCollectibles = await Promise.all(collectiblesPromises);
      setCollectibles(newCollectibles);
      setFilteredCollectibles(newCollectibles); // 初始化过滤后的集合
      
      // 标记数据已加载
      hasLoadedData.current = true;
    } catch (error) {
      console.error("获取购买资源失败:", error);
    } finally {
      setIsLoading(false);
    }
  }, [yourCollectible, address]);

  // 初始加载，使用空依赖数组确保只执行一次
  useEffect(() => {
    if (yourCollectible && address && !hasLoadedData.current) {
      fetchPurchasedResources();
    }
  }, [yourCollectible, address, fetchPurchasedResources]);

  // 搜索过滤，不依赖于filteredCollectibles
  useEffect(() => {
    // 只有在已加载数据的情况下才进行过滤
    if (!hasLoadedData.current) return;
    
    const filtered = collectibles.filter(nft => {
      if (!searchTerm) return true; // 如果搜索词为空，返回所有结果
      
      const searchTermLower = searchTerm.toLowerCase();
      return (
        (nft.name?.toLowerCase().includes(searchTermLower) || false) ||
        (nft.description?.toLowerCase().includes(searchTermLower) || false) ||
        (nft.resourceType?.toLowerCase().includes(searchTermLower) || false) ||
        (nft.subject?.toLowerCase().includes(searchTermLower) || false) ||
        (nft.educationLevel?.toLowerCase().includes(searchTermLower) || false)
      );
    });
    
    // 直接设置过滤后的结果
    setFilteredCollectibles(filtered);
    
    // 如果当前页超出了过滤后的总页数，重置到第一页
    const newTotalPages = Math.ceil(filtered.length / itemsPerPage);
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(1);
    }
  }, [collectibles, searchTerm, currentPage, itemsPerPage]);

  // 处理搜索输入变化
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    // 重置到第一页
    setCurrentPage(1);
  }, []);

  // 计算分页
  const totalPages = Math.ceil(filteredCollectibles.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedCollectibles = filteredCollectibles.slice(startIndex, startIndex + itemsPerPage);

  // 分页控制
  const goToPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // 刷新数据
  const refreshData = useCallback(() => {
    hasLoadedData.current = false;
    setIsLoading(true);
    fetchPurchasedResources();
  }, [fetchPurchasedResources]);

  // 生成分页按钮
  const renderPaginationButtons = useCallback(() => {
    const buttons = [];
    const maxVisibleButtons = 5; // 最多显示5个页码按钮
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisibleButtons / 2));
    const endPage = Math.min(totalPages, startPage + maxVisibleButtons - 1);
    
    // 调整startPage，确保显示maxVisibleButtons个按钮
    if (endPage - startPage + 1 < maxVisibleButtons && startPage > 1) {
      startPage = Math.max(1, endPage - maxVisibleButtons + 1);
    }
    
    // 添加第一页按钮
    if (startPage > 1) {
      buttons.push(
        <button
          key="first"
          className="btn btn-sm bg-pink-100 hover:bg-pink-200 text-pink-800 border-pink-300"
          onClick={() => goToPage(1)}
        >
          1
        </button>
      );
      
      // 添加省略号
      if (startPage > 2) {
        buttons.push(
          <button
            key="ellipsis1"
            className="btn btn-sm bg-pink-100 hover:bg-pink-200 text-pink-800 border-pink-300"
            disabled
          >
            ...
          </button>
        );
      }
    }
    
    // 添加页码按钮
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          className={`btn btn-sm ${
            currentPage === i
              ? "bg-pink-500 hover:bg-pink-600 text-white border-pink-500"
              : "bg-pink-100 hover:bg-pink-200 text-pink-800 border-pink-300"
          }`}
          onClick={() => goToPage(i)}
        >
          {i}
        </button>
      );
    }
    
    // 添加最后一页按钮
    if (endPage < totalPages) {
      // 添加省略号
      if (endPage < totalPages - 1) {
        buttons.push(
          <button
            key="ellipsis2"
            className="btn btn-sm bg-pink-100 hover:bg-pink-200 text-pink-800 border-pink-300"
            disabled
          >
            ...
          </button>
        );
      }
      
      buttons.push(
        <button
          key="last"
          className="btn btn-sm bg-pink-100 hover:bg-pink-200 text-pink-800 border-pink-300"
          onClick={() => goToPage(totalPages)}
        >
          {totalPages}
        </button>
      );
    }
    
    return buttons;
  }, [currentPage, totalPages, goToPage]);

  return (
    <div className="container mx-auto px-4 pb-10">
      {/* 搜索框和刷新按钮 */}
      <div className="flex justify-between items-center mb-6">
        <div className="form-control w-full max-w-md">
          <div className="relative">
            <input
              type="text"
              placeholder="搜索资源..."
              className="input input-bordered w-full pl-10 border-pink-300 focus:border-pink-500"
              value={searchTerm}
              onChange={handleSearchChange}
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="h-5 w-5 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        <button 
          className="btn bg-pink-500 hover:bg-pink-600 text-white"
          onClick={refreshData}
        >
          <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          刷新数据
        </button>
      </div>

      {/* 加载状态 */}
      {isLoading && (
        <div className="flex justify-center items-center py-10">
          <div className="loader ease-linear rounded-full border-4 border-t-4 border-pink-200 border-t-pink-500 h-12 w-12 animate-spin"></div>
        </div>
      )}

      {/* 无结果提示 */}
      {!isLoading && filteredCollectibles.length === 0 && (
        <div className="text-center py-10">
          <p className="text-xl text-pink-700">暂无购买的教育资源</p>
          <p className="text-pink-500 mt-2">您可以在市场上浏览并购买教育资源</p>
        </div>
      )}

      {/* 资源列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 justify-items-center">
        {displayedCollectibles.map((nft) => (
          <PurchaseCard key={nft.id} nft={nft} updateCollectible={updateCollectible} />
        ))}
      </div>

      {/* 分页信息 */}
      {!isLoading && filteredCollectibles.length > 0 && (
        <div className="text-center mt-4 text-pink-700">
          显示 {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredCollectibles.length)} 条，共 {filteredCollectibles.length} 条
        </div>
      )}

      {/* 分页控制 */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-4">
          <div className="btn-group">
            <button
              className="btn btn-sm bg-pink-100 hover:bg-pink-200 text-pink-800 border-pink-300"
              onClick={() => goToPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              «
            </button>
            
            {renderPaginationButtons()}
            
            <button
              className="btn btn-sm bg-pink-100 hover:bg-pink-200 text-pink-800 border-pink-300"
              onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}; 