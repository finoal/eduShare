"use client";

import { memo } from "react";
import { MyPurchases } from "./_components/MyPurchases";
import type { NextPage } from "next";

// 使用memo包装组件，避免不必要的重新渲染
const MyPurchasesPage = memo(() => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-100 to-white">
      <div className="flex items-center flex-col pt-10">
        <div className="px-5 mb-6">
          <h1 className="text-center">
            <span className="block text-4xl font-bold text-pink-700">我的购买资源</span>
            <span className="block text-xl text-pink-500 mt-2">查看、使用和评价您购买的教育内容</span>
          </h1>
        </div>
      </div>
      <MyPurchases />
    </div>
  );
});

// 添加显示名称，便于调试
MyPurchasesPage.displayName = "MyPurchasesPage";

const MyPurchasesNextPage: NextPage = MyPurchasesPage;

export default MyPurchasesNextPage; 