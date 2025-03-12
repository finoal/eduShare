"use client";

import { useEffect, useState } from "react";
import { useScaffoldContract, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { usePublicClient } from "wagmi";
import { useRouter } from "next/navigation";

// 定义教育资源接口
export interface EduResource {
  tokenId: string;
  price: string;
  creator: string;
  isListed: boolean;
  eduUri: string;
  tokenUri: string;
  resourceType: string;
  subject: string;
  educationLevel: string;
  downloadCount: string;
  rating: string;
  ratingCount: string;
  commentIds: string[];
  isAccredited: boolean;
  accreditedCount: string;
  accreditedInstitutions: string[];
  buyers: string[];
  creationTime: string;
  lastUpdateTime: string;
  isActive: boolean;
  minRating: string;
  requiredIntegral: string;
  reviews: string[];
  reviewers: string[];
  image?: string; // 从eduUri解析的图片
}

const PAGE_SIZE = 3; // 每页显示的资源数量

// 学科列表
const subjects = [
  "语文",
  "数学",
  "英语",
  "物理",
  "化学",
  "生物",
  "历史",
  "地理",
  "政治",
  "社会",
  "体育",
  "音乐",
  "美术",
  "信息技术",
  "其他",
];

const EduResourcePage = () => {
  const router = useRouter();
  const [resources, setResources] = useState<EduResource[]>([]);
  const [filteredResources, setFilteredResources] = useState<EduResource[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>(""); // 当前选中的学科
  const [purchasingStates, setPurchasingStates] = useState<{[key: string]: boolean}>({}); // 记录每个资源的购买状态
  const publicClient = usePublicClient();

  const { data: yourCollectibleContract } = useScaffoldContract({
    contractName: "YourCollectible",
  });

  const { writeContractAsync } = useScaffoldWriteContract("YourCollectible");

  // 从IPFS获取元数据
  const getMetadataFromIPFS = async (uri: string) => {
    try {
      const ipfsUrl = uri.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/");
      const response = await fetch(ipfsUrl);
      const metadata = await response.json();
      if (metadata.image) {
        metadata.image = metadata.image.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/");
      }
      return metadata;
    } catch (error) {
      console.error("IPFS 元数据获取失败:", error);
      return {};
    }
  };

  // 处理学科选择
  const handleSubjectSelect = async (subject: string) => {
    setIsLoading(true);
    setSelectedSubject(subject);
    try {
      if (!yourCollectibleContract) return;
      console.log(subject);
      // 调用合约方法获取该学科的资源ID列表
      const resourceIds = await yourCollectibleContract.read.getResourcesBySubject([subject]);
      console.log(resourceIds);
      
      if (!resourceIds || resourceIds.length === 0) {
        setResources([]);
        setFilteredResources([]);
        setIsLoading(false);
        return;
      }
      
      // 获取每个资源的详细信息
      const resourcesData: EduResource[] = [];
      for (const id of resourceIds) {
        try {
          const resourceData = await yourCollectibleContract.read.getEducationalResource([id]);
          
          // 从eduUri获取图片
          let image = "";
          try {
            const metadata = await getMetadataFromIPFS(resourceData.eduUri);
            image = metadata.image || "";
          } catch (error) {
            console.error("获取资源图片失败:", error);
          }
          
          // 构建资源对象
          const resource: EduResource = {
            ...resourceData,
            tokenId: id.toString(),
            image,
          };
          
          resourcesData.push(resource);
        } catch (error) {
          console.error(`获取资源 ${id} 详情失败:`, error);
        }
      }
      
      setResources(resourcesData);
      setFilteredResources(resourcesData);
      setCurrentPage(1); // 重置到第一页
    } catch (error) {
      console.error("获取学科资源失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理购买资源
  const handlePurchase = async (resource: EduResource) => {
    if (!resource.isListed) return;
    
    // 设置当前资源为购买中状态
    setPurchasingStates(prev => ({ ...prev, [resource.tokenId]: true }));
    
    try {
      const tx = await writeContractAsync({
        functionName: "purchaseEducationalResource",
        args: [BigInt(resource.tokenId)],
        value: BigInt(resource.price),
      });
      
      const receipt = await publicClient?.getTransactionReceipt({ hash: tx as `0x${string}` });
      console.log(receipt);
      alert(`购买资源 ${resource.tokenId} 成功！`);
    } catch (error) {
      console.error(`购买资源 ${resource.tokenId} 失败:`, error);
      alert(`购买资源 ${resource.tokenId} 失败，请检查您的钱包余额。`);
    } finally {
      // 无论成功失败，都重置购买状态
      setPurchasingStates(prev => ({ ...prev, [resource.tokenId]: false }));
    }
  };

  // 初始加载时选择第一个学科
  useEffect(() => {
    if (subjects.length > 0 && !selectedSubject) {
      handleSubjectSelect(subjects[0]);
    }
  }, [yourCollectibleContract]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center mt-10">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  // 分页数据
  const paginatedResources = filteredResources.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div className="container mx-auto bg-gradient-to-r from-pink-100 to-pink-200 min-h-screen p-4">
      {/* 学科分类菜单栏 */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex space-x-2 pb-2">
          {subjects.map((subject) => (
            <button
              key={subject}
              className={`btn ${selectedSubject === subject ? 'btn-primary bg-pink-500 border-pink-500' : 'btn-outline border-pink-400 text-pink-600'} whitespace-nowrap`}
              onClick={() => handleSubjectSelect(subject)}
            >
              {subject}
            </button>
          ))}
        </div>
      </div>

      <h1 className="text-3xl font-bold text-center mb-6 text-pink-700">
        {selectedSubject || "全部"} 教育资源
      </h1>

      {filteredResources.length === 0 ? (
        <div className="flex justify-center items-center mt-10">
          <div className="text-2xl text-pink-700">暂无{selectedSubject}学科的教育资源</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedResources.map((resource) => (
              <div
                key={resource.tokenId}
                className="card bg-white shadow-xl rounded-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300 border-2 border-pink-300"
              >
                <figure className="h-48 overflow-hidden bg-pink-50">
                  <img
                    src={resource.image || resource.eduUri}
                    alt={`${resource.subject}资源`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // 图片加载失败时显示默认图片
                      (e.target as HTMLImageElement).src = "https://via.placeholder.com/400x300?text=教育资源";
                    }}
                  />
                </figure>
                <div className="card-body bg-gradient-to-b from-pink-50 to-white">
                  <div className="flex justify-between items-center mb-2">
                    <span className="badge badge-primary bg-pink-500 text-white border-pink-500 p-3">
                      {resource.resourceType}
                    </span>
                    <span className="badge badge-outline border-pink-400 text-pink-600 p-3">
                      {resource.educationLevel}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-800 mt-2 mb-1">
                    {resource.subject} 教育资源
                  </h3>
                  
                  {/* 显示资源状态 */}
                  <div className="mt-2 mb-2">
                    <span className={`badge ${resource.isListed ? 'badge-success bg-green-500 border-green-500' : 'badge-warning bg-yellow-500 border-yellow-500'} text-white p-2`}>
                      {resource.isListed ? '已上架' : '未上架'}
                    </span>
                  </div>
                  
                  {/* 只有上架的资源才显示价格和购买按钮 */}
                  {resource.isListed && (
                    <div className="mt-4 flex justify-between items-center">
                      <span className="text-lg font-bold text-pink-600">
                        {Number(resource.price)} ETH
                      </span>
                      <button
                        className="btn btn-primary bg-pink-500 border-pink-500 hover:bg-pink-600"
                        onClick={() => handlePurchase(resource)}
                        disabled={purchasingStates[resource.tokenId]}
                      >
                        {purchasingStates[resource.tokenId] ? (
                          <>
                            <span className="loading loading-spinner loading-xs mr-2"></span>
                            购买中...
                          </>
                        ) : (
                          "购买"
                        )}
                      </button>
                    </div>
                  )}
                  
                  {/* 详情按钮 - 所有资源都显示 */}
                  <div className="mt-3">
                    <button
                      className="btn btn-outline w-full border-pink-400 text-pink-600 hover:bg-pink-100"
                      onClick={() => router.push(`/nftMessage?id=${resource.tokenId}`)}
                    >
                      查看详情
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 分页导航 */}
          <div className="flex justify-center items-center mt-8 space-x-4">
            <button
              className="btn btn-outline border-pink-400 text-pink-600"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              上一页
            </button>
            <span className="text-pink-700">
              第 {currentPage} 页 / 共 {Math.ceil(filteredResources.length / PAGE_SIZE)} 页
            </span>
            <button
              className="btn btn-outline border-pink-400 text-pink-600"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredResources.length / PAGE_SIZE)))}
              disabled={currentPage === Math.ceil(filteredResources.length / PAGE_SIZE)}
            >
              下一页
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default EduResourcePage;
