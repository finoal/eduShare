"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useScaffoldContract } from "~~/hooks/scaffold-eth";
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
  minRating: string;
  reviews: string[];
  reviewers: string[];
  image?: string; // 从eduUri解析的图片
}

const PAGE_SIZE = 6; // 每页显示的资源数量，增加到6个

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
  const [filteredResources, setFilteredResources] = useState<EduResource[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>("语文"); // 默认选中语文学科
  
  // 使用useRef跟踪数据是否已加载，避免重复加载
  const subjectDataLoaded = useRef<{[key: string]: boolean}>({});

  const { data: yourCollectibleContract } = useScaffoldContract({
    contractName: "YourCollectible",
  });

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
  const handleSubjectSelect = useCallback(async (subject: string) => {
      // 如果已经加载过该学科的数据，且不是强制刷新，则不重新加载
      if (subjectDataLoaded.current[subject] && selectedSubject === subject) {
        return;
      }
      setIsLoading(true);
      setSelectedSubject(subject);
      try {
        if (!yourCollectibleContract) return;
        // 调用合约方法获取该学科的资源ID列表
        const resourceIds = await yourCollectibleContract.read.getResourcesBySubject([subject]);

        if (!resourceIds || resourceIds.length === 0) {
          setFilteredResources([]);
          setIsLoading(false);
          // 标记该学科数据已加载
          subjectDataLoaded.current[subject] = true;
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
              tokenId: id.toString(),
              price: resourceData.price.toString(),
              creator: resourceData.creator,
              isListed: resourceData.isListed,
              eduUri: resourceData.eduUri,
              tokenUri: resourceData.tokenUri,
              resourceType: resourceData.resourceType,
              subject: resourceData.subject,
              educationLevel: resourceData.educationLevel,
              downloadCount: resourceData.downloadCount.toString(),
              rating: resourceData.rating.toString(),
              ratingCount: resourceData.ratingCount.toString(),
              commentIds: Array.from(resourceData.commentIds).map(id => id.toString()),
              isAccredited: resourceData.isAccredited,
              accreditedCount: resourceData.accreditedCount.toString(),
              accreditedInstitutions: Array.from(resourceData.accreditedInstitutions),
              buyers: Array.from(resourceData.buyers),
              creationTime: resourceData.creationTime.toString(),
              minRating: resourceData.minRating.toString(),
              reviews: Array.from(resourceData.reviews),
              reviewers: Array.from(resourceData.reviewers),
              image: image
            };
            console.log(resource);
            resourcesData.push(resource);
          } catch (error) {
            console.error(`获取资源 ${id} 详情失败:`, error);
          }
        }

        setFilteredResources(resourcesData);
        setCurrentPage(1); // 重置到第一页

        // 标记该学科数据已加载
        subjectDataLoaded.current[subject] = true;
      } catch (error) {
        console.error("获取学科资源失败:", error);
      } finally {
        setIsLoading(false);
      }
    }, [yourCollectibleContract, selectedSubject]);

  // 查看详情
  const viewDetails = useCallback((tokenId: string) => {
      router.push(`/eduMessage/details/${tokenId}`);
    },
    [router]
  );

  // 初始加载时选择语文学科
  useEffect(() => {
    if (yourCollectibleContract && !subjectDataLoaded.current["语文"]) {
      handleSubjectSelect("语文");
    }
  }, [yourCollectibleContract, handleSubjectSelect]);

  // 格式化时间
  const formatDate = useCallback((timestamp: string) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  }, []);

  // 格式化评分
  const formatRating = useCallback((rating: string, ratingCount: string) => {
    if (!ratingCount || Number(ratingCount) === 0) return "暂无评分";
    return (Number(rating) / Number(ratingCount)).toFixed(1);
  }, []);

  // 刷新数据
  const refreshData = useCallback(() => {
    if (selectedSubject) {
      // 重置该学科的加载状态，强制重新加载
      subjectDataLoaded.current[selectedSubject] = false;
      handleSubjectSelect(selectedSubject);
    }
  }, [selectedSubject, handleSubjectSelect]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center mt-10">
        <span className="loading loading-spinner loading-lg text-pink-500"></span>
      </div>
    );
  }

  // 分页数据
  const paginatedResources = filteredResources.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div className="container mx-auto bg-gradient-to-b from-pink-100 to-white min-h-screen p-4">
      {/* 学科分类菜单栏 */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex space-x-2 pb-2">
          {subjects.map((subject) => (
            <button
              key={subject}
              className={`btn ${selectedSubject === subject ? 'bg-pink-500 text-white border-pink-500' : 'btn-outline border-pink-400 text-pink-600'} whitespace-nowrap`}
              onClick={() => handleSubjectSelect(subject)}
            >
              {subject}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-pink-700">
          {selectedSubject} 教育资源
        </h1>
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
                <div className="card-body bg-gradient-to-b from-pink-50 to-white p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="badge badge-primary bg-pink-500 text-white border-pink-500 p-3">
                      {resource.resourceType}
                    </span>
                    <span className="badge badge-outline border-pink-400 text-pink-600 p-3">
                      {resource.educationLevel}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-800 mt-2 mb-1">
                    {resource.subject} 教育资源 #{resource.tokenId}
                  </h3>
                  
                  {/* 上架状态 */}
                  <div className="mt-2 mb-2">
                    <span className={`badge ${resource.isListed ? 'bg-green-500 border-green-500' : 'bg-yellow-500 border-yellow-500'} text-white p-2`}>
                      {resource.isListed ? '已上架' : '未上架'}
                    </span>
                    {resource.isListed && (
                      <span className="ml-2 text-sm text-pink-600 font-semibold">
                        价格: {Number(resource.price)/10**18} ETH
                      </span>
                    )}
                  </div>
                  
                  {/* 资源信息 */}
                  <div className="mt-2 space-y-1 text-sm text-gray-600">
                    <p>下载次数: {resource.downloadCount}</p>
                    <p>评分: {formatRating(resource.rating, resource.ratingCount)} ({resource.ratingCount}人评价)</p>
                    <p>创建时间: {formatDate(resource.creationTime)}</p>
                  </div>
                  
                  {/* 详情按钮 */}
                  <div className="mt-4">
                    <button
                      className="btn btn-primary w-full bg-pink-500 border-pink-500 hover:bg-pink-600 text-white"
                      onClick={() => viewDetails(resource.tokenId)}
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
