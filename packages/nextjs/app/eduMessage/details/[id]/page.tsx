"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { usePublicClient } from "wagmi";
import { getMetadataFromIPFS } from "~~/utils/simpleNFT/ipfs-fetch";
import { handleContractCallWithBlockData } from "~~/utils/scaffold-eth/blockchainTransactions";

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
  attributes?: Array<{trait_type: string, value: string}>;
  commentIds?: number[];
}

export default function ResourceDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { address } = useAccount();
  const [resource, setResource] = useState<ResourceDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [jsonData, setJsonData] = useState<any>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const hasLoadedData = useRef(false);
  const publicClient = usePublicClient();

  const { data: yourCollectible } = useScaffoldContract({
    contractName: "YourCollectible",
  });

  const { writeContractAsync } = useScaffoldWriteContract("YourCollectible");

  // 获取资源详情
  const fetchResourceDetails = useCallback(async () => {
    if (!yourCollectible || !params.id || hasLoadedData.current) return;
    
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
        commentIds: resourceData.commentIds.map((id: any) => Number(id)),
        ...metadata,
      };
      
      setResource(resourceDetails);
      
      // 处理评论数据并按最新排序
      const formattedComments = commentsData.map((comment: any) => ({
        id: Number(comment.id),
        author: comment.author,
        content: comment.content,
        timestamp: Number(comment.timestamp),
        likes: Number(comment.likes),
        replies: comment.replies.map((replyId: any) => Number(replyId)),
        parentId: Number(comment.parentId),
      }));
      
      // 默认按最新排序
      setComments(sortCommentsByTime(formattedComments, 'newest'));
      
      hasLoadedData.current = true;
    } catch (error) {
      console.error("获取资源详情失败:", error);
      notification.error("获取资源详情失败");
    } finally {
      setIsLoading(false);
    }
  }, [yourCollectible, params.id]);

  // 按时间排序评论
  const sortCommentsByTime = useCallback((commentsToSort: Comment[], order: 'newest' | 'oldest') => {
    return [...commentsToSort].sort((a, b) => {
      if (order === 'newest') {
        return b.timestamp - a.timestamp;
      } else {
        return a.timestamp - b.timestamp;
      }
    });
  }, []);

  // 切换排序顺序
  const toggleSortOrder = useCallback(() => {
    setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest');
    setComments(prev => sortCommentsByTime(prev, sortOrder === 'newest' ? 'oldest' : 'newest'));
  }, [sortOrder, sortCommentsByTime]);

  // 刷新评论
  const refreshComments = useCallback(async () => {
    if (!yourCollectible || !params.id) return;
    
    setIsLoadingComments(true);
    try {
      const tokenId = parseInt(params.id);
      const commentsData = await yourCollectible.read.getResourceComments([BigInt(tokenId)]);
      
      const formattedComments = commentsData.map((comment: any) => ({
        id: Number(comment.id),
        author: comment.author,
        content: comment.content,
        timestamp: Number(comment.timestamp),
        likes: Number(comment.likes),
        replies: comment.replies.map((replyId: any) => Number(replyId)),
        parentId: Number(comment.parentId),
      }));
      
      setComments(sortCommentsByTime(formattedComments, sortOrder));
      notification.success("评论已更新");
    } catch (error) {
      console.error("获取评论失败:", error);
      notification.error("获取评论失败");
    } finally {
      setIsLoadingComments(false);
    }
  }, [yourCollectible, params.id, sortOrder, sortCommentsByTime]);

  // 初始加载
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (yourCollectible && params.id && isMounted && !hasLoadedData.current) {
        await fetchResourceDetails();
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [yourCollectible, params.id, fetchResourceDetails]);

  // 返回上一页
  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  // 刷新页面
  const refreshPage = useCallback(() => {
    hasLoadedData.current = false;
    fetchResourceDetails();
  }, [fetchResourceDetails]);

  // 购买资源
  const purchaseResource = useCallback(async () => {
    if (!resource || !resource.isListed || !address) {
      notification.error("无法购买该资源");
      return;
    }
    
    setIsPurchasing(true);
    
    try {
      const tx = await writeContractAsync({
        functionName: "purchaseEducationalResource",
        args: [BigInt(resource.id)],
        value: resource.price,
      });
      
      // 保存区块交易数据
      if (tx && address && publicClient) {
        await handleContractCallWithBlockData(
          tx as string,
          address,
          publicClient,
          "购买教育资源",
          false // 不显示额外通知，避免与后续成功通知重复
        );
      }
      
      const receipt = await publicClient?.getTransactionReceipt({ hash: tx as `0x${string}` });
      console.log(receipt);
      notification.success("购买成功！");
      
      // 刷新资源信息
      hasLoadedData.current = false;
      fetchResourceDetails();
    } catch (error) {
      console.error("购买失败:", error);
      notification.error("购买失败，请检查您的钱包余额");
    } finally {
      setIsPurchasing(false);
    }
  }, [resource, address, writeContractAsync, publicClient, fetchResourceDetails]);

  // 格式化时间
  const formatDate = useCallback((timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  }, []);

  // 格式化价格
  const formatPrice = useCallback((price: bigint | undefined) => {
    if (!price) return "0";
    return (Number(price) / 10**18).toString();
  }, []);

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
        {/* 返回按钮和刷新按钮 */}
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
            
            {/* 右侧：上架状态和购买信息 */}
            <div className="space-y-6">
              <div className="bg-pink-50 p-4 rounded-lg">
                <h3 className="text-xl font-bold text-pink-800 mb-4">上架状态</h3>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <span className={`badge ${resource.isListed ? 'bg-green-500 border-green-500' : 'bg-yellow-500 border-yellow-500'} text-white p-3 text-lg`}>
                      {resource.isListed ? '已上架' : '未上架'}
                    </span>
                    {resource.isListed && (
                      <span className="ml-4 text-xl font-bold text-pink-600">
                        价格: {formatPrice(resource.price)} ETH
                      </span>
                    )}
                  </div>
                  
                  {resource.isListed && (
                    <button 
                      className="btn btn-lg w-full bg-pink-500 hover:bg-pink-600 text-white mt-4"
                      onClick={purchaseResource}
                      disabled={isPurchasing || !address}
                    >
                      {isPurchasing ? (
                        <>
                          <span className="loading loading-spinner loading-sm mr-2"></span>
                          购买中...
                        </>
                      ) : (
                        "购买此资源"
                      )}
                    </button>
                  )}
                  
                  {!address && (
                    <p className="text-yellow-600 mt-2">请先连接钱包才能购买资源</p>
                  )}
                </div>
              </div>
              
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
            </div>
          </div>
        </div>
        
        {/* 评论区域 */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-pink-200 mt-8 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-pink-800">评论 ({comments.length})</h3>
            <div className="flex space-x-2">
              <button 
                className="btn bg-pink-500 hover:bg-pink-600 text-white"
                onClick={refreshComments}
                disabled={isLoadingComments}
              >
                {isLoadingComments ? (
                  <>
                    <span className="loading loading-spinner loading-sm mr-2"></span>
                    加载中...
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    查看最新评论
                  </>
                )}
              </button>
              <button 
                className="btn bg-blue-500 hover:bg-blue-600 text-white"
                onClick={toggleSortOrder}
              >
                {sortOrder === 'newest' ? (
                  <>
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                    </svg>
                    最新优先
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                    </svg>
                    最早优先
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* 评论列表 */}
          {comments.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-pink-700">暂无评论</p>
              <p className="text-pink-500 mt-2">购买后可以评论此资源</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.filter(comment => comment.parentId === 0).map((comment) => (
                <div key={comment.id} className="bg-pink-50 p-4 rounded-lg">
                  <div className="flex items-start">
                    <div className="flex-grow">
                      <div className="flex items-center mb-2">
                        <Address address={comment.author as `0x${string}`} />
                        <span className="text-gray-500 text-sm ml-2">{formatDate(comment.timestamp)}</span>
                      </div>
                      <p className="text-pink-800">{comment.content}</p>
                      <div className="flex items-center mt-2">
                        <div className="flex items-center text-pink-600">
                          <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                          </svg>
                          <span>{comment.likes}</span>
                        </div>
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
                            <div className="flex items-center text-pink-600">
                              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                              </svg>
                              <span>{reply.likes}</span>
                            </div>
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
        
        {/* 提示信息 */}
        <div className="mt-8 bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="text-xl font-bold text-blue-800 mb-2">购买须知</h3>
          <ul className="list-disc list-inside space-y-2 text-blue-700">
            <li>购买后，您将获得此教育资源的使用权</li>
            <li>资源一旦购买，无法退款</li>
            <li>购买后可在&quot;我的购买资源&quot;页面查看和下载</li>
            <li>购买后可以对资源进行评分和评论</li>
            <li>请尊重知识产权，不要非法传播资源内容</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 