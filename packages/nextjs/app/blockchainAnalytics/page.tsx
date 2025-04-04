"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  AreaChart, Area, BarChart, Bar
} from "recharts";
import { Table, Input, Button, message, Alert, Empty, Typography, Tag, Statistic, Segmented } from "antd";
import { Card } from "antd";
import { 
  DatabaseOutlined, ReloadOutlined, LineChartOutlined, 
  UserOutlined, FireOutlined, ThunderboltOutlined, CheckCircleOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import 'dayjs/locale/zh-cn';

// 配置dayjs使用中文
dayjs.locale('zh-cn');

// API基础URL配置
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// 定义粉色系主题色 - 增强粉色调
const themeColors = {
  primary: '#eb2f96', // 主粉色
  primaryLight: '#f759ab',
  primaryLighter: '#ffa6d0',
  primaryPale: '#fff0f6', // 极浅粉色，用于背景
  primaryDark: '#c41d7f',
  secondary: '#722ed1', // 紫色作为辅助色
  secondaryLight: '#9254de',
  accent: '#13c2c2', // 蓝绿色作为点缀
  accentLight: '#5cdbd3',
  success: '#52c41a',
  warning: '#faad14',
  error: '#f5222d',
  background: '#fff0f6', // 确保背景使用浅粉色
  cardBackground: '#ffffff',
  cardBorder: '#ffadd2', // 卡片边框粉色
  chartColors: ['#eb2f96', '#f759ab', '#ff85c0', '#ffa6d0', '#c41d7f', '#722ed1', '#9254de']
};

// 定义数据结构类型
interface TransactionData {
  id: number;
  block_number: number;
  block_timestamp: number;
  transaction_hash?: string;
  tx_hash?: string;
  from_address: string;
  to_address: string;
  gas: string;
  status: string;
  operation_description: string;
  created_at: string;
}

// 图表数据结构
interface ChartData {
  date: string;
  [key: string]: string | number;
}

// 统计数据结构
interface StatsSummary {
  totalTransactions: number;
  activeAddresses: number;
  avgGasUsed: number;
  successRate: number;
}

// 主组件
const BlockchainAnalytics: React.FC = () => {
  // 状态变量
  const [transactionData, setTransactionData] = useState<TransactionData[]>([]);
  const [activityChartData, setActivityChartData] = useState<ChartData[]>([]);
  const [gasChartData, setGasChartData] = useState<ChartData[]>([]);
  const [userActivityData, setUserActivityData] = useState<ChartData[]>([]);
  const [statsSummary, setStatsSummary] = useState<StatsSummary>({
    totalTransactions: 0,
    activeAddresses: 0,
    avgGasUsed: 0,
    successRate: 0
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [timeRange, setTimeRange] = useState<string>('7天');
  
  // 获取交易记录数据
  const fetchTransactionData = async () => {
    setLoading(true);
    setApiError(null);
    try {
      message.loading({ content: '正在获取交易数据...', key: 'txDataLoading' });
      
      // 尝试多个可能的API路径
      const apiUrls = [
        `${API_BASE_URL}/api/blockchain/transactions?limit=100`,
        `/api/blockchain/transactions?limit=100`,
        `${API_BASE_URL}/getBlockchainTransactions?limit=100`,
        `/getBlockchainTransactions?limit=100`
      ];
      
      console.log('尝试以下API端点获取交易数据:');
      apiUrls.forEach(url => console.log(`- ${url}`));
      
      let response = null;
      let responseError = null;
      
      // 尝试所有可能的API URL
      for (const url of apiUrls) {
        try {
          console.log(`尝试获取交易数据: ${url}`);
          const resp = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            }
          });
          
          console.log(`API响应状态: ${resp.status} ${resp.statusText}`);
          
          if (resp.ok) {
            response = resp;
            console.log('成功获取API响应');
            break;
          } else {
            console.warn(`API响应非成功状态: ${resp.status}`);
            // 尝试读取错误详情
            try {
              const errorData = await resp.json();
              console.warn('API错误详情:', errorData);
            } catch (jsonError) {
              console.warn('无法解析错误响应:', jsonError);
            }
          }
        } catch (err) {
          responseError = err;
          console.error(`交易API请求失败 ${url}:`, err);
        }
      }
      
      if (!response) {
        throw new Error('所有交易API请求均失败, 最后错误: ' + responseError);
      }
      
      const data = await response.json();
      console.log('获取到的交易数据:', data);
      
      let transactions: TransactionData[] = [];
      
      if (Array.isArray(data)) {
        transactions = data;
        console.log(`成功获取${data.length}条交易记录`);
        setTransactionData(data);
        message.success({ content: `已加载${data.length}条交易记录`, key: 'txDataLoading' });
      } else if (data.transactions && Array.isArray(data.transactions)) {
        transactions = data.transactions;
        console.log(`成功获取${data.transactions.length}条交易记录`);
        setTransactionData(data.transactions);
        message.success({ content: `已加载${data.transactions.length}条交易记录`, key: 'txDataLoading' });
      } else {
        console.warn('交易数据格式不正确:', data);
        setTransactionData([]);
        message.warning({ content: '交易数据格式不正确，无法显示交易记录', key: 'txDataLoading' });
      }
      
      // 生成图表数据
      generateChartData(transactions);
      
      // 计算统计摘要
      calculateStatsSummary(transactions);
      
    } catch (error) {
      console.error('获取交易数据失败:', error);
      message.error({ content: '获取交易数据失败，请检查服务器', key: 'txDataLoading' });
      setApiError(`交易API错误: ${error instanceof Error ? error.message : String(error)}`);
      setTransactionData([]);
      
      // 生成模拟数据用于展示
      generateMockChartData();
    } finally {
      setLoading(false);
    }
  };
  
  // 计算统计摘要
  const calculateStatsSummary = (transactions: TransactionData[]) => {
    if (!transactions || transactions.length === 0) {
      setStatsSummary({
        totalTransactions: 0,
        activeAddresses: 0,
        avgGasUsed: 0,
        successRate: 0
      });
      return;
    }
    
    // 计算唯一地址数
    const uniqueAddresses = new Set<string>();
    transactions.forEach(tx => {
      if (tx.from_address) uniqueAddresses.add(tx.from_address);
      if (tx.to_address) uniqueAddresses.add(tx.to_address);
    });
    
    // 计算平均Gas用量
    const totalGas = transactions.reduce((sum, tx) => sum + (parseInt(tx.gas) || 0), 0);
    const avgGas = Math.round(totalGas / transactions.length);
    
    // 计算成功率
    const successfulTxs = transactions.filter(tx => tx.status === 'success').length;
    const successRate = (successfulTxs / transactions.length) * 100;
    
    setStatsSummary({
      totalTransactions: transactions.length,
      activeAddresses: uniqueAddresses.size,
      avgGasUsed: avgGas,
      successRate: successRate
    });
  };
  
  // 生成图表数据
  const generateChartData = (transactions: TransactionData[]) => {
    if (!transactions || transactions.length === 0) {
      setActivityChartData([]);
      setGasChartData([]);
      setUserActivityData([]);
      return;
    }
    
    // 按日期分组交易
    const txByDate = new Map<string, TransactionData[]>();
    const days = timeRange === '7天' ? 7 : timeRange === '30天' ? 30 : 90;
    
    // 创建过去n天的日期数组
    const dateLabels: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
      dateLabels.push(date);
      txByDate.set(date, []);
    }
    
    // 将交易分配到对应日期
    transactions.forEach(tx => {
      const date = dayjs(tx.block_timestamp * 1000).format('YYYY-MM-DD');
      if (txByDate.has(date)) {
        txByDate.get(date)?.push(tx);
      }
    });
    
    // 生成活动图表数据
    const activityData: ChartData[] = [];
    const gasData: ChartData[] = [];
    const userData: ChartData[] = [];
    
    // 获取所有唯一操作类型
    const operationTypes = new Set<string>();
    transactions.forEach(tx => {
      if (tx.operation_description) {
        operationTypes.add(tx.operation_description);
      }
    });
    
    // 为每个日期创建数据点
    dateLabels.forEach(date => {
      const txsOnDate = txByDate.get(date) || [];
      
      // 按操作类型分组交易数量
      const activityByType = new Map<string, number>();
      const gasByType = new Map<string, number>();
      operationTypes.forEach(op => {
        activityByType.set(op, 0);
        gasByType.set(op, 0);
      });
      
      // 计算每种操作类型的交易数和Gas
      txsOnDate.forEach(tx => {
        const op = tx.operation_description || '其他';
        activityByType.set(op, (activityByType.get(op) || 0) + 1);
        gasByType.set(op, (gasByType.get(op) || 0) + (parseInt(tx.gas) || 0));
      });
      
      // 创建活动数据点
      const activityPoint: ChartData = { date };
      const gasPoint: ChartData = { date };
      
      operationTypes.forEach(op => {
        activityPoint[op] = activityByType.get(op) || 0;
        // 计算平均Gas (如果有交易)
        const txCount = activityByType.get(op) || 0;
        gasPoint[op] = txCount > 0 ? Math.round((gasByType.get(op) || 0) / txCount) : 0;
      });
      
      activityData.push(activityPoint);
      gasData.push(gasPoint);
      
      // 用户活跃度数据
      const senders = new Set<string>();
      const receivers = new Set<string>();
      
      txsOnDate.forEach(tx => {
        if (tx.from_address) senders.add(tx.from_address);
        if (tx.to_address) receivers.add(tx.to_address);
      });
      
      userData.push({
        date,
        '发送方': senders.size,
        '接收方': receivers.size,
        '总活跃地址': senders.size + receivers.size
      });
    });
    
    setActivityChartData(activityData);
    setGasChartData(gasData);
    setUserActivityData(userData);
  };
  
  // 生成模拟图表数据（当API请求失败时使用）
  const generateMockChartData = () => {
    const days = timeRange === '7天' ? 7 : timeRange === '30天' ? 30 : 90;
    const activityData: ChartData[] = [];
    const gasData: ChartData[] = [];
    const userData: ChartData[] = [];
    
    const operationTypes = ['创建资源', '购买资源', '转移所有权'];
    
    // 创建过去n天的日期数组
    for (let i = days - 1; i >= 0; i--) {
      const date = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
      
      const activityPoint: ChartData = { date };
      const gasPoint: ChartData = { date };
      
      operationTypes.forEach(op => {
        activityPoint[op] = Math.floor(Math.random() * 10) + 1;
        gasPoint[op] = Math.floor(Math.random() * 50000) + 20000;
      });
      
      activityData.push(activityPoint);
      gasData.push(gasPoint);
      
      userData.push({
        date,
        '发送方': Math.floor(Math.random() * 8) + 2,
        '接收方': Math.floor(Math.random() * 6) + 1,
        '总活跃地址': Math.floor(Math.random() * 12) + 3
      });
    }
    
    setActivityChartData(activityData);
    setGasChartData(gasData);
    setUserActivityData(userData);
    
    // 设置模拟统计数据
    setStatsSummary({
      totalTransactions: Math.floor(Math.random() * 200) + 50,
      activeAddresses: Math.floor(Math.random() * 30) + 10,
      avgGasUsed: Math.floor(Math.random() * 70000) + 30000,
      successRate: Math.floor(Math.random() * 15) + 85
    });
  };
  
  // 初始化加载数据
  useEffect(() => {
    fetchTransactionData();
  }, []);
  
  // 当时间范围改变时刷新图表
  useEffect(() => {
    if (transactionData.length > 0) {
      generateChartData(transactionData);
    } else {
      generateMockChartData();
    }
  }, [timeRange, transactionData]);
  
  // 根据搜索关键词过滤交易记录
  const getFilteredTransactions = () => {
    if (!searchTerm) return transactionData;
    
    return transactionData.filter(tx => 
      (tx.transaction_hash && tx.transaction_hash.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (tx.tx_hash && tx.tx_hash.toLowerCase().includes(searchTerm.toLowerCase())) ||
      tx.from_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.to_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.operation_description && tx.operation_description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };
  
  // 处理搜索
  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };
  
  // 格式化时间戳为可读格式
  const formatTimestamp = (timestamp: number | string) => {
    if (!timestamp) return "未知时间";
    
    let date;
    try {
      // 尝试处理数字时间戳（秒级或毫秒级）
      const numericTimestamp = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;
      
      // 检查是否为秒级时间戳（以10位数开头）
      if (numericTimestamp.toString().length === 10) {
        date = new Date(numericTimestamp * 1000);
      } else {
        date = new Date(numericTimestamp);
      }
      
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      console.error('时间戳格式化失败:', timestamp, e);
      return String(timestamp);
    }
  };
  
  // 截断长地址
  const truncateAddress = (address: string) => {
    if (!address) return "未知地址";
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };
  
  // 获取图表中的操作类型
  const operationTypes = useMemo(() => {
    const types = new Set<string>();
    activityChartData.forEach(point => {
      Object.keys(point).forEach(key => {
        if (key !== 'date') {
          types.add(key);
        }
      });
    });
    return Array.from(types);
  }, [activityChartData]);
  
  // 渲染API错误提示
  const renderApiErrorAlert = () => {
    if (!apiError) return null;
    
    return (
      <Alert
        message="API连接错误"
        description={
          <div>
            <p>{apiError}</p>
            <p className="mt-2">请检查以下问题:</p>
            <ul className="list-disc pl-5 mt-1">
              <li>确保后端服务器正在运行</li>
              <li>检查API地址配置是否正确</li>
              <li>检查服务器日志以获取更多信息</li>
            </ul>
          </div>
        }
        type="error"
        showIcon
        closable
        className="mb-6 shadow-md rounded-lg"
      />
    );
  };
  
  // 渲染统计卡片
  const renderStatisticsCards = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card bordered={true} className="shadow-sm hover:shadow-md transition-shadow duration-300" 
          style={{ 
            borderTop: `4px solid ${themeColors.primary}`, 
            borderColor: themeColors.cardBorder,
            boxShadow: `0 4px 8px rgba(235, 47, 150, 0.1)`
          }}>
          <Statistic
            title="总交易数"
            value={statsSummary.totalTransactions}
            prefix={<DatabaseOutlined style={{ color: themeColors.primary }} />}
            valueStyle={{ color: themeColors.primary, fontWeight: 'bold' }}
          />
        </Card>
        <Card bordered={true} className="shadow-sm hover:shadow-md transition-shadow duration-300"
          style={{ 
            borderTop: `4px solid ${themeColors.secondary}`, 
            borderColor: themeColors.cardBorder,
            boxShadow: `0 4px 8px rgba(235, 47, 150, 0.1)`
          }}>
          <Statistic
            title="活跃地址数"
            value={statsSummary.activeAddresses}
            prefix={<UserOutlined style={{ color: themeColors.secondary }} />}
            valueStyle={{ color: themeColors.secondary, fontWeight: 'bold' }}
          />
        </Card>
        <Card bordered={true} className="shadow-sm hover:shadow-md transition-shadow duration-300"
          style={{ 
            borderTop: `4px solid ${themeColors.accent}`, 
            borderColor: themeColors.cardBorder,
            boxShadow: `0 4px 8px rgba(235, 47, 150, 0.1)`
          }}>
          <Statistic
            title="平均Gas消耗"
            value={statsSummary.avgGasUsed}
            prefix={<ThunderboltOutlined style={{ color: themeColors.accent }} />}
            valueStyle={{ color: themeColors.accent, fontWeight: 'bold' }}
          />
        </Card>
        <Card bordered={true} className="shadow-sm hover:shadow-md transition-shadow duration-300"
          style={{ 
            borderTop: `4px solid ${themeColors.success}`, 
            borderColor: themeColors.cardBorder,
            boxShadow: `0 4px 8px rgba(235, 47, 150, 0.1)`
          }}>
          <Statistic
            title="交易成功率"
            value={statsSummary.successRate}
            precision={2}
            suffix="%"
            prefix={<CheckCircleOutlined style={{ color: themeColors.success }} />}
            valueStyle={{ color: themeColors.success, fontWeight: 'bold' }}
          />
        </Card>
      </div>
    );
  };
  
  // 渲染交易活动线图
  const renderActivityChart = () => {
    return (
      <Card 
        title={<div className="flex items-center"><LineChartOutlined className="mr-2" style={{ color: themeColors.primary }} />交易活动趋势</div>}
        className="mb-6 shadow-sm hover:shadow-md transition-shadow duration-300"
        bordered={true}
        loading={loading}
        style={{ 
          borderColor: themeColors.cardBorder,
          boxShadow: `0 4px 12px rgba(235, 47, 150, 0.1)`
        }}
        headStyle={{ 
          borderColor: themeColors.cardBorder,
          background: themeColors.primaryPale
        }}
      >
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={activityChartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                {operationTypes.map((type, index) => (
                  <linearGradient key={type} id={`colorActivity${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={themeColors.chartColors[index % themeColors.chartColors.length]} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={themeColors.chartColors[index % themeColors.chartColors.length]} stopOpacity={0.1}/>
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
              <XAxis 
                dataKey="date" 
                tick={{ fill: '#666' }}
                tickFormatter={(value) => value.substring(5)}
              />
              <YAxis tick={{ fill: '#666' }} />
              <Tooltip 
                formatter={(value) => [`${value} 笔交易`, '']}
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  border: `1px solid ${themeColors.primaryLight}`,
                  borderRadius: '4px'
                }}
              />
              <Legend />
              {operationTypes.map((type, index) => (
                <Area
                  key={type}
                  type="monotone"
                  dataKey={type}
                  name={type}
                  stackId="1"
                  stroke={themeColors.chartColors[index % themeColors.chartColors.length]}
                  fillOpacity={1}
                  fill={`url(#colorActivity${index})`}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    );
  };
  
  // 渲染Gas消耗线图
  const renderGasChart = () => {
    return (
      <Card 
        title={<div className="flex items-center"><FireOutlined className="mr-2" style={{ color: themeColors.secondary }} />Gas消耗分析</div>}
        className="mb-6 shadow-sm hover:shadow-md transition-shadow duration-300"
        bordered={true}
        loading={loading}
        style={{ 
          borderColor: themeColors.cardBorder,
          boxShadow: `0 4px 12px rgba(235, 47, 150, 0.1)`
        }}
        headStyle={{ 
          borderColor: themeColors.cardBorder,
          background: themeColors.primaryPale
        }}
      >
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={gasChartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
              <XAxis 
                dataKey="date" 
                tick={{ fill: '#666' }}
                tickFormatter={(value) => value.substring(5)}
              />
              <YAxis 
                tick={{ fill: '#666' }}
                tickFormatter={(value) => {
                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
                  return value;
                }}
              />
              <Tooltip 
                formatter={(value) => [`${value} Gas`, '']}
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  border: `1px solid ${themeColors.secondary}`,
                  borderRadius: '4px'
                }}
              />
              <Legend />
              {operationTypes.map((type, index) => (
                <Line
                  key={type}
                  type="monotone"
                  dataKey={type}
                  name={type}
                  stroke={themeColors.chartColors[index % themeColors.chartColors.length]}
                  strokeWidth={2}
                  dot={{ r: 4, fill: themeColors.chartColors[index % themeColors.chartColors.length] }}
                  activeDot={{ r: 6, fill: themeColors.chartColors[index % themeColors.chartColors.length] }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    );
  };
  
  // 渲染用户活跃度线图
  const renderUserActivityChart = () => {
    return (
      <Card 
        title={<div className="flex items-center"><UserOutlined className="mr-2" style={{ color: themeColors.accent }} />用户活跃度分析</div>}
        className="mb-6 shadow-sm hover:shadow-md transition-shadow duration-300"
        bordered={true}
        loading={loading}
        style={{ 
          borderColor: themeColors.cardBorder,
          boxShadow: `0 4px 12px rgba(235, 47, 150, 0.1)`
        }}
        headStyle={{ 
          borderColor: themeColors.cardBorder,
          background: themeColors.primaryPale
        }}
      >
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={userActivityData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
              <XAxis 
                dataKey="date" 
                tick={{ fill: '#666' }}
                tickFormatter={(value) => value.substring(5)}
              />
              <YAxis tick={{ fill: '#666' }} />
              <Tooltip 
                formatter={(value) => [`${value} 个地址`, '']}
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  border: `1px solid ${themeColors.accent}`,
                  borderRadius: '4px'
                }}
              />
              <Legend />
              <Bar dataKey="发送方" fill={themeColors.primary} name="发送方" barSize={20} radius={[2, 2, 0, 0]} />
              <Bar dataKey="接收方" fill={themeColors.secondary} name="接收方" barSize={20} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    );
  };
  
  // 表格列定义
  const columns = [
    {
      title: '交易哈希',
      key: 'tx_hash',
      render: (_: unknown, record: TransactionData) => {
        const hashValue = record.tx_hash || record.transaction_hash || '';
        return (
          <Typography.Text copyable={{ text: hashValue }} className="font-mono">
            {truncateAddress(hashValue)}
          </Typography.Text>
        );
      },
    },
    {
      title: '区块号',
      dataIndex: 'block_number',
      key: 'block_number',
    },
    {
      title: '发送方',
      dataIndex: 'from_address',
      key: 'from_address',
      render: (text: string) => (
        <Typography.Text copyable={{ text }} className="font-mono">
          {truncateAddress(text)}
        </Typography.Text>
      ),
    },
    {
      title: '接收方',
      dataIndex: 'to_address',
      key: 'to_address',
      render: (text: string) => (
        <Typography.Text copyable={{ text }} className="font-mono">
          {truncateAddress(text)}
        </Typography.Text>
      ),
    },
    {
      title: '操作类型',
      dataIndex: 'operation_description',
      key: 'operation_description',
      render: (text: string) => {
        let color = themeColors.primary;
        if (text && text.includes('mint')) color = themeColors.secondary;
        if (text && text.includes('transfer')) color = themeColors.accent;
        if (text && text.includes('purchase')) color = themeColors.warning;
        return <Tag color={color}>{text || '未知操作'}</Tag>;
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (text: string) => {
        const status = text || 'pending';
        const color = status === 'success' ? themeColors.success : 
                      status === 'pending' ? themeColors.warning : 
                      themeColors.error;
        return (
          <Tag color={color}>
            {status === 'success' ? '成功' : status === 'pending' ? '处理中' : '失败'}
          </Tag>
        );
      }
    },
    {
      title: '时间',
      dataIndex: 'block_timestamp',
      key: 'block_timestamp',
      render: (text: number) => formatTimestamp(text),
    },
  ];
  
  // 页面主体渲染
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8" style={{ background: themeColors.background }}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2 flex items-center" style={{ color: themeColors.primaryDark }}>
            <DatabaseOutlined className="mr-2" style={{ color: themeColors.primary }} /> 区块链数据分析
          </h1>
          <p className="text-gray-600">
            查看区块链交易数据和趋势分析
          </p>
        </div>
        
        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-4">
          <Segmented 
            options={['7天', '30天', '90天']} 
            value={timeRange} 
            onChange={(value) => setTimeRange(value as string)}
            style={{ 
              background: 'white', 
              borderColor: themeColors.primaryLight,
              boxShadow: `0 0 5px ${themeColors.primaryLighter}`
            }}
          />
          <Button 
            type="primary" 
            onClick={fetchTransactionData}
            icon={<ReloadOutlined />}
            style={{ 
              background: themeColors.primary, 
              borderColor: themeColors.primary,
              boxShadow: `0 2px 6px ${themeColors.primaryLighter}`
            }}
          >
            刷新数据
          </Button>
        </div>
      </div>
      
      {renderApiErrorAlert()}
      
      {/* 统计卡片区域 */}
      {renderStatisticsCards()}
      
      {/* 图表区域 */}
      {renderActivityChart()}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderGasChart()}
        {renderUserActivityChart()}
      </div>
      
      {/* 交易表格 */}
      <Card 
        title={<div className="flex items-center"><DatabaseOutlined className="mr-2" style={{ color: themeColors.primary }} />交易记录</div>}
        className="shadow-sm hover:shadow-md transition-shadow duration-300"
        bordered={true}
        style={{ 
          borderColor: themeColors.cardBorder,
          boxShadow: `0 4px 12px rgba(235, 47, 150, 0.1)`
        }}
        headStyle={{ 
          borderColor: themeColors.cardBorder,
          background: themeColors.primaryPale
        }}
        extra={
          <Input.Search 
            placeholder="搜索交易哈希或地址" 
            onSearch={handleSearch} 
            style={{ 
              width: 300,
              borderColor: themeColors.primaryLight 
            }} 
            allowClear
            className="hidden md:flex"
          />
        }
      >
        <div className="md:hidden mb-4">
          <Input.Search 
            placeholder="搜索交易哈希或地址" 
            onSearch={handleSearch} 
            allowClear
            className="w-full"
          />
        </div>
        
        {transactionData.length > 0 ? (
          <Table
            dataSource={getFilteredTransactions()}
            columns={columns}
            rowKey={(record: TransactionData) => record.tx_hash || record.transaction_hash || record.id.toString()}
            scroll={{ x: 'max-content' }}
            pagination={{ 
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              pageSizeOptions: ['5', '10', '20'],
              showTotal: (total: number) => `总计 ${total} 条记录`
            }}
            className="overflow-x-auto"
            loading={loading}
            bordered={false}
            size="middle"
          />
        ) : (
          <Empty
            description={
              apiError ? 
                <div className="flex flex-col items-center">
                  <span className="text-red-500 mb-2">加载交易数据失败</span>
                  <span className="text-gray-500 text-xs">{apiError}</span>
                </div> : 
                <span className="text-gray-500">暂无交易数据</span>
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            className="py-10"
          />
        )}
      </Card>
    </div>
  );
};

export default BlockchainAnalytics; 