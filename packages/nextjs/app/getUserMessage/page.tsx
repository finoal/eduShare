"use client";

import { useEffect, useState, useRef } from "react";
import { useScaffoldContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { useAccount } from "wagmi";
import { notification } from "~~/utils/scaffold-eth";
import { useRouter } from "next/navigation";
import { UserIcon, StarIcon, PencilIcon, KeyIcon, PhotoIcon } from "@heroicons/react/24/outline";
import axios from "axios";

// Pinata API配置
const PINATA_API_KEY = "64dd16aca40a666f6fc9";
const PINATA_SECRET_API_KEY = "7595d169c762677c13fb193070e911038db2da1d6e29b92e59bfb0088eb5fcb7";
const PINATA_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI0YzA5Zjc2Yy1hMGU1LTQzYWMtYjdlMi1iNTQwYTEwYjJiNjkiLCJlbWFpbCI6IjI4MjQ4OTgzMjJAcXEuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6IjY0ZGQxNmFjYTQwYTY2NmY2ZmM5Iiwic2NvcGVkS2V5U2VjcmV0IjoiNzU5NWQxNjljNzYyNjc3YzEzZmIxOTMwNzBlOTExMDM4ZGIyZGExZDZlMjliOTJlNTliZmIwMDg4ZWI1ZmNiNyIsImV4cCI6MTc3MzA2ODI0Mn0.O5n6iTF9XlLPf5f7IhgOlKLuOAtuRaS5DtKAkoLZAaE";
const PINATA_ENDPOINT = "https://api.pinata.cloud/pinning/pinFileToIPFS";

interface UserProfile {
  name: string;
  bio: string;
  integral: number;
  avatar: string;
}

const UserProfilePage = () => {
  const { address: connectedAddress } = useAccount();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchCompleted, setFetchCompleted] = useState<boolean>(false);
  const router = useRouter();
  
  // 修改个人信息相关状态
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [newAvatar, setNewAvatar] = useState<string>("");
  const [newBio, setNewBio] = useState<string>("");
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // 修改密码相关状态
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);
  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  const { data: yourCollectibleContract } = useScaffoldContract({
    contractName: "YourCollectible",
  });
  
  const { writeContractAsync } = useScaffoldWriteContract("YourCollectible");

  const fetchUserProfile = async () => {
    if (!connectedAddress || !yourCollectibleContract || fetchCompleted) return;

    setLoading(true);
    try {
      const [name, bio, integral, avatar] = await yourCollectibleContract.read.getUserMessage([connectedAddress]);

      setUserProfile({
        name,
        bio,
        integral: Number(integral),
        avatar
      });
      
      // 初始化编辑表单的值
      setNewAvatar(avatar);
      setNewBio(bio);
      setPreviewImage(avatar);

      setFetchCompleted(true);
    } catch (error) {
      console.error("获取用户信息失败", error);
      notification.error("无法获取用户信息！");
    } finally {
      setLoading(false);
    }
  };
  
  // 上传图片到IPFS
  const uploadToIPFS = async (file: File) => {
    if (!file) return;
    
    setUploadingImage(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const metadata = JSON.stringify({
        name: `${connectedAddress}-avatar-${Date.now()}`,
      });
      formData.append('pinataMetadata', metadata);
      
      const options = JSON.stringify({
        cidVersion: 0,
      });
      formData.append('pinataOptions', options);
      
      const response = await axios.post(PINATA_ENDPOINT, formData, {
        headers: {
          'Content-Type': `multipart/form-data;`,
          'pinata_api_key': PINATA_API_KEY,
          'pinata_secret_api_key': PINATA_SECRET_API_KEY,
          'Authorization': `Bearer ${PINATA_JWT}`
        }
      });
      
      if (response.data.IpfsHash) {
        const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`;
        setNewAvatar(ipfsUrl);
        setPreviewImage(ipfsUrl);
        notification.success("头像上传成功！");
        return ipfsUrl;
      }
    } catch (error) {
      console.error("上传图片到IPFS失败:", error);
      notification.error("上传图片失败，请重试！");
    } finally {
      setUploadingImage(false);
    }
  };
  
  // 处理文件选择
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      notification.error("请选择图片文件！");
      return;
    }
    
    // 验证文件大小（限制为5MB）
    if (file.size > 5 * 1024 * 1024) {
      notification.error("图片大小不能超过5MB！");
      return;
    }
    
    // 创建本地预览
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPreviewImage(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
    
    // 上传到IPFS
    await uploadToIPFS(file);
  };
  
  // 触发文件选择对话框
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };
  
  // 更新个人信息
  const updateUserInfo = async () => {
    if (!connectedAddress || !yourCollectibleContract) return;
    
    try {
      await writeContractAsync({
        functionName: "updateUserInfo",
        args: [newAvatar, newBio],
      });
      
      notification.success("个人信息更新成功！");
      
      // 更新本地状态
      setUserProfile(prev => prev ? {
        ...prev,
        avatar: newAvatar,
        bio: newBio
      } : null);
      
      // 关闭编辑模式
      setIsEditingProfile(false);
      
      // 重新获取用户信息
      setFetchCompleted(false);
    } catch (error) {
      console.error("更新个人信息失败", error);
      notification.error("更新个人信息失败！");
    }
  };
  
  // 修改密码
  const changePassword = async () => {
    if (!connectedAddress || !yourCollectibleContract) return;
    
    if (newPassword !== confirmPassword) {
      notification.error("两次输入的新密码不一致！");
      return;
    }
    
    try {
      await writeContractAsync({
        functionName: "updatePassword",
        args: [newPassword, currentPassword],
      });
      
      notification.success("密码修改成功！");
      
      // 清空表单并关闭
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setIsChangingPassword(false);
    } catch (error) {
      console.error("修改密码失败", error);
      notification.error("修改密码失败，请检查当前密码是否正确！");
    }
  };

  useEffect(() => {
    if (connectedAddress && yourCollectibleContract && !fetchCompleted) {
      fetchUserProfile();
    }
  }, [connectedAddress, yourCollectibleContract, fetchCompleted]);

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-pink-100 via-pink-200 to-pink-300">
        <div className="bg-white/80 backdrop-blur-sm rounded-lg p-8 shadow-xl">
          <span className="loading loading-spinner loading-lg text-pink-500"></span>
        </div>
      </div>
    );

  if (!userProfile)
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-pink-100 via-pink-200 to-pink-300">
        <div className="bg-white/80 backdrop-blur-sm rounded-lg p-8 shadow-xl border border-pink-100">
          <p className="text-xl text-pink-600">暂无个人信息</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-pink-200 to-pink-300 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        {/* 头部导航 */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-pink-700">个人信息</h1>
          <div className="flex space-x-2">
            <button 
              onClick={() => setIsChangingPassword(true)}
              className="flex items-center px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
            >
              <KeyIcon className="h-5 w-5 mr-1" />
              修改密码
            </button>
            <button 
              onClick={() => setIsEditingProfile(true)}
              className="flex items-center px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
            >
              <PencilIcon className="h-5 w-5 mr-1" />
              编辑资料
            </button>
          </div>
        </div>

        {/* 个人信息卡片 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-xl border border-pink-100">
          {/* 头像和基本信息 */}
          <div className="flex items-center space-x-6 mb-8">
            {userProfile.avatar ? (
              <img 
                src={userProfile.avatar} 
                alt={userProfile.name}
                className="w-24 h-24 rounded-full object-cover ring-4 ring-pink-200"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-pink-50 flex items-center justify-center ring-4 ring-pink-200">
                <UserIcon className="w-12 h-12 text-pink-300" />
              </div>
            )}
            
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-pink-700 mb-2">
                {userProfile.name || "未设置用户名"}
              </h2>
              <div 
                className="flex items-center gap-2 text-pink-500 cursor-pointer hover:text-pink-600 transition-colors"
                onClick={() => router.push('/integral')}
              >
                <StarIcon className="h-5 w-5" />
                <span className="font-medium">积分: {userProfile.integral}</span>
              </div>
            </div>
          </div>

          {/* 个人简介 */}
          <div className="bg-pink-50 rounded-xl p-4 mb-6">
            <h3 className="text-lg font-semibold text-pink-700 mb-2">个人简介</h3>
            <p className="text-pink-600 whitespace-pre-wrap">
              {userProfile.bio || "暂无个人简介"}
            </p>
          </div>

          {/* 钱包地址 */}
          <div className="bg-pink-50 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-pink-700 mb-2">钱包地址</h3>
            <p className="text-pink-600 font-mono break-all">
              {connectedAddress}
            </p>
          </div>
        </div>
      </div>
      
      {/* 修改个人信息模态框 */}
      {isEditingProfile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-pink-700 mb-4">编辑个人资料</h2>
            
            <div className="space-y-4">
              {/* 头像上传区域 */}
              <div>
                <label className="block text-pink-700 mb-2">头像</label>
                <div className="flex flex-col items-center">
                  {/* 预览区域 */}
                  <div className="mb-4 relative">
                    {previewImage ? (
                      <img 
                        src={previewImage} 
                        alt="头像预览" 
                        className="w-32 h-32 rounded-full object-cover border-4 border-pink-200"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-pink-50 flex items-center justify-center border-4 border-pink-200">
                        <UserIcon className="w-16 h-16 text-pink-300" />
                      </div>
                    )}
                    
                    {/* 上传按钮 */}
                    <button
                      onClick={triggerFileInput}
                      disabled={uploadingImage}
                      className="absolute bottom-0 right-0 bg-pink-500 text-white p-2 rounded-full hover:bg-pink-600 transition-colors"
                    >
                      {uploadingImage ? (
                        <span className="loading loading-spinner loading-xs"></span>
                      ) : (
                        <PhotoIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  
                  {/* 隐藏的文件输入 */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  
                  <button
                    onClick={triggerFileInput}
                    disabled={uploadingImage}
                    className="text-pink-600 text-sm hover:text-pink-700"
                  >
                    {uploadingImage ? "上传中..." : "点击上传新头像"}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-pink-700 mb-2">个人简介</label>
                <textarea 
                  value={newBio} 
                  onChange={(e) => setNewBio(e.target.value)}
                  className="w-full p-2 border border-pink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="请输入个人简介"
                  rows={4}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <button 
                onClick={() => setIsEditingProfile(false)}
                className="px-4 py-2 border border-pink-300 text-pink-700 rounded-lg hover:bg-pink-50"
              >
                取消
              </button>
              <button 
                onClick={updateUserInfo}
                className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
                disabled={uploadingImage}
              >
                {uploadingImage ? "请等待图片上传完成..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 修改密码模态框 */}
      {isChangingPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-pink-700 mb-4">修改密码</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-pink-700 mb-2">当前密码</label>
                <input 
                  type="password" 
                  value={currentPassword} 
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full p-2 border border-pink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="请输入当前密码"
                />
              </div>
              
              <div>
                <label className="block text-pink-700 mb-2">新密码</label>
                <input 
                  type="password" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-2 border border-pink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="请输入新密码"
                />
              </div>
              
              <div>
                <label className="block text-pink-700 mb-2">确认新密码</label>
                <input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-2 border border-pink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="请再次输入新密码"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <button 
                onClick={() => setIsChangingPassword(false)}
                className="px-4 py-2 border border-pink-300 text-pink-700 rounded-lg hover:bg-pink-50"
              >
                取消
              </button>
              <button 
                onClick={changePassword}
                className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
              >
                确认修改
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfilePage;
