"use client";

import { useState, useCallback, memo } from "react";
import { Collectible } from "./MyHoldings";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

// 使用memo包装组件，避免不必要的重新渲染
const NFTCard = memo(({ nft, updateCollectible }: { nft: Collectible; updateCollectible: (updatedNft: Collectible) => void }) => {
  const { writeContractAsync } = useScaffoldWriteContract("YourCollectible");
  const [showDetails, setShowDetails] = useState(false);
  const [price, setPrice] = useState("");

  // 截断描述文本，限制为50个字符
  const truncateDescription = useCallback((text: string | undefined, maxLength = 50) => {
    if (!text) return "";
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  }, []);

  // 格式化价格显示
  const formatPrice = useCallback((bigintPrice: bigint | undefined) => {
    if (!bigintPrice) return "0";
    try {
      return (Number(bigintPrice) / 10**18).toString();
    } catch (error) {
      console.error("格式化价格出错:", error);
      return "0";
    }
  }, []);

  // 上架资源
  const handleListResource = useCallback(async () => {
    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      notification.error("请输入有效的价格");
      return;
    }

    const priceInWei = BigInt(Math.floor(parseFloat(price) * 10**18));
    const listingFee = BigInt(Math.floor(parseFloat(price) * 10**18 * 250 / 10000)); // 2.5%的上架费
    
    const notificationId = notification.loading("正在上架教育资源...");
    try {
      await writeContractAsync({
        functionName: "listEducationalResource",
        args: [BigInt(nft.id.toString()), priceInWei],
        value: listingFee,
      });

      notification.remove(notificationId);
      notification.success("教育资源上架成功！");
      updateCollectible({ ...nft, isListed: true, price: priceInWei });
    } catch (error) {
      notification.remove(notificationId);
      notification.error("教育资源上架失败！");
      console.error(error);
    }
  }, [nft, price, updateCollectible, writeContractAsync]);

  // 下架资源
  const handleUnlistResource = useCallback(async () => {
    const notificationId = notification.loading("正在下架教育资源...");
    try {
      await writeContractAsync({
        functionName: "unlistEducationalResource",
        args: [BigInt(nft.id.toString())],
      });

      notification.remove(notificationId);
      notification.success("教育资源下架成功！");
      updateCollectible({ ...nft, isListed: false, price: BigInt(0) });
    } catch (error) {
      notification.remove(notificationId);
      notification.error("教育资源下架失败！");
      console.error(error);
    }
  }, [nft, updateCollectible, writeContractAsync]);

  // 处理价格输入变化
  const handlePriceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPrice(e.target.value);
  }, []);

  // 切换详情模态框
  const toggleDetails = useCallback(() => {
    setShowDetails(prev => !prev);
  }, []);

  // 解析tokenUri中的JSON数据
  const parseTokenUri = useCallback(() => {
    try {
      // 尝试解析JSON数据
      let jsonData = null;
      try {
        // 如果nft.uri是JSON字符串，直接解析
        if (nft.uri.startsWith('{')) {
          jsonData = JSON.parse(nft.uri);
        } else {
          // 否则使用已有的属性构建数据对象
          jsonData = {
            name: nft.name,
            description: nft.description,
            image: nft.image,
            eduResource: nft.eduResource,
            fileName: nft.fileName,
            fileType: nft.fileType,
            fileSize: nft.fileSize,
            attributes: nft.attributes
          };
        }
      } catch (error) {
        console.error("解析JSON数据失败:", error);
      }

      return (
        <div className="modal-box bg-pink-50 max-w-4xl">
          <h3 className="font-bold text-xl text-pink-800 mb-4">教育资源详情</h3>
          
          {jsonData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 左侧：图片和基本信息 */}
              <div className="space-y-4">
                <div className="rounded-lg overflow-hidden border-2 border-pink-300">
                  <img 
                    src={jsonData.image} 
                    alt={jsonData.name || "教育资源图片"} 
                    className="w-full h-64 object-cover"
                  />
                </div>
                
                <div className="bg-pink-100 p-4 rounded-lg">
                  <h4 className="text-lg font-bold text-pink-800 mb-2">基本信息</h4>
                  <div className="space-y-2">
                    <p className="text-pink-800"><span className="font-semibold">名称:</span> {jsonData.name}</p>
                    <p className="text-pink-800"><span className="font-semibold">描述:</span> {jsonData.description}</p>
                    {jsonData.fileSize && (
                      <p className="text-pink-800">
                        <span className="font-semibold">文件大小:</span> {(jsonData.fileSize / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* 右侧：资源文件和属性 */}
              <div className="space-y-4">
                {jsonData.eduResource && (
                  <div className="bg-pink-100 p-4 rounded-lg">
                    <h4 className="text-lg font-bold text-pink-800 mb-2">教育资源文件</h4>
                    <div className="space-y-2">
                      {jsonData.fileName && (
                        <p className="text-pink-800">
                          <span className="font-semibold">文件名:</span> {jsonData.fileName}
                        </p>
                      )}
                      {jsonData.fileType && (
                        <p className="text-pink-800">
                          <span className="font-semibold">文件类型:</span> {jsonData.fileType}
                        </p>
                      )}
                      <div className="mt-4">
                        <a 
                          href={jsonData.eduResource} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="btn bg-pink-500 hover:bg-pink-600 text-white border-pink-500"
                        >
                          查看资源文件
                        </a>
                      </div>
                    </div>
                  </div>
                )}
                
                {jsonData.attributes && jsonData.attributes.length > 0 && (
                  <div className="bg-pink-100 p-4 rounded-lg">
                    <h4 className="text-lg font-bold text-pink-800 mb-2">资源属性</h4>
                    <div className="space-y-2">
                      {jsonData.attributes.map((attr: {trait_type: string, value: string}, index: number) => (
                        <p key={index} className="text-pink-800">
                          <span className="font-semibold">{attr.trait_type}:</span> {attr.value}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="bg-pink-100 p-4 rounded-lg">
                  <h4 className="text-lg font-bold text-pink-800 mb-2">区块链信息</h4>
                  <div className="space-y-2">
                    <p className="text-pink-800"><span className="font-semibold">Token ID:</span> {nft.id}</p>
                    <p className="text-pink-800"><span className="font-semibold">创建者:</span> <Address address={nft.owner as `0x${string}`} /></p>
                    <p className="text-pink-800"><span className="font-semibold">上架状态:</span> {nft.isListed ? '已上架' : '未上架'}</p>
                    {nft.price && nft.isListed && (
                      <p className="text-pink-800"><span className="font-semibold">价格:</span> {formatPrice(nft.price)} ETH</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-pink-100 p-4 rounded-lg">
              <h4 className="text-lg font-bold text-pink-800 mb-2">原始数据</h4>
              <pre className="bg-white p-4 rounded-lg text-pink-900 overflow-auto max-h-96 whitespace-pre-wrap">
                {nft.uri}
              </pre>
            </div>
          )}
          
          <div className="modal-action mt-6">
            <button className="btn bg-pink-500 hover:bg-pink-600 text-white" onClick={toggleDetails}>
              关闭
            </button>
          </div>
        </div>
      );
    } catch (error) {
      console.error("解析tokenUri失败:", error);
      return (
        <div className="modal-box bg-pink-50">
          <h3 className="font-bold text-lg text-pink-800 mb-4">无法解析资源详情</h3>
          <p className="text-pink-800">解析资源数据时出现错误。</p>
          <div className="modal-action">
            <button className="btn bg-pink-500 hover:bg-pink-600 text-white" onClick={toggleDetails}>
              关闭
            </button>
          </div>
        </div>
      );
    }
  }, [nft, formatPrice, toggleDetails]);

  return (
    <>
      <div className="card bg-pink-50 shadow-lg w-[320px] h-[600px] shadow-pink-300 hover:shadow-xl transition-shadow duration-300 border border-pink-200 overflow-hidden">
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
              <span className="text-base font-semibold text-pink-800">购买次数: </span>
              <span className="text-base font-semibold ml-2 text-pink-600">{nft.downloadCount || 0}</span>
            </div>
            <div className="flex items-start">
              <span className="text-base font-semibold text-pink-800">评分: </span>
              <span className="text-base font-semibold ml-2 text-pink-600">
                {nft.ratingCount && nft.rating ? (nft.rating / nft.ratingCount).toFixed(1) : '暂无'} ({nft.ratingCount || 0}人评价)
              </span>
            </div>
            <div className="flex items-start">
              <span className="text-base font-semibold text-pink-800">上架状态: </span>
              <span className={`text-base font-semibold ml-2 ${nft.isListed ? 'text-green-600' : 'text-pink-600'}`}>
                {nft.isListed ? '已上架' : '未上架'}
              </span>
            </div>
            {nft.price && nft.isListed && (
              <div className="flex items-start">
                <span className="text-base font-semibold text-pink-800">价格: </span>
                <span className="text-base font-semibold ml-2 text-pink-600">{formatPrice(nft.price)} ETH</span>
              </div>
            )}
          </div>
          
          <div className="mt-2 space-y-2 w-full">
            <button 
              className="btn btn-sm w-full bg-pink-500 hover:bg-pink-600 text-white border-pink-500" 
              onClick={toggleDetails}
            >
              查看详情
            </button>
            
            {!nft.isListed ? (
              <div className="flex flex-col space-y-2">
                <div className="flex space-x-1">
                  <input 
                    type="number" 
                    placeholder="输入价格 (ETH)" 
                    className="input input-sm input-bordered border-pink-300 flex-grow"
                    value={price}
                    onChange={handlePriceChange}
                    step="0.001"
                    min="0"
                  />
                  <button 
                    className="btn btn-sm bg-green-500 hover:bg-green-600 text-white border-green-500" 
                    onClick={handleListResource}
                  >
                    上架
                  </button>
                </div>
              </div>
            ) : (
              <button 
                className="btn btn-sm w-full bg-red-500 hover:bg-red-600 text-white border-red-500" 
                onClick={handleUnlistResource}
              >
                下架资源
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 详情模态框 */}
      {showDetails && (
        <div className="modal modal-open">
          {parseTokenUri()}
        </div>
      )}
    </>
  );
});

// 添加显示名称，便于调试
NFTCard.displayName = "NFTCard";

export { NFTCard };
