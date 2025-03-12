import Image from "next/image";
import type { NextPage } from "next";

const Home: NextPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-pink-100 to-pink-200">
      <div className="flex items-center flex-col flex-grow pt-10 px-4">
        <div className="w-full max-w-6xl">
          {/* 标题区域 */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-pink-600 to-pink-400 bg-clip-text text-transparent mb-4">
              区块链教育共享平台
            </h1>
            <p className="text-pink-600 text-lg md:text-xl">
              知识共享·价值共创·区块链赋能
            </p>
          </div>

          {/* 主要内容区域 */}
          <div className="grid md:grid-cols-2 gap-8 items-center mb-12">
            <div className="order-2 md:order-1">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-pink-100">
                <h2 className="text-2xl font-semibold text-pink-700 mb-4">
                  探索区块链教育新境界
                </h2>
                <div className="space-y-4 text-pink-600">
                  <p className="flex items-center">
                    <span className="text-2xl mr-2">🎓</span>
                    优质教育资源共享与交易
                  </p>
                  <p className="flex items-center">
                    <span className="text-2xl mr-2">⚡</span>
                    基于智能合约的知识产权保护
                  </p>
                  <p className="flex items-center">
                    <span className="text-2xl mr-2">🌟</span>
                    去中心化的学习认证系统
                  </p>
                  <p className="flex items-center">
                    <span className="text-2xl mr-2">💎</span>
                    透明公正的价值评估机制
                  </p>
                </div>
              </div>
            </div>
            
            <div className="order-1 md:order-2">
              <Image
                src="/hero.png"
                width={600}
                height={400}
                alt="教育共享平台展示"
                className="rounded-2xl shadow-xl border-4 border-pink-200 transform hover:scale-105 transition-transform duration-300"
              />
            </div>
          </div>

          {/* 特色功能区域 */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-pink-100 hover:shadow-xl transition-shadow duration-300">
              <h3 className="text-xl font-semibold text-pink-600 mb-3">知识共享</h3>
              <p className="text-pink-600">
                基于区块链技术的去中心化知识共享平台，让知识传播更加自由、安全。
              </p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-pink-100 hover:shadow-xl transition-shadow duration-300">
              <h3 className="text-xl font-semibold text-pink-600 mb-3">智能认证</h3>
              <p className="text-pink-600">
                利用智能合约实现自动化的学习认证和成就记录，确保学习证明的可信度。
              </p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-pink-100 hover:shadow-xl transition-shadow duration-300">
              <h3 className="text-xl font-semibold text-pink-600 mb-3">价值激励</h3>
              <p className="text-pink-600">
                创新的代币激励机制，让知识分享者获得应有的回报，促进优质内容创作。
              </p>
            </div>
          </div>

          {/* 行动召唤区域 */}
          <div className="text-center mb-12">
            <a 
              href="/register" 
              className="inline-block px-8 py-4 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-pink-500/30 transform hover:-translate-y-0.5 transition-all duration-300"
            >
              立即加入我们的学习社区
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
