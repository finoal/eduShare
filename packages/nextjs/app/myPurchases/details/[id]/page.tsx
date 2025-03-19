"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { getMetadataFromIPFS } from "~~/utils/simpleNFT/ipfs-fetch";
import { DownloadButton } from "~~/app/myPurchases/_components/DownloadButton";

interface Comment {
  id: number;
  author: string;
  content: string;
  timestamp: number;
  likes: number;
  replies: number[];
  parentId: number;
}

interface ResourceDetails {
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
  name?: string;
  description?: string;
  image?: string;
  eduResource?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  attributes?: Array<{trait_type: string, value: string}>;
  comments?: Comment[];
}

export default function ResourceDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { address } = useAccount();
  const [resource, setResource] = useState<ResourceDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [userRating, setUserRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [hasRated, setHasRated] = useState(false);
  const [jsonData, setJsonData] = useState<any>(null);
  const [commentSortOrder, setCommentSortOrder] = useState<"newest" | "oldest">("oldest");
  const hasLoadedData = useRef(false);
  const addressRef = useRef<string | undefined>(address);

  useEffect(() => {
    addressRef.current = address;
  }, [address]);

  const { data: yourCollectible } = useScaffoldContract({
    contractName: "YourCollectible",
  });

  const { writeContractAsync } = useScaffoldWriteContract("YourCollectible");

  // 获取资源详情
  const fetchResourceDetails = useCallback(async () => {
    if (!yourCollectible || !params.id) return;
    
    setIsLoading(true);
    try {
      const tokenId = parseInt(params.id);
      const resourceData = await yourCollectible.read.getEducationalResource([BigInt(tokenId)]);
      
      // 获取评论
      const commentsData = await yourCollectible.read.getResourceComments([BigInt(tokenId)]);
      
      // 从IPFS获取元数据
      let metadata;
      try {
        if (resourceData.tokenUri.startsWith('{')) {
          metadata = JSON.parse(resourceData.tokenUri);
        } else {
          metadata = await getMetadataFromIPFS(resourceData.tokenUri);
        }
        setJsonData(metadata);
      } catch (error) {
        console.error(`获取元数据失败 (ID: ${tokenId}):`, error);
        metadata = { name: `资源 #${tokenId}`, description: "无法加载描述" };
      }
      
      // 检查用户是否已评分
      if (addressRef.current && resourceData.reviewers) {
        const reviewers = resourceData.reviewers;
        setHasRated(false); // 重置评分状态
        for (let i = 0; i < reviewers.length; i++) {
          if (reviewers[i].toLowerCase() === addressRef.current.toLowerCase()) {
            setHasRated(true);
            break;
          }
        }
      }
      
      const resourceDetails: ResourceDetails = {
        id: tokenId,
        uri: resourceData.tokenUri,
        owner: resourceData.creator,
        isAccredited: resourceData.isAccredited,
        price: resourceData.price,
        isListed: resourceData.isListed,
        eduUri: resourceData.eduUri,
        resourceType: resourceData.resourceType,
        subject: resourceData.subject,
        educationLevel: resourceData.educationLevel,
        downloadCount: Number(resourceData.downloadCount),
        rating: Number(resourceData.rating),
        ratingCount: Number(resourceData.ratingCount),
        creationTime: Number(resourceData.creationTime),
        ...metadata,
      };
      
      setResource(resourceDetails);
      setComments(commentsData.map((comment: any) => ({
        id: Number(comment.id),
        author: comment.author,
        content: comment.content,
        timestamp: Number(comment.timestamp),
        likes: Number(comment.likes),
        replies: comment.replies.map((replyId: any) => Number(replyId)),
        parentId: Number(comment.parentId),
      })));
      
      // 标记数据已加载
      hasLoadedData.current = true;
    } catch (error) {
      console.error("获取资源详情失败:", error);
      notification.error("获取资源详情失败");
    } finally {
      setIsLoading(false);
    }
  }, [yourCollectible, params.id]);

  // 初始加载
  useEffect(() => {
    let isMounted = true; // 用于防止组件卸载后设置状态
    
    const loadData = async () => {
      // 如果合约实例和ID存在，且组件已挂载，且数据未加载或需要重新加载
      if (yourCollectible && params.id && isMounted && !hasLoadedData.current) {
        await fetchResourceDetails();
      }
    };
    
    loadData();
    
    // 清理函数
    return () => {
      isMounted = false;
    };
  }, [yourCollectible, params.id, fetchResourceDetails, hasLoadedData.current]);

  // 手动刷新页面
  const refreshPage = useCallback(() => {
    // 重置数据加载标志，强制重新加载数据
    hasLoadedData.current = false;
    fetchResourceDetails();
  }, [fetchResourceDetails]);

  // 返回上一页
  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  // 提交评论
  const submitComment = useCallback(async () => {
    if (!newComment.trim() || !addressRef.current || !resource) {
      notification.error("请输入评论内容");
      return;
    }
    
    try {
      await writeContractAsync({
        functionName: "addComment",
        args: [BigInt(resource.id), newComment, BigInt(0)],
      });
      
      notification.success("评论提交成功");
      setNewComment("");
      
      // 重置数据加载标志，强制重新加载数据
      hasLoadedData.current = false;
      // 重新获取评论
      fetchResourceDetails();
    } catch (error) {
      console.error("提交评论失败:", error);
      notification.error("提交评论失败");
    }
  }, [newComment, resource, writeContractAsync, fetchResourceDetails]);

  // 提交评分
  const submitRating = useCallback(async () => {
    if (!userRating || !addressRef.current || !resource) {
      notification.error("请选择评分");
      return;
    }
    
    try {
      await writeContractAsync({
        functionName: "rateResource",
        args: [BigInt(resource.id), BigInt(userRating)],
      });
      
      notification.success("评分提交成功");
      setHasRated(true);
      
      // 重置数据加载标志，强制重新加载数据
      hasLoadedData.current = false;
      // 重新获取资源详情
      fetchResourceDetails();
    } catch (error) {
      console.error("提交评分失败:", error);
      notification.error("提交评分失败");
    }
  }, [userRating, resource, writeContractAsync, fetchResourceDetails]);

  // 点赞评论
  const likeComment = useCallback(async (commentId: number) => {
    if (!addressRef.current || !resource) return;
    
    try {
      await writeContractAsync({
        functionName: "likeComment",
        args: [BigInt(commentId)],
      });
      
      notification.success("点赞成功");
      
      // 重置数据加载标志，强制重新加载数据
      hasLoadedData.current = false;
      // 重新获取评论
      fetchResourceDetails();
    } catch (error) {
      console.error("点赞失败:", error);
      notification.error("点赞失败");
    }
  }, [resource, writeContractAsync, fetchResourceDetails]);

  // 格式化时间
  const formatDate = useCallback((timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  }, []);

  // 切换评论排序顺序
  const toggleCommentSort = useCallback(() => {
    setCommentSortOrder(prev => prev === "newest" ? "oldest" : "newest");
  }, []);

  // 获取排序后的评论
  const getSortedComments = useCallback(() => {
    if (commentSortOrder === "newest") {
      return [...comments].filter(comment => comment.parentId === 0).sort((a, b) => b.timestamp - a.timestamp);
    } else {
      return [...comments].filter(comment => comment.parentId === 0).sort((a, b) => a.timestamp - b.timestamp);
    }
  }, [comments, commentSortOrder]);

  // 更新资源的下载次数
  const handleDownloadSuccess = useCallback(async () => {
    if (!resource) return;
    
    try {
      // 在本地立即更新下载次数，提供即时反馈
      setResource(prev => {
        if (!prev) return null;
        return {
          ...prev,
          downloadCount: (prev.downloadCount || 0) + 1,
        };
      });
      
      // 这里可以添加合约调用来持久化更新下载次数
      // 如果您不想修改合约操作，可以省略下面的注释部分
      
      /*
      await writeContractAsync({
        functionName: "updateDownloadCount",
        args: [BigInt(resource.id)],
      });
      */
      
      notification.success("下载计数已更新");
    } catch (error) {
      console.error("更新下载计数失败:", error);
    }
  }, [resource]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-100 to-white flex justify-center items-center">
        <div className="loader ease-linear rounded-full border-4 border-t-4 border-pink-200 border-t-pink-500 h-12 w-12 animate-spin"></div>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-100 to-white flex flex-col justify-center items-center">
        <h1 className="text-2xl font-bold text-pink-700 mb-4">资源不存在或已被删除</h1>
        <button 
          className="btn bg-pink-500 hover:bg-pink-600 text-white" 
          onClick={goBack}
        >
          返回上一页
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-100 to-white py-10">
      <div className="container mx-auto px-4">
        {/* 返回按钮 */}
        <div className="mb-6 flex justify-between">
          <button 
            className="btn bg-pink-500 hover:bg-pink-600 text-white" 
            onClick={goBack}
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回上一页
          </button>
          
          <button 
            className="btn bg-pink-500 hover:bg-pink-600 text-white" 
            onClick={refreshPage}
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            刷新页面
          </button>
        </div>
        
        {/* 资源详情 */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-pink-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
            {/* 左侧：图片和基本信息 */}
            <div className="space-y-6">
              <div className="rounded-lg overflow-hidden border-2 border-pink-300">
                <img 
                  src={resource.image || resource.eduUri} 
                  alt={resource.name || "教育资源图片"} 
                  className="w-full h-64 object-cover"
                />
              </div>
              
              <div className="bg-pink-50 p-4 rounded-lg">
                <h2 className="text-2xl font-bold text-pink-800 mb-4">{resource.name}</h2>
                <div className="space-y-2">
                  <p className="text-pink-800"><span className="font-semibold">描述:</span> {resource.description}</p>
                  <p className="text-pink-800"><span className="font-semibold">资源类型:</span> {resource.resourceType}</p>
                  <p className="text-pink-800"><span className="font-semibold">学科:</span> {resource.subject}</p>
                  <p className="text-pink-800"><span className="font-semibold">教育阶段:</span> {resource.educationLevel}</p>
                  <p className="text-pink-800"><span className="font-semibold">创建者:</span> <Address address={resource.owner as `0x${string}`} /></p>
                  <p className="text-pink-800"><span className="font-semibold">创建时间:</span> {resource.creationTime ? formatDate(resource.creationTime) : '未知'}</p>
                </div>
              </div>
            </div>
            
            {/* 右侧：资源文件和属性 */}
            <div className="space-y-6">
              {resource.eduResource && (
                <div className="bg-pink-50 p-4 rounded-lg">
                  <h3 className="text-xl font-bold text-pink-800 mb-4">教育资源文件</h3>
                  <div className="space-y-2">
                    {resource.fileName && (
                      <p className="text-pink-800">
                        <span className="font-semibold">文件名:</span> {resource.fileName}
                      </p>
                    )}
                    {resource.fileType && (
                      <p className="text-pink-800">
                        <span className="font-semibold">文件类型:</span> {resource.fileType}
                      </p>
                    )}
                    {resource.fileSize && (
                      <p className="text-pink-800">
                        <span className="font-semibold">文件大小:</span> {(resource.fileSize / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    )}
                    <div className="mt-4">
                      <DownloadButton
                        url={resource.eduResource || ""}
                        fileName={resource.fileName || resource.name || "教育资源"}
                        fileType={resource.fileType || ""}
                        fileSize={resource.fileSize}
                        onDownloadSuccess={handleDownloadSuccess}
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {jsonData?.attributes && jsonData.attributes.length > 0 && (
                <div className="bg-pink-50 p-4 rounded-lg">
                  <h3 className="text-xl font-bold text-pink-800 mb-4">资源属性</h3>
                  <div className="space-y-2">
                    {jsonData.attributes.map((attr: {trait_type: string, value: string}, index: number) => (
                      <p key={index} className="text-pink-800">
                        <span className="font-semibold">{attr.trait_type}:</span> {attr.value}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="bg-pink-50 p-4 rounded-lg">
                <h3 className="text-xl font-bold text-pink-800 mb-4">统计信息</h3>
                <div className="space-y-2">
                  <p className="text-pink-800"><span className="font-semibold">下载次数:</span> {resource.downloadCount || 0}</p>
                  <div className="flex items-center">
                    <span className="font-semibold text-pink-800 mr-2">评分:</span>
                    <div className="flex items-center">
                      <span className="text-pink-600 font-bold text-lg mr-2">
                        {resource.ratingCount && resource.rating ? (resource.rating / resource.ratingCount).toFixed(1) : '暂无'}
                      </span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg 
                            key={star} 
                            className="h-5 w-5 text-yellow-400" 
                            fill={resource.ratingCount && resource.rating && (resource.rating / resource.ratingCount) >= star ? "currentColor" : "none"} 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        ))}
                      </div>
                      <span className="ml-2 text-pink-800">({resource.ratingCount || 0}人评价)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* 评分区域 */}
        {!hasRated && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-pink-200 mt-8 p-6">
            <h3 className="text-xl font-bold text-pink-800 mb-4">为此资源评分</h3>
            <div className="flex items-center">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button 
                    key={star} 
                    className="focus:outline-none" 
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    onClick={() => setUserRating(star)}
                  >
                    <svg 
                      className="h-8 w-8 text-yellow-400" 
                      fill={(hoveredRating || userRating) >= star ? "currentColor" : "none"} 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </button>
                ))}
              </div>
              <span className="ml-4 text-pink-800">
                {userRating ? `您的评分: ${userRating}星` : '请选择评分'}
              </span>
              <button 
                className="btn bg-pink-500 hover:bg-pink-600 text-white ml-4" 
                onClick={submitRating}
                disabled={!userRating}
              >
                提交评分
              </button>
            </div>
          </div>
        )}
        
        {/* 评论区域 */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-pink-200 mt-8 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-pink-800">评论 ({comments.length})</h3>
            <button 
              className="btn btn-sm bg-pink-400 hover:bg-pink-500 text-white"
              onClick={toggleCommentSort}
            >
              {commentSortOrder === "newest" ? "查看最早评论" : "查看最新评论"}
              <svg className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
            </button>
          </div>
          
          {/* 添加评论 */}
          <div className="mb-6">
            <textarea 
              className="w-full p-3 border border-pink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              placeholder="添加评论..."
              rows={3}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            ></textarea>
            <div className="flex justify-end mt-2">
              <button 
                className="btn bg-pink-500 hover:bg-pink-600 text-white" 
                onClick={submitComment}
                disabled={!newComment.trim()}
              >
                发表评论
              </button>
            </div>
          </div>
          
          {/* 评论列表 */}
          {comments.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-pink-700">暂无评论</p>
              <p className="text-pink-500 mt-2">成为第一个评论的人吧！</p>
            </div>
          ) : (
            <div className="space-y-4">
              {getSortedComments().map((comment) => (
                <div key={comment.id} className="bg-pink-50 p-4 rounded-lg">
                  <div className="flex items-start">
                    <div className="flex-grow">
                      <div className="flex items-center mb-2">
                        <Address address={comment.author as `0x${string}`} />
                        <span className="text-gray-500 text-sm ml-2">{formatDate(comment.timestamp)}</span>
                      </div>
                      <p className="text-pink-800">{comment.content}</p>
                      <div className="flex items-center mt-2">
                        <button 
                          className="flex items-center text-pink-600 hover:text-pink-800"
                          onClick={() => likeComment(comment.id)}
                        >
                          <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                          </svg>
                          <span>{comment.likes}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* 回复列表 */}
                  {comment.replies.length > 0 && (
                    <div className="ml-8 mt-4 space-y-3">
                      {comments.filter(reply => comment.replies.includes(reply.id)).map((reply) => (
                        <div key={reply.id} className="bg-white p-3 rounded-lg">
                          <div className="flex items-center mb-2">
                            <Address address={reply.author as `0x${string}`} />
                            <span className="text-gray-500 text-sm ml-2">{formatDate(reply.timestamp)}</span>
                          </div>
                          <p className="text-pink-800">{reply.content}</p>
                          <div className="flex items-center mt-2">
                            <button 
                              className="flex items-center text-pink-600 hover:text-pink-800"
                              onClick={() => likeComment(reply.id)}
                            >
                              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                              </svg>
                              <span>{reply.likes}</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 