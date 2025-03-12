"use client";

import { useEffect, useState } from "react";
import { NFTCard } from "./NFTCard";
import { useAccount } from "wagmi";
import { useScaffoldContract, useScaffoldReadContract } from "~~/hooks/scaffold-eth";
// import { notification } from "~~/utils/scaffold-eth";
import { getMetadataFromIPFS } from "~~/utils/simpleNFT/ipfs-fetch";
// import { NFTMetaData } from "~~/utils/simpleNFT/nftsMetadata";
import { useScaffoldEventHistory } from "~~/hooks/scaffold-eth";

export interface Collectible extends Partial<NFTMetaData> {
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
}

export const MyHoldings = () => {
  const { address: connectedAddress } = useAccount();
  const [myAllCollectibles, setMyAllCollectibles] = useState<Collectible[]>([]);
  const [filteredCollectibles, setFilteredCollectibles] = useState<Collectible[]>([]);
  const [allCollectiblesLoading, setAllCollectiblesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>(""); // 搜索框输入
  const [currentPage, setCurrentPage] = useState<number>(1); // 当前页码
  const itemsPerPage = 3; // 每页显示数量

  const { data: yourCollectibleContract } = useScaffoldContract({
    contractName: "YourCollectible",
  });

  const { data: myTotalBalance } = useScaffoldReadContract({
    contractName: "YourCollectible",
    functionName: "balanceOf",
    args: [connectedAddress],
    watch: true,
  });

  const updateCollectible = (updatedNft: Collectible) => {
    setMyAllCollectibles(prevCollectibles =>
      prevCollectibles.map(nft => (nft.id === updatedNft.id ? { ...nft, isAccredited: updatedNft.isAccredited } : nft)),
    );
    // 重新设置filteredCollectibles以触发重新渲染
    setFilteredCollectibles(prevFilteredCollectibles =>
      prevFilteredCollectibles.map(nft =>
        nft.id === updatedNft.id ? { ...nft, isAccredited: updatedNft.isAccredited } : nft,
      ),
    );
  };
  useEffect(() => {
    const updateMyCollectibles = async (): Promise<void> => {
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
      }
    };

    updateMyCollectibles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectedAddress, yourCollectibleContract]);

  useEffect(() => {
    // 避免不必要的状态更新
    const filtered = myAllCollectibles.filter(item =>
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.kind?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.resourceType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.educationLevel?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toString().includes(searchQuery)
    );

    if (JSON.stringify(filtered) !== JSON.stringify(filteredCollectibles)) {
      setFilteredCollectibles(filtered);
      setCurrentPage(1); // 每次筛选时重置到第一页
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

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
        <h1 className="text-3xl font-bold text-pink-700 mb-4">我的教育资源</h1>
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
              {/* <NFTCard nft={item} /> */}
              <NFTCard nft={item} updateCollectible={updateCollectible} />
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-center items-center mt-6">
        <button
          className="btn btn-secondary"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(currentPage - 1)}
        >
          上一页
        </button>
        <span className="mx-4">
          第 {currentPage} 页 / 共 {Math.max(totalPages, 1)} 页
        </span>
        <button
          className="btn btn-secondary"
          disabled={currentPage === totalPages || totalPages === 0}
          onClick={() => setCurrentPage(currentPage + 1)}
        >
          下一页
        </button>
      </div>
    </>
  );
};
