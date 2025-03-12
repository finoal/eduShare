"use client";

import { useState } from "react";
import { Collectible } from "./MyHoldings";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { useRouter } from "next/navigation"; // 页面跳转

export const NFTCard = ({ nft, updateCollectible }: { nft: Collectible; updateCollectible: (updatedNft: Collectible) => void }) => {
  const router = useRouter();
  const { writeContractAsync } = useScaffoldWriteContract("YourCollectible");

  // 截断描述文本，限制为50个字符
  const truncateDescription = (text: string | undefined, maxLength: number = 50) => {
    if (!text) return "";
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  // 上架或下架资源
  const handleToggleListStatus = async () => {
    const notificationId = notification.loading(nft.isListed ? "正在下架资源..." : "正在上架资源...");
    try {
      await writeContractAsync({
        functionName: nft.isListed ? "unlistNft" : "listNft",
        args: [BigInt(nft.id.toString()), nft.isListed ? undefined : nft.price],
      });

      notification.remove(notificationId);
      notification.success(nft.isListed ? "资源下架成功！" : "资源上架成功！");
      updateCollectible({ ...nft, isListed: !nft.isListed });
    } catch (error) {
      notification.remove(notificationId);
      notification.error(nft.isListed ? "资源下架失败！" : "资源上架失败！");
      console.error(error);
    }
  };

  // 封装跳转逻辑
  const handleNavigateToDetail = (nft: number) => {
    console.log(`NFT 选中, Token ID: ${nft}`);
    localStorage.setItem("selectedNft", JSON.stringify(nft));
    router.push(`/userAuth`);
  };

  return (
    <div className="card card-compact bg-pink-50 shadow-lg w-[300px] h-[650px] shadow-pink-300 hover:shadow-xl transition-shadow duration-300 border border-pink-200">
      <div className="cursor-pointer" onClick={() => handleNavigateToDetail(nft.id)}>
        <figure className="relative h-[180px] overflow-hidden">
          <img src={nft.image || nft.eduUri} alt="教育资源图片" className="w-full h-full object-cover" />
          <figcaption className="glass absolute bottom-4 left-4 p-4 rounded-xl backdrop-blur-sm bg-pink-500 bg-opacity-70">
            <span className="text-white font-semibold"># {nft.id}</span>
          </figcaption>
        </figure>
      </div>
      <div className="card-body flex flex-col h-[470px] p-4 bg-pink-50">
        <div className="flex-grow space-y-2">
          <div className="flex items-start">
            <p className="text-xl p-0 m-0 font-semibold truncate w-full text-pink-800">名称: {nft.name}</p>
          </div>
          <div className="flex items-start">
            <p className="text-xl p-0 m-0 font-semibold truncate w-full text-pink-800">种类: {nft.kind}</p>
          </div>
          <div className="flex items-start">
            <p className="text-xl p-0 m-0 font-semibold truncate w-full text-pink-800">资源类型: {nft.resourceType}</p>
          </div>
          <div className="flex items-start">
            <p className="text-xl p-0 m-0 font-semibold truncate w-full text-pink-800">学科: {nft.subject}</p>
          </div>
          <div className="flex items-start">
            <p className="text-xl p-0 m-0 font-semibold truncate w-full text-pink-800">教育阶段: {nft.educationLevel}</p>
          </div>
          <div className="flex items-start">
            <p className="text-xl p-0 m-0 font-semibold break-words line-clamp-3 text-pink-800">
              描述: {truncateDescription(nft.description, 80)}
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-lg font-semibold text-pink-800">创建者: </span>
            <Address address={nft.owner} />
          </div>

          <div className="flex items-start">
            <span className="text-lg font-semibold text-pink-800">下载次数: </span>
            <span className="text-lg font-semibold ml-2 text-pink-600">{nft.downloadCount || 0}</span>
          </div>
          <div className="flex items-start">
            <span className="text-lg font-semibold text-pink-800">评分: </span>
            <span className="text-lg font-semibold ml-2 text-pink-600">
              {nft.ratingCount ? (nft.rating / nft.ratingCount).toFixed(1) : '暂无'} ({nft.ratingCount || 0}人评价)
            </span>
          </div>
          <div className="flex items-start">
            <span className="text-lg font-semibold text-pink-800">上架状态: </span>
            <span className="text-lg font-semibold ml-2 text-pink-600">{nft.isListed ? '已上架' : '未上架'}</span>
          </div>
          {nft.price && nft.isListed && (
            <div className="flex items-start">
              <span className="text-lg font-semibold text-pink-800">价格: </span>
              <span className="text-lg font-semibold ml-2 text-pink-600">{Number(nft.price) / 10**18} ETH</span>
            </div>
          )}
        </div>
        
        <div className="mt-auto space-y-2 w-full">
          <button 
            className="btn w-full bg-pink-500 hover:bg-pink-600 text-white border-pink-500" 
            onClick={handleToggleListStatus}
          >
            {nft.isListed ? "下架资源" : "上架资源"}
          </button>
        </div>
      </div>


    </div>
  );
};
