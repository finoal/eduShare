import { PublicClient } from 'viem';
import { notification } from '~~/utils/scaffold-eth';

// 交易数据类型 - 修改blockTimestamp类型为number
export interface BlockchainTransactionData {
  blockNumber: string;
  blockTimestamp: number; // 改为number类型，直接存储原始时间戳
  transactionHash: string;
  fromAddress: string;
  toAddress: string;
  gas: number;
  operationDescription: string;
}

/**
 * 保存区块链交易数据到数据库
 * @param transactionHash - 交易哈希
 * @param fromAddress - 发送地址
 * @param publicClient - wagmi公共客户端
 * @param operationDescription - 操作描述
 * @returns 保存是否成功
 */
export const saveBlockchainTransaction = async (
  transactionHash: string,
  fromAddress: string,
  publicClient: PublicClient,
  operationDescription: string
): Promise<boolean> => {
  try {
    // 获取交易收据
    const receipt = await publicClient.getTransactionReceipt({
      hash: transactionHash as `0x${string}`,
    });

    if (!receipt) {
      console.error('获取交易收据失败');
      return false;
    }

    // 获取区块信息以获取时间戳
    const blockNumber = receipt.blockNumber;
    const block = await publicClient.getBlock({
      blockNumber: blockNumber,
    });

    // 准备交易数据 - 直接使用原始时间戳
    const transactionData: BlockchainTransactionData = {
      blockNumber: blockNumber.toString(),
      blockTimestamp: Number(block.timestamp), // 直接使用数字类型的时间戳
      transactionHash,
      fromAddress,
      toAddress: receipt.to || '',
      gas: Number(receipt.gasUsed.toString()) || 0,
      operationDescription
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
      console.log('区块链数据记录已保存到数据库');
      return true;
    } else {
      console.error('保存区块链数据记录失败:', result.message);
      return false;
    }
  } catch (error) {
    console.error('保存区块链数据记录时出错:', error);
    return false;
  }
};

/**
 * 处理合约交易并保存区块数据
 * @param txHash - 交易哈希
 * @param fromAddress - 发送地址
 * @param publicClient - wagmi公共客户端
 * @param operationDescription - 操作描述
 * @param showNotification - 是否显示通知
 */
export const handleContractCallWithBlockData = async (
  txHash: string,
  fromAddress: string,
  publicClient: PublicClient,
  operationDescription: string,
  showNotification = true
): Promise<void> => {
  try {
    // 保存交易数据
    const saved = await saveBlockchainTransaction(
      txHash,
      fromAddress,
      publicClient,
      operationDescription
    );

    if (saved && showNotification) {
      notification.success("区块链数据记录已保存");
    } else if (!saved && showNotification) {
      notification.warning("区块链数据记录保存失败，但不影响交易执行");
    }
  } catch (error) {
    console.error("保存区块链数据记录失败:", error);
    if (showNotification) {
      notification.warning("区块链数据记录保存失败，但不影响交易执行");
    }
  }
}; 