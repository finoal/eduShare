# 🎓 基于区块链的教育共享系统

![教育共享系统标志](https://example.com/logo.png)

## 📚 项目概述

这是一个基于区块链技术的去中心化教育资源共享平台，旨在创建一个透明、安全且高效的教育生态系统。通过智能合约和区块链技术，我们实现了教育资源的可信共享、知识产权保护以及学习成果的可验证记录。

### 🌟 核心特点

- **去中心化内容分发**：教育内容直接从创作者流向学习者，无需中间平台抽成
- **知识产权保护**：通过NFT技术确保创作者权益得到保障
- **透明的激励机制**：优质内容创作者和积极参与的学习者都能获得代币奖励
- **可验证的学习证书**：学习成就和证书以NFT形式存储在区块链上，永久有效且可验证
- **社区治理**：平台重大决策由社区投票决定，实现真正的去中心化治理

## 🚀 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) (>= v18.17)
- [Yarn](https://yarnpkg.com/) (v1或v2+)
- [Git](https://git-scm.com/)
- [MetaMask](https://metamask.io/)或其他以太坊钱包

### 安装步骤

1. 克隆仓库并安装依赖：

```bash
git clone https://github.com/yourusername/edu-blockchain.git
cd edu-blockchain
yarn install
```

2. 启动本地区块链网络：

```bash
yarn chain
```

3. 在新的终端窗口中部署智能合约：

```bash
yarn deploy
```

4. 启动前端应用：

```bash
yarn start
```

5. 在浏览器中访问 [http://localhost:3000](http://localhost:3000) 体验应用

## 💻 系统架构

### 智能合约

- **EduToken.sol**：平台通证，用于激励和治理
- **CourseNFT.sol**：课程内容NFT，保障知识产权
- **CertificateNFT.sol**：学习证书NFT，验证学习成果
- **Governance.sol**：社区治理合约，实现民主决策

### 前端技术栈

- **Next.js**：React框架，提供服务端渲染和静态生成
- **ethers.js**：与以太坊区块链交互
- **IPFS**：去中心化存储教育内容
- **Tailwind CSS**：UI设计

## 🔍 主要功能模块

### 对于教育者

- 创建和发布课程内容（铸造CourseNFT）
- 设置课程定价和访问权限
- 查看学生学习进度和成绩
- 颁发证书（铸造CertificateNFT）
- 获取教学收益

### 对于学习者

- 浏览和购买课程
- 学习内容并完成测验
- 获取学习证书
- 评价课程和教师
- 参与社区讨论

### 对于社区成员

- 参与平台治理投票
- 提出改进建议
- 质押代币获取收益
- 参与内容审核

## 🔄 工作流程

1. 教育者创建课程并上传到IPFS，同时铸造CourseNFT
2. 学习者使用EduToken购买课程访问权
3. 学习者完成课程后，系统自动或教育者手动颁发CertificateNFT
4. 平台根据贡献度向教育者和活跃学习者分发EduToken奖励
5. 代币持有者可参与平台治理决策

## 🌐 部署信息

- 主网合约地址：`待部署`
- 测试网合约地址：`0x...`（Sepolia测试网）
- 前端应用：[https://edu-blockchain.vercel.app](https://example.com)

## 🛠️ 开发指南

### 本地开发

详细的开发指南请参考 [开发文档](./docs/development.md)

### 测试

运行测试套件：

```bash
yarn test
```

### 部署到测试网

1. 配置环境变量（参见 `.env.example`）
2. 运行部署脚本：

```bash
yarn deploy --network sepolia
```

## 🤝 如何贡献

我们欢迎社区贡献！请查看 [贡献指南](./CONTRIBUTING.md) 了解如何参与项目开发。

## 📜 许可证

本项目采用 [MIT 许可证](./LICENSE)

## 📞 联系我们

- 电子邮件：contact@edu-blockchain.org
- Discord：[加入我们的Discord社区](https://discord.gg/edu-blockchain)
- Twitter：[@EduBlockchain](https://twitter.com/EduBlockchain)

---

## 🔮 未来规划

- 多链支持（Polygon, Arbitrum等）
- 移动应用开发
- AI辅助学习路径推荐
- 去中心化身份验证
- 跨平台学分互认系统

加入我们，共同构建去中心化教育的未来！
