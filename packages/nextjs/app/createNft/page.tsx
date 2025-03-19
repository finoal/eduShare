"use client";

import { useState } from "react";
import { usePublicClient, useAccount } from "wagmi";
import { notification } from "~~/utils/scaffold-eth";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { NextPage } from "next";
import { DocumentTextIcon } from "@heroicons/react/24/outline";

// Pinata 配置
const PINATA_API = {
  endpoint: "https://api.pinata.cloud/pinning/pinFileToIPFS",
  key: "64dd16aca40a666f6fc9",
  secret: "7595d169c762677c13fb193070e911038db2da1d6e29b92e59bfb0088eb5fcb7",
  jwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI0YzA5Zjc2Yy1hMGU1LTQzYWMtYjdlMi1iNTQwYTEwYjJiNjkiLCJlbWFpbCI6IjI4MjQ4OTgzMjJAcXEuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6IjY0ZGQxNmFjYTQwYTY2NmY2ZmM5Iiwic2NvcGVkS2V5U2VjcmV0IjoiNzU5NWQxNjljNzYyNjc3YzEzZmIxOTMwNzBlOTExMDM4ZGIyZGExZDZlMjliOTJlNTliZmIwMDg4ZWI1ZmNiNyIsImV4cCI6MTc3MzA2ODI0Mn0.O5n6iTF9XlLPf5f7IhgOlKLuOAtuRaS5DtKAkoLZAaE"
};

// 上传文件到IPFS
const uploadToIPFS = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(PINATA_API.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PINATA_API.jwt}`,
    },
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`上传失败: ${res.statusText}`);
  }

  const data = await res.json();
  return data.IpfsHash;
};

const CreateNft: NextPage = () => {
  const { writeContractAsync } = useScaffoldWriteContract("YourCollectible");
  const { address, isConnected } = useAccount();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [royaltyFee, setRoyaltyFee] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  // 新增字段
  const [resourceType, setResourceType] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [educationLevel, setEducationLevel] = useState<string>("");

  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>("");
  const publicClient = usePublicClient();
  const resourceTypes = ["课件", "试卷", "教案", "课外读物", "实验指导", "其他"];
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
  const educationLevels = ["幼儿", "小学", "初中", "高中", "大学", "研究生", "其他"];

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // 检查文件大小（限制为50MB）
      if (selectedFile.size > 50 * 1024 * 1024) {
        notification.error("文件大小不能超过50MB");
        return;
      }
      
      setFile(selectedFile);
      
      // 如果是图片类型，显示预览
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        // 非图片类型显示文件名
        setPreview(selectedFile.name);
      }
    }
  };

  const handleCoverImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // 检查文件大小（限制为5MB）
      if (selectedFile.size > 5 * 1024 * 1024) {
        notification.error("封面图片大小不能超过5MB");
        return;
      }
      
      // 检查是否为图片文件
      if (!selectedFile.type.startsWith('image/')) {
        notification.error("请上传图片格式的封面");
        return;
      }

      setCoverImage(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleMintResource = async () => {
    if (!file || !coverImage || !isConnected) {
      notification.error("请上传资源文件和封面图片，并确保您的钱包已连接");
      return;
    }

    if (!name || !resourceType || !subject || !educationLevel) {
      notification.error("请填写完整的资源信息");
      return;
    }

    setIsProcessing(true);
    const notificationId = notification.loading("正在上传资源...");

    try {
      // 上传封面图片到IPFS
      const coverHash = await uploadToIPFS(coverImage);
      const coverUri = `https://gateway.pinata.cloud/ipfs/${coverHash}`;

      // 上传教育资源文件到IPFS
      const eduHash = await uploadToIPFS(file);
      const eduUri = `https://gateway.pinata.cloud/ipfs/${eduHash}`;

      // 创建并上传元数据
      const metadata = {
        name,
        description,
        image: coverUri, // 封面图片链接
        eduResource: eduUri, // 教育资源文件链接
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        attributes: [
          { trait_type: "resourceType", value: resourceType },
          { trait_type: "subject", value: subject },
          { trait_type: "educationLevel", value: educationLevel },
        ],
      };

      const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
      const metadataFile = new File([metadataBlob], 'metadata.json');
      const metadataHash = await uploadToIPFS(metadataFile);

      notification.remove(notificationId);
      notification.success("资源已上传到IPFS");

      // 调用合约创建教育资源NFT
      const tx = await writeContractAsync({
        functionName: "mintEducationalResource",
        args: [
          address, 
          coverUri,  // 教育资源URI
          metadataHash, // 封面图片URI
          BigInt(Math.min(royaltyFee, 10)), 
          resourceType, 
          subject, 
          educationLevel
        ],
      });
      // const receipt = await publicClient?.getTransactionReceipt({ hash: tx as `0x${string}` });
      const receipt = await publicClient?.getTransactionReceipt({
        hash: tx as `0x${string}`,
      });
      console.log(receipt);
      // 从收据中获取区块高度和交易哈希值
      const blockNumber = receipt?.blockNumber; // 区块高度
      const transactionHash = receipt?.transactionHash; // 交易哈希值
      // 获取区块详细信息以获取时间戳
      const block = await publicClient?.getBlock({
        blockNumber: blockNumber,
      });

      // 区块时间戳
      const blockTimestamp = block?.timestamp;
      
      // 将区块链数据保存到数据库
      try {
        // 准备交易数据 - 简化，只包含必要的区块链信息
        const transactionData = {
          blockNumber: blockNumber?.toString(),
          blockTimestamp: blockTimestamp?.toString(),
          transactionHash,
          fromAddress: address,
          toAddress: receipt?.to || "", // 合约地址
          gas: Number(receipt?.gasUsed.toString()) || 0,
          operationDescription: "创建教育资源NFT"
        };

        console.log('发送区块链数据到服务器:', transactionData);

        // 发送请求到后端API保存交易记录
        const response = await fetch('http://localhost:3001/saveTransactionFromClient', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(transactionData),
        });

        const result = await response.json();
        
        if (result.success) {
          console.log('区块链交易记录已保存到数据库');
        } else {
          console.error('保存区块链交易记录失败:', result.message);
        }
      } catch (error) {
        console.error('保存区块链交易记录时出错:', error);
      }

      if (receipt?.status === "success") {
        notification.success("教育资源创建成功！");
      } else {
        notification.error("教育资源创建失败");
      }
      // 清空表单
      setFile(null);
      setPreview("");
      setCoverImage(null);
      setCoverPreview("");
      setName("");
      setDescription("");
      setRoyaltyFee(0);
      setResourceType("");
      setSubject("");
      setEducationLevel("");
    } catch (error) {
      notification.remove(notificationId);
      console.error(error);
      notification.error("创建教育资源失败");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-pink-200 to-pink-300 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-pink-600 to-pink-400 bg-clip-text text-transparent mb-8">
          上传教育资源
        </h1>

        <div className="grid md:grid-cols-2 gap-8">
          {/* 左侧 - 文件上传和预览 */}
          <div className="space-y-6">
            {/* 封面图片上传 */}
            <div className="border-2 border-dashed border-pink-200 rounded-xl p-6 text-center hover:border-pink-400 transition-colors">
              <input
                type="file"
                onChange={handleCoverImageChange}
                className="hidden"
                id="cover-upload"
                accept="image/*"
              />
              <label htmlFor="cover-upload" className="cursor-pointer">
                {coverPreview ? (
                  <img src={coverPreview} alt="封面预览" className="max-h-48 mx-auto rounded-lg" />
                ) : (
                  <div className="flex flex-col items-center">
                    <DocumentTextIcon className="h-16 w-16 text-pink-400" />
                    <p className="mt-2 text-pink-600">点击上传封面图片</p>
                    <p className="mt-1 text-xs text-pink-400">支持JPG、PNG等图片格式</p>
                  </div>
                )}
              </label>
            </div>

            <div className="border-2 border-dashed border-pink-200 rounded-xl p-6 text-center hover:border-pink-400 transition-colors">
              <input
                type="file"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
                // 支持更多文件类型
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.jpg,.jpeg,.png,.gif,.mp4,.mp3,.zip,.rar"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                {preview ? (
                  file?.type.startsWith('image/') ? (
                    <img src={preview} alt="预览" className="max-h-48 mx-auto rounded-lg" />
                  ) : (
                    <div className="flex flex-col items-center">
                      <DocumentTextIcon className="h-16 w-16 text-pink-400" />
                      <p className="mt-2 text-pink-600">{preview}</p>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center">
                    <DocumentTextIcon className="h-16 w-16 text-pink-400" />
                    <p className="mt-2 text-pink-600">点击上传教育资源文件</p>
                    <p className="mt-1 text-xs text-pink-400">支持PDF、Word、PPT、Excel、图片、音视频等格式</p>
                  </div>
                )}
              </label>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="资源名称"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-pink-100 focus:border-pink-300 focus:ring-2 focus:ring-pink-200 outline-none"
              />
              <textarea
                placeholder="资源描述"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-pink-100 focus:border-pink-300 focus:ring-2 focus:ring-pink-200 outline-none resize-none"
              />
            </div>
          </div>

          {/* 右侧 - 资源信息 */}
          <div className="space-y-6">
            <div className="space-y-4">
              <select
                value={resourceType}
                onChange={e => setResourceType(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-pink-100 focus:border-pink-300 focus:ring-2 focus:ring-pink-200 outline-none"
              >
                <option value="">选择资源类型</option>
                {resourceTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>

              <select
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-pink-100 focus:border-pink-300 focus:ring-2 focus:ring-pink-200 outline-none"
              >
                <option value="">选择学科</option>
                {subjects.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>

              <select
                value={educationLevel}
                onChange={e => setEducationLevel(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-pink-100 focus:border-pink-300 focus:ring-2 focus:ring-pink-200 outline-none"
              >
                <option value="">选择教育阶段</option>
                {educationLevels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>

              <div className="space-y-2">
                <label className="block text-pink-600 font-medium">版税 (0-10%)</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={royaltyFee}
                  onChange={e => setRoyaltyFee(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-pink-100 focus:border-pink-300 focus:ring-2 focus:ring-pink-200 outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleMintResource}
              disabled={isProcessing}
              className={`w-full py-4 rounded-xl text-white font-semibold transition-all duration-300 ${
                isProcessing 
                  ? "bg-pink-300 cursor-not-allowed" 
                  : "bg-pink-500 hover:bg-pink-600 hover:shadow-lg hover:shadow-pink-500/30"
              }`}
            >
              {isProcessing ? "创建中..." : "创建教育资源"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateNft;
