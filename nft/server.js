const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// 创建数据库连接池
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'nft'
});

app.use(cors());
app.use(bodyParser.json());  // 解析 JSON 格式请求体
app.use(bodyParser.urlencoded({ extended: true }));  // 解析 urlencoded 请求体

// 确保区块链交易记录表存在
async function ensureBlockchainTables() {
    try {
        const connection = await pool.getConnection();
        
        // 创建区块链交易记录表 - 简化字段
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS blockchain_transactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                block_number BIGINT NOT NULL,
                block_timestamp DATETIME NOT NULL,
                transaction_hash VARCHAR(66) NOT NULL UNIQUE,
                from_address VARCHAR(42) NOT NULL,
                to_address VARCHAR(42) NOT NULL,
                gas VARCHAR(66) DEFAULT '0',
                status VARCHAR(20) DEFAULT 'success',
                operation_description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log('区块链交易记录表初始化成功');
        connection.release();
        return true;
    } catch (error) {
        console.error('初始化区块链交易记录表失败:', error);
        throw error;
    }
}

// 保存前端提交的交易记录到数据库 - 简化字段
async function saveTransactionFromClient(transactionData) {
    try {
        const {
            blockNumber,
            blockTimestamp,
            transactionHash,
            fromAddress,
            toAddress,
            gas,
            operationDescription = "创建教育资源NFT"  // 默认操作描述
        } = transactionData;

        // 将区块时间戳（秒）转换为MySQL日期时间格式
        const timestamp = new Date(Number(blockTimestamp) * 1000).toISOString().slice(0, 19).replace('T', ' ');

        const query = `
            INSERT INTO blockchain_transactions (
                block_number, 
                block_timestamp, 
                transaction_hash, 
                from_address, 
                to_address,
                status,
                gas,
                operation_description
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                block_timestamp = VALUES(block_timestamp),
                from_address = VALUES(from_address),
                to_address = VALUES(to_address),
                status = VALUES(status),
                gas = VALUES(gas),
                operation_description = VALUES(operation_description)
        `;
        
        const params = [
            blockNumber,
            timestamp,
            transactionHash,
            fromAddress,
            toAddress,
            "success",  // 状态
            gas,
            operationDescription
        ];
        
        const [result] = await pool.execute(query, params);
        console.log(`交易已保存: ${transactionHash}`);
        return { success: true, message: '交易记录已保存', id: result.insertId };
    } catch (error) {
        console.error('保存交易记录失败:', error);
        return { success: false, message: '保存交易记录失败', error: error.message };
    }
}

// 获取用户地址的所有交易记录
async function getTransactionsByAddress(address) {
    try {
        const query = 'SELECT * FROM blockchain_transactions WHERE from_address = ? OR to_address = ? ORDER BY block_timestamp DESC';
        const [rows] = await pool.execute(query, [address, address]);
        return rows;
    } catch (error) {
        console.error('获取地址交易记录失败:', error);
        throw error;
    }
}

// 获取所有区块链交易记录
async function getAllTransactions(limit = 100) {
    try {
        const query = 'SELECT * FROM blockchain_transactions ORDER BY block_timestamp DESC LIMIT ?';
        const [rows] = await pool.execute(query, [limit]);
        return rows;
    } catch (error) {
        console.error('获取区块链交易记录失败:', error);
        throw error;
    }
}

// API路由 - 保存交易记录
app.post('/saveTransactionFromClient', async (req, res) => {
    try {
        const transactionData = req.body;
        
        // 必要字段验证
        if (!transactionData.blockNumber || !transactionData.blockTimestamp || !transactionData.transactionHash) {
            return res.status(400).json({ success: false, message: '缺少必要的交易信息' });
        }
        
        // 先确保表存在
        await ensureBlockchainTables();
        
        const result = await saveTransactionFromClient(transactionData);
        res.json(result);
    } catch (error) {
        console.error('保存前端提交的交易记录失败:', error);
        res.status(500).json({ success: false, message: '保存交易记录失败', error: error.message });
    }
});

// API路由 - 获取所有交易记录
app.get('/getBlockchainTransactions', async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 100;
        
        // 先确保表存在
        await ensureBlockchainTables();
        
        const transactions = await getAllTransactions(limit);
        res.json(transactions);
    } catch (error) {
        console.error('获取区块链交易记录失败:', error);
        res.status(500).json({ error: '获取区块链交易记录失败' });
    }
});

// API路由 - 获取用户地址的所有交易记录
app.get('/getTransactionsByAddress/:address', async (req, res) => {
    try {
        const address = req.params.address;
        
        // 先确保表存在
        await ensureBlockchainTables();
        
        const transactions = await getTransactionsByAddress(address);
        res.json(transactions);
    } catch (error) {
        console.error('获取地址交易记录失败:', error);
        res.status(500).json({ error: '获取地址交易记录失败' });
    }
});

// 启动服务器
app.listen(port, async () => {
    console.log(`服务器运行在端口${port}`);
    
    // 初始化数据库表
    try {
        await ensureBlockchainTables();
        console.log('区块链交易记录服务器启动成功');
    } catch (error) {
        console.error('初始化数据库表失败:', error);
    }
});