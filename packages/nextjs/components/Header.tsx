"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { UserIcon, UserCircleIcon, Bars3Icon, ShoppingCartIcon, DocumentTextIcon,XCircleIcon, ViewColumnsIcon, VideoCameraIcon, TableCellsIcon, ChartBarIcon } from "@heroicons/react/24/outline";
import { FaucetButton, RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useAuth } from "./AuthContext";

type HeaderMenuLink = {
  label: string;
  href?: string; // 可选
  condition?: boolean; // 判断菜单项是否显示的条件
  icon?: React.ReactNode;
  onClick?: () => void; // 点击菜单项时的回调函数
};

export const Header = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false); // 管理侧边菜单是否打开
  const { isAuthenticated, isAccrediting, setIsAuthenticated, setIsAccrediting } = useAuth(); // 获取认证状态和退出登录函数
  const burgerMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname(); // 获取当前路径，用于高亮显示菜单
  const router = useRouter(); // 页面跳转

  const logout = () => {
    setIsAuthenticated(false); // 清除登录状态
    setIsAccrediting(false); // 如果有 `isAccrediting` 状态，也需要清除
    router.push("/"); // 强制跳转到主页
  };

  const menuLinks: HeaderMenuLink[] = isAuthenticated
    ? [
        {
          label: "我的资源",
          href: "/myEdus",
          condition: isAuthenticated && !isAccrediting,
          icon: <ViewColumnsIcon className="h-4 w-4" />,
        },
        {
          label: "我的购买资源",
          href: "/myPurchases",
          condition: isAuthenticated && !isAccrediting,
          icon: <TableCellsIcon className="h-4 w-4" />,
        },
        {
          label: "上传教育资源",
          href: "/createNft",
          condition: isAuthenticated && !isAccrediting,
          icon: <VideoCameraIcon className="h-4 w-4" />,
        },
        {
          label: "区块链分析",
          href: "/blockchainAnalytics",
          condition: isAuthenticated && !isAccrediting,
          icon: <ChartBarIcon className="h-4 w-4" />,
        },
        {
          label: "个人信息",
          href: "/getUserMessage",
          condition: isAuthenticated && !isAccrediting,
          icon: <UserIcon className="h-4 w-4" />,
        },
        {
          label: "资源广场",
          href: "/eduMessage",
          condition: isAuthenticated && !isAccrediting,
          icon: <ShoppingCartIcon className="h-4 w-4" />,
        },
        {
          label: "注销", // 退出登录
          href: "", // 避免 href 冲突，全部由 onClick 控制
          condition: isAuthenticated, // 登录状态时显示
          icon: <XCircleIcon className="h-4 w-4" />,
          onClick: logout, // 调用注销逻辑
        },
        {
          label: "交易记录",
          href: "/transfers",
          condition: isAuthenticated,
          icon: <DocumentTextIcon className="h-4 w-4" />,
        },
      ]
    : [
        {
          label: "注册",
          href: "/register",
          condition: !isAuthenticated,
          icon: <UserIcon className="h-4 w-4" />,
        },
        {
          label: "登录",
          href: "/login",
          condition: !isAuthenticated,
          icon: <UserCircleIcon className="h-4 w-4" />,
        },
        {
          label: "debug", // 用于调试
          href: "/debug",
          condition: !isAuthenticated,
          icon: <UserIcon className="h-4 w-4" />,
        },
      ];

  const HeaderMenuLinks = () => (
    <>
      {menuLinks.map(({ label, href, condition, icon, onClick }) => {
        const isActive = pathname === href;
        if (condition !== undefined && !condition) return null;
        return (
          <li key={label}>
            {href ? (
              <Link
                href={href}
                passHref
                className={`${
                  isActive ? "bg-pink-200 shadow-md" : ""
                } hover:bg-pink-100 hover:shadow-md focus:!bg-pink-200 active:!text-pink-800 py-1.5 px-3 text-sm rounded-full gap-2 grid grid-flow-col text-pink-700`}
              >
                {icon}
                <span>{label}</span>
              </Link>
            ) : (
              <button
                onClick={onClick}
                className="hover:bg-pink-100 hover:shadow-md focus:!bg-pink-200 py-1.5 px-3 text-sm rounded-full gap-2 grid grid-flow-col text-pink-700"
              >
                {icon}
                <span>{label}</span>
              </button>
            )}
          </li>
        );
      })}
    </>
  );

  return (
    <div className="sticky xl:static top-0 navbar bg-pink-100 min-h-0 flex-shrink-0 justify-between z-20 shadow-md shadow-pink-200 px-0 sm:px-2">
      <div className="navbar-start w-auto xl:w-1/2">
        <div className="xl:hidden dropdown" ref={burgerMenuRef}>
          <label
            tabIndex={0}
            className={`ml-1 btn btn-ghost ${isDrawerOpen ? "hover:bg-pink-200" : "hover:bg-transparent"}`}
            onClick={() => setIsDrawerOpen(prev => !prev)}
          >
            <Bars3Icon className="h-1/2" />
          </label>
          {isDrawerOpen && (
            <ul
              tabIndex={0}
              className="menu menu-compact dropdown-content mt-3 p-2 shadow bg-white rounded-box w-52"
              onClick={() => setIsDrawerOpen(false)}
            >
              <HeaderMenuLinks />
            </ul>
          )}
        </div>
        <Link href="/" passHref className="hidden xl:flex items-center gap-1 ml-4 mr-6 shrink-0">
          <div className="flex relative w-10 h-10">
            <Image alt="Logo" className="cursor-pointer" fill src="/logo.svg" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold leading-tight text-pink-800">教育平台</span>
            <span className="text-xs text-pink-600">共享学习资源</span>
          </div>
        </Link>
        <ul className="hidden xl:flex xl:flex-nowrap menu menu-horizontal px-1 gap-2">
          <HeaderMenuLinks />
        </ul>
      </div>
      <div className="navbar-end flex-grow mr-4">
        <RainbowKitCustomConnectButton />
        <FaucetButton />
      </div>
    </div>
  );
};
