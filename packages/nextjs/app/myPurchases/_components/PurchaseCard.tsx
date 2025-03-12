"use client";

import { useCallback, memo } from "react";
import { useRouter } from "next/navigation";
import { Collectible } from "./MyPurchases";
import { Address } from "~~/components/scaffold-eth";

// 使用memo包装组件，避免不必要的重新渲染
const PurchaseCard = memo(({ nft }: { nft: Collectible; updateCollectible?: (updatedNft: Collectible) => void }) => {
  const router = useRouter();

  // 截断描述文本，限制为50个字符
  const truncateDescription = useCallback((text: string | undefined, maxLength = 50) => {
    if (!text) return "";
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  }, []);

  // 查看详情（跳转到详情页）
  const viewDetails = useCallback(() => {
    router.push(`/myPurchases/details/${nft.id}`);
  }, [router, nft.id]);

  return (
    <div className="card bg-pink-50 shadow-lg w-[320px] h-[500px] shadow-pink-300 hover:shadow-xl transition-shadow duration-300 border border-pink-200 overflow-hidden">
      <figure className="relative h-[180px]">
        <img src={nft.image || nft.eduUri} alt="教育资源图片" className="w-full h-full object-cover" />
        <figcaption className="glass absolute bottom-4 left-4 p-3 rounded-xl backdrop-blur-sm bg-pink-500 bg-opacity-70">
          <span className="text-white font-semibold"># {nft.id}</span>
        </figcaption>
      </figure>
      <div className="card-body p-4 flex flex-col">
        <div className="flex-grow space-y-1 overflow-y-auto">
          <div className="flex items-start">
            <p className="text-lg p-0 m-0 font-semibold truncate w-full text-pink-800">名称: {nft.name}</p>
          </div>
          <div className="flex items-start">
            <p className="text-lg p-0 m-0 font-semibold truncate w-full text-pink-800">资源类型: {nft.resourceType}</p>
          </div>
          <div className="flex items-start">
            <p className="text-lg p-0 m-0 font-semibold truncate w-full text-pink-800">学科: {nft.subject}</p>
          </div>
          <div className="flex items-start">
            <p className="text-lg p-0 m-0 font-semibold truncate w-full text-pink-800">教育阶段: {nft.educationLevel}</p>
          </div>
          <div className="flex items-start">
            <p className="text-lg p-0 m-0 font-semibold break-words line-clamp-2 text-pink-800">
              描述: {truncateDescription(nft.description, 60)}
            </p>
          </div>
          <div className="flex items-start gap-1">
            <span className="text-base font-semibold text-pink-800">创建者: </span>
            <Address address={nft.owner as `0x${string}`} />
          </div>

          <div className="flex items-start">
            <span className="text-base font-semibold text-pink-800">下载次数: </span>
            <span className="text-base font-semibold ml-2 text-pink-600">{nft.downloadCount || 0}</span>
          </div>
          <div className="flex items-start">
            <span className="text-base font-semibold text-pink-800">评分: </span>
            <span className="text-base font-semibold ml-2 text-pink-600">
              {nft.ratingCount && nft.rating ? (nft.rating / nft.ratingCount).toFixed(1) : '暂无'} ({nft.ratingCount || 0}人评价)
            </span>
          </div>
        </div>
        
        <div className="mt-2 space-y-2 w-full">
          <button 
            className="btn btn-sm w-full bg-pink-500 hover:bg-pink-600 text-white border-pink-500" 
            onClick={viewDetails}
          >
            查看详情
          </button>
          
          {nft.eduResource && (
            <a 
              href={nft.eduResource} 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn btn-sm w-full bg-purple-500 hover:bg-purple-600 text-white border-purple-500"
            >
              下载资源
            </a>
          )}
        </div>
      </div>
    </div>
  );
});

// 添加显示名称，便于调试
PurchaseCard.displayName = "PurchaseCard";

export { PurchaseCard }; 