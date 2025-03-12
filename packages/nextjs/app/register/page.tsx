"use client";

import { useState } from "react";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { message } from "antd"; // 替换原来的 notification
import { useRouter } from "next/navigation";

// Pinata 配置
const PINATA_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI0YzA5Zjc2Yy1hMGU1LTQzYWMtYjdlMi1iNTQwYTEwYjJiNjkiLCJlbWFpbCI6IjI4MjQ4OTgzMjJAcXEuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6IjY0ZGQxNmFjYTQwYTY2NmY2ZmM5Iiwic2NvcGVkS2V5U2VjcmV0IjoiNzU5NWQxNjljNzYyNjc3YzEzZmIxOTMwNzBlOTExMDM4ZGIyZGExZDZlMjliOTJlNTliZmIwMDg4ZWI1ZmNiNyIsImV4cCI6MTc3MzA2ODI0Mn0.O5n6iTF9XlLPf5f7IhgOlKLuOAtuRaS5DtKAkoLZAaE";

// 上传图片到 IPFS 的函数
const uploadToPinata = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PINATA_JWT}`,
    },
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`上传失败: ${res.statusText}`);
  }

  const data = await res.json();
  return data.IpfsHash;
};

const RegisterPage: React.FC = () => {
  const { writeContractAsync } = useScaffoldWriteContract("YourCollectible");
  const router = useRouter();
  const [messageApi, contextHolder] = message.useMessage(); // 添加 message 实例

  // 页面状态管理
  const [userName, setUserName] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [bio, setBio] = useState<string>("");
  const [avatar, setAvatar] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string>("");

  // 处理图片上传
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        messageApi.loading("正在上传图片...");
        
        // 显示本地预览
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          setPreviewUrl(base64String);
        };
        reader.readAsDataURL(file);

        // 上传到IPFS
        const ipfsHash = await uploadToPinata(file);
        const imageUri = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
        setAvatar(imageUri);
        messageApi.success("图片上传成功！");
      } catch (error) {
        messageApi.error("图片上传失败，请重试");
        console.error('上传错误:', error);
      }
    }
  };

  // 处理注册逻辑
  const handleRegister = async () => {
    if (!userName || !password || !bio || !confirmPassword || !avatar) {
      messageApi.error("所有字段均为必填项");
      return;
    }

    if (password !== confirmPassword) {
      messageApi.error("密码和确认密码不匹配");
      return;
    }

    try {
      messageApi.loading("正在注册用户...");

      // 调用智能合约的 registerUser 方法
      await writeContractAsync({
        functionName: "registerUser",
        args: [userName, password, avatar, bio],
      });

      messageApi.success("用户注册成功！");
      router.push("/login");
    } catch (error) {
      messageApi.error("注册失败");
      console.error(error);
    }
  };

  return (
    <>
      {contextHolder}
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-pink-200 to-pink-300 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 space-y-6 border border-pink-100">
          <div className="text-center">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-pink-400 bg-clip-text text-transparent">
              用户注册
            </h2>
            <p className="mt-2 text-sm text-pink-600">欢迎加入我们的平台</p>
          </div>

          {/* 头像上传区域 */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative group">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="头像预览"
                  className="w-24 h-24 rounded-full object-cover ring-4 ring-pink-200 group-hover:ring-pink-300 transition-all duration-300"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-pink-50 flex items-center justify-center ring-4 ring-pink-200">
                  <svg className="h-12 w-12 text-pink-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
              <label className="absolute bottom-0 right-0 bg-pink-500 hover:bg-pink-600 text-white rounded-full p-2 cursor-pointer shadow-lg transform transition-all duration-300 hover:scale-110">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* 表单输入区域 */}
          <div className="space-y-4">
            <input
              type="text"
              placeholder="请输入用户名"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-pink-50/50 border border-pink-100 focus:border-pink-300 focus:ring-2 focus:ring-pink-200 outline-none transition-all duration-300"
            />

            <input
              type="password"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-pink-50/50 border border-pink-100 focus:border-pink-300 focus:ring-2 focus:ring-pink-200 outline-none transition-all duration-300"
            />

            <input
              type="password"
              placeholder="确认密码"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-pink-50/50 border border-pink-100 focus:border-pink-300 focus:ring-2 focus:ring-pink-200 outline-none transition-all duration-300"
            />

            <textarea
              placeholder="请输入个人简介"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-lg bg-pink-50/50 border border-pink-100 focus:border-pink-300 focus:ring-2 focus:ring-pink-200 outline-none transition-all duration-300 resize-none"
            />

            <button
              onClick={handleRegister}
              className="w-full py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg font-medium shadow-lg hover:shadow-pink-500/30 transform hover:-translate-y-0.5 transition-all duration-300"
            >
              立即注册
            </button>

            <div className="text-center pt-4">
              <p className="text-pink-600">
                已有账号？
                <a href="/login" className="ml-2 text-pink-500 hover:text-pink-700 font-medium transition-colors duration-300">
                  立即登录
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RegisterPage;