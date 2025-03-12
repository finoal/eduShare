"use client";

import { useEffect, useState, useCallback } from "react";
import { NFTCard } from "./NFTCard";
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

// 自定义比较函数，用于比较两个Collectible数组是否相等
const areCollectiblesEqual = (arr1: Collectible[], arr2: Collectible[]): boolean => {
  if (arr1.length !== arr2.length) return false;
  
  for (let i = 0; i < arr1.length; i++) {
    const item1 = arr1[i];
    const item2 = arr2[i];
    
    // 比较基本属性
    if (
      item1.id !== item2.id ||
      item1.uri !== item2.uri ||
      item1.owner !== item2.owner ||
      item1.isAccredited !== item2.isAccredited ||
      item1.isListed !== item2.isListed ||
      item1.eduUri !== item2.eduUri ||
      item1.resourceType !== item2.resourceType ||
      item1.subject !== item2.subject ||
      item1.educationLevel !== item2.educationLevel ||
      item1.downloadCount !== item2.downloadCount ||
      item1.rating !== item2.rating ||
      item1.ratingCount !== item2.ratingCount ||
      item1.name !== item2.name ||
      item1.description !== item2.description ||
      item1.image !== item2.image ||
      item1.eduResource !== item2.eduResource ||
      item1.fileName !== item2.fileName ||
      item1.fileType !== item2.fileType ||
      item1.fileSize !== item2.fileSize ||
      item1.kind !== item2.kind
    ) {
      return false;
    }
    
    // 特殊处理BigInt类型的price
    if (
      (item1.price && !item2.price) || 
      (!item1.price && item2.price) || 
      (item1.price && item2.price && item1.price !== item2.price)
    ) {
      return false;
    }
  }
  
  return true;
};

export const MyHoldings = () => {
  const { address: connectedAddress } = useAccount();
  const [myAllCollectibles, setMyAllCollectibles] = useState<Collectible[]>([]);
  const [filteredCollectibles, setFilteredCollectibles] = useState<Collectible[]>([]);
  const [allCollectiblesLoading, setAllCollectiblesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>(""); // 搜索框输入
  const [currentPage, setCurrentPage] = useState<number>(1); // 当前页码
  const [isInitialized, setIsInitialized] = useState(false); // 添加初始化标志
  const itemsPerPage = 3; // 每页显示数量

  const { data: yourCollectibleContract } = useScaffoldContract({
    contractName: "YourCollectible",
  });

  // 使用useCallback包装updateCollectible函数，避免不必要的重新创建
  const updateCollectible = useCallback((updatedNft: Collectible) => {
    setMyAllCollectibles(prevCollectibles =>
      prevCollectibles.map(nft => (nft.id === updatedNft.id ? { ...nft, isListed: updatedNft.isListed, price: updatedNft.price } : nft)),
    );
    
    setFilteredCollectibles(prevFilteredCollectibles =>
      prevFilteredCollectibles.map(nft =>
        nft.id === updatedNft.id ? { ...nft, isListed: updatedNft.isListed, price: updatedNft.price } : nft,
      ),
    );
  }, []);

  // 获取教育资源的函数
  const fetchEducationalResources = useCallback(async () => {
    if (!yourCollectibleContract || !connectedAddress) return;

    setAllCollectiblesLoading(true);
    try {
      // 使用getResourcesByAddress函数获取用户创建的教育资源
      const resources = await yourCollectibleContract.read.getResourcesByAddress([connectedAddress]);
      console.log("获取到的教育资源:", resources);
      
      const collectibleUpdate: Collectible[] = [];
      
      for (let i = 0; i < resources.length; i++) {
        const resource = resources[i];
        try {
          // 从tokenUri获取元数据
          const nftMetadata = await getMetadataFromIPFS(resource.tokenUri);
          
          collectibleUpdate.push({
            id: parseInt(resource.tokenId.toString()),
            uri: resource.tokenUri,
            owner: resource.creator,
            isAccredited: resource.isAccredited,
            price: resource.price,
            isListed: resource.isListed,
            eduUri: resource.eduUri,
            resourceType: resource.resourceType,
            subject: resource.subject,
            educationLevel: resource.educationLevel,
            downloadCount: parseInt(resource.downloadCount.toString()),
            rating: parseInt(resource.rating.toString()),
            ratingCount: parseInt(resource.ratingCount.toString()),
            creationTime: parseInt(resource.creationTime.toString()),
            ...nftMetadata,
          });
        } catch (e) {
          console.error(`处理资源 ${resource.tokenId.toString()} 时出错:`, e);
        }
      }
      
      collectibleUpdate.sort((a, b) => a.id - b.id);
      setMyAllCollectibles(collectibleUpdate);
      setFilteredCollectibles(collectibleUpdate); // 初始化筛选结果
    } catch (e) {
      console.error("获取教育资源失败:", e);
    } finally {
      setAllCollectiblesLoading(false);
      setIsInitialized(true); // 标记为已初始化
    }
  }, [connectedAddress, yourCollectibleContract]);

  // 只在组件挂载和依赖项变化时获取数据
  useEffect(() => {
    if (!isInitialized && connectedAddress && yourCollectibleContract) {
      fetchEducationalResources();
    }
  }, [connectedAddress, yourCollectibleContract, isInitialized, fetchEducationalResources]);

  // 处理搜索过滤
  useEffect(() => {
    if (!isInitialized) return; // 如果尚未初始化，则不执行过滤
    
    const filtered = myAllCollectibles.filter(item =>
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.kind?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.resourceType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.educationLevel?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toString().includes(searchQuery)
    );

    // 使用自定义比较函数代替JSON.stringify
    if (!areCollectiblesEqual(filtered, filteredCollectibles)) {
      setFilteredCollectibles(filtered);
      setCurrentPage(1); // 每次筛选时重置到第一页
    }
  }, [searchQuery, myAllCollectibles, isInitialized, filteredCollectibles]);

  // 计算分页数据
  const paginatedCollectibles = filteredCollectibles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredCollectibles.length / itemsPerPage);

  if (allCollectiblesLoading)
    return (
      <div className="flex justify-center items-center mt-10">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );

  return (
    <>
      <div className="flex flex-col items-center mb-6">
        <input
          type="text"
          placeholder="筛选资源类型、学科、名称或ID"
          className="input input-bordered border-pink-300 focus:border-pink-500 w-1/2"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>
      {paginatedCollectibles.length === 0 ? (
        <div className="flex justify-center items-center mt-10">
          <div className="text-2xl text-primary-content">未找到匹配的藏品。</div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4 my-8 px-5 justify-center">
          {paginatedCollectibles.map(item => (
            <div key={item.id} className="flex flex-col items-center">
              <NFTCard nft={item} updateCollectible={updateCollectible} />
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-center items-center mt-6 pb-8">
        <button
          className="btn btn-secondary bg-pink-500 hover:bg-pink-600 text-white border-pink-500"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(currentPage - 1)}
        >
          上一页
        </button>
        <span className="mx-4 text-pink-700">
          第 {currentPage} 页 / 共 {Math.max(totalPages, 1)} 页
        </span>
        <button
          className="btn btn-secondary bg-pink-500 hover:bg-pink-600 text-white border-pink-500"
          disabled={currentPage === totalPages || totalPages === 0}
          onClick={() => setCurrentPage(currentPage + 1)}
        >
          下一页
        </button>
      </div>
    </>
  );
};
