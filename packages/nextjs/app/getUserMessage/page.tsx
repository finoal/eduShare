"use client";

import { useEffect, useState } from "react";
import { useScaffoldContract } from "~~/hooks/scaffold-eth";
import { useAccount } from "wagmi";
import { notification } from "~~/utils/scaffold-eth";
import { useRouter } from "next/navigation";
import { UserIcon, StarIcon, ChevronLeftIcon } from "@heroicons/react/24/outline";

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

  const { data: yourCollectibleContract } = useScaffoldContract({
    contractName: "YourCollectible",
  });

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

      setFetchCompleted(true);
    } catch (error) {
      console.error("获取用户信息失败", error);
      notification.error("无法获取用户信息！");
    } finally {
      setLoading(false);
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
          <button 
            onClick={() => window.history.back()}
            className="flex items-center px-4 py-2 text-pink-600 hover:text-pink-700 transition-colors"
          >
            <ChevronLeftIcon className="h-5 w-5 mr-1" />
            返回
          </button>
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
    </div>
  );
};

export default UserProfilePage;
