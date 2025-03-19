"use client";

import { useState, useCallback } from "react";
import { notification } from "~~/utils/scaffold-eth";

interface DownloadButtonProps {
  url: string;              // IPFS资源链接
  fileName?: string;        // 文件名
  fileType?: string;        // 文件类型
  fileSize?: number;        // 文件大小
  onDownloadSuccess?: () => void; // 下载成功回调
}

export const DownloadButton = ({
  url,
  fileName = "教育资源",
  fileType = "",
  fileSize,
  onDownloadSuccess
}: DownloadButtonProps) => {
  const [isDownloading, setIsDownloading] = useState(false);

  // 格式化文件大小
  const formatFileSize = useCallback((bytes?: number) => {
    if (!bytes) return "未知大小";
    const KB = 1024;
    const MB = KB * 1024;
    if (bytes < KB) {
      return `${bytes} B`;
    } else if (bytes < MB) {
      return `${(bytes / KB).toFixed(2)} KB`;
    } else {
      return `${(bytes / MB).toFixed(2)} MB`;
    }
  }, []);

  // 获取合适的文件后缀名
  const getExtension = useCallback((type?: string, url?: string) => {
    if (type) {
      const match = type.match(/\/(.*?)$/);
      if (match && match[1]) {
        return match[1] === "jpeg" ? "jpg" : match[1];
      }
    }
    
    // 尝试从URL获取
    if (url) {
      const urlParts = url.split('.');
      if (urlParts.length > 1) {
        return urlParts[urlParts.length - 1];
      }
    }
    
    return "";
  }, []);

  const handleDownload = useCallback(async () => {
    if (isDownloading) return;
    
    setIsDownloading(true);
    const notificationId = notification.loading("正在下载资源...");
    
    try {
      // 处理IPFS链接
      let fileUrl = url;
      if (url.startsWith("ipfs://")) {
        fileUrl = url.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/");
      }
      
      // 获取文件扩展名
      const extension = getExtension(fileType, url);
      const fullFileName = extension ? `${fileName}.${extension}` : fileName;
      
      // 下载文件
      const response = await fetch(fileUrl);
      
      if (!response.ok) {
        throw new Error(`下载失败: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      // 创建一个临时链接并点击
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = fullFileName;
      document.body.appendChild(a);
      a.click();
      
      // 清理
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
      
      notification.remove(notificationId);
      notification.success("下载成功！");
      
      // 调用成功回调
      if (onDownloadSuccess) {
        onDownloadSuccess();
      }
    } catch (error) {
      console.error("下载失败:", error);
      notification.remove(notificationId);
      notification.error("下载失败，请稍后重试");
    } finally {
      setIsDownloading(false);
    }
  }, [url, fileName, fileType, onDownloadSuccess, isDownloading, getExtension]);

  return (
    <button
      onClick={handleDownload}
      disabled={isDownloading}
      className={`btn btn-sm w-full ${
        isDownloading 
          ? "bg-gray-400 cursor-not-allowed" 
          : "bg-pink-500 hover:bg-pink-600 text-white border-pink-500"
      }`}
    >
      {isDownloading ? "下载中..." : `下载资源 ${fileSize ? `(${formatFileSize(fileSize)})` : ""}`}
    </button>
  );
}; 