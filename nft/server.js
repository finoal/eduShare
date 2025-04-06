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

app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',  // 允许所有来源或指定来源
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());  // 解析 JSON 格式请求体
app.use(bodyParser.urlencoded({ extended: true }));  // 解析 urlencoded 请求体

// 添加一个简单的健康检查端点
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 确保区块链数据表存在
async function ensureBlockchainTables() {
    try {
        const connection = await pool.getConnection();
        
        // 创建区块链数据表 - 修改表名并保持原始时间戳格式
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS blockchain_data (
                id INT AUTO_INCREMENT PRIMARY KEY,
                block_number BIGINT NOT NULL,
                block_timestamp BIGINT NOT NULL,
                transaction_hash VARCHAR(66) NOT NULL UNIQUE,
                from_address VARCHAR(42) NOT NULL,
                to_address VARCHAR(42) NOT NULL,
                gas VARCHAR(66) DEFAULT '0',
                status VARCHAR(20) DEFAULT 'success',
                operation_description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log('区块链数据表初始化成功');
        connection.release();
        return true;
    } catch (error) {
        console.error('初始化区块链数据表失败:', error);
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

        // 不再将时间戳转换为MySQL日期格式，直接使用原始时间戳
        const query = `
            INSERT INTO blockchain_data (
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
            blockTimestamp,  // 直接使用原始时间戳
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
        const query = 'SELECT * FROM blockchain_data WHERE from_address = ? OR to_address = ? ORDER BY block_timestamp DESC';
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
        // 完全不使用LIMIT子句，避免参数问题
        const query = `SELECT * FROM blockchain_data ORDER BY block_timestamp DESC`;
        const [rows] = await pool.query(query);
        
        // 在应用层面处理限制逻辑
        const intLimit = parseInt(limit, 10) || 100;
        return rows.slice(0, intLimit);
    } catch (error) {
        console.error('获取区块链交易记录失败:', error);
        throw error;
    }
}

// 获取交易活动数据
async function getTransactionActivityData(startDate, endDate, operation) {
    try {
        let query;
        let params = [];
        
        if (operation !== 'all') {
            query = `
                SELECT 
                    DATE_FORMAT(FROM_UNIXTIME(block_timestamp), '%Y-%m-%d') as date,
                    operation_description,
                    COUNT(*) as transaction_count
                FROM 
                    blockchain_data
                WHERE 
                    block_timestamp BETWEEN UNIX_TIMESTAMP(?) AND UNIX_TIMESTAMP(?)
                    AND operation_description = ?
                GROUP BY 
                    date, operation_description
                ORDER BY 
                    date
            `;
            params = [startDate, endDate, operation];
        } else {
            query = `
                SELECT 
                    DATE_FORMAT(FROM_UNIXTIME(block_timestamp), '%Y-%m-%d') as date,
                    operation_description,
                    COUNT(*) as transaction_count
                FROM 
                    blockchain_data
                WHERE 
                    block_timestamp BETWEEN UNIX_TIMESTAMP(?) AND UNIX_TIMESTAMP(?)
                GROUP BY 
                    date, operation_description
                ORDER BY 
                    date
            `;
            params = [startDate, endDate];
        }
        
        const [rows] = await pool.execute(query, params);
        return rows;
    } catch (error) {
        console.error('获取交易活动数据失败:', error);
        throw error;
    }
}

// 获取Gas消耗数据
async function getGasConsumptionData(startDate, endDate, operation) {
    try {
        let query;
        let params = [];
        
        if (operation !== 'all') {
            query = `
                SELECT 
                    DATE_FORMAT(FROM_UNIXTIME(block_timestamp), '%Y-%m-%d') as date,
                    operation_description,
                    AVG(CAST(gas AS UNSIGNED)) as avg_gas_used
                FROM 
                    blockchain_data
                WHERE 
                    block_timestamp BETWEEN UNIX_TIMESTAMP(?) AND UNIX_TIMESTAMP(?)
                    AND operation_description = ?
                GROUP BY 
                    date, operation_description
                ORDER BY 
                    date
            `;
            params = [startDate, endDate, operation];
        } else {
            query = `
                SELECT 
                    DATE_FORMAT(FROM_UNIXTIME(block_timestamp), '%Y-%m-%d') as date,
                    operation_description,
                    AVG(CAST(gas AS UNSIGNED)) as avg_gas_used
                FROM 
                    blockchain_data
                WHERE 
                    block_timestamp BETWEEN UNIX_TIMESTAMP(?) AND UNIX_TIMESTAMP(?)
                GROUP BY 
                    date, operation_description
                ORDER BY 
                    date
            `;
            params = [startDate, endDate];
        }
        
        const [rows] = await pool.execute(query, params);
        return rows;
    } catch (error) {
        console.error('获取Gas消耗数据失败:', error);
        throw error;
    }
}

// 获取用户活跃度数据
async function getUserActivityData(startDate, endDate, operation) {
    try {
        let query;
        let params = [];
        
        if (operation !== 'all') {
            query = `
                SELECT 
                    DATE_FORMAT(FROM_UNIXTIME(block_timestamp), '%Y-%m-%d') as date,
                    COUNT(DISTINCT from_address) as active_senders,
                    COUNT(DISTINCT to_address) as active_receivers
                FROM 
                    blockchain_data
                WHERE 
                    block_timestamp BETWEEN UNIX_TIMESTAMP(?) AND UNIX_TIMESTAMP(?)
                    AND operation_description = ?
                GROUP BY 
                    date
                ORDER BY 
                    date
            `;
            params = [startDate, endDate, operation];
        } else {
            query = `
                SELECT 
                    DATE_FORMAT(FROM_UNIXTIME(block_timestamp), '%Y-%m-%d') as date,
                    COUNT(DISTINCT from_address) as active_senders,
                    COUNT(DISTINCT to_address) as active_receivers
                FROM 
                    blockchain_data
                WHERE 
                    block_timestamp BETWEEN UNIX_TIMESTAMP(?) AND UNIX_TIMESTAMP(?)
                GROUP BY 
                    date
                ORDER BY 
                    date
            `;
            params = [startDate, endDate];
        }
        
        const [rows] = await pool.execute(query, params);
        return rows;
    } catch (error) {
        console.error('获取用户活跃度数据失败:', error);
        throw error;
    }
}

// API路由 - 获取分析数据
app.get('/api/blockchain/analytics', async (req, res) => {
    try {
        const { startDate, endDate, operation = 'all' } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({ 
                error: '缺少必要的参数', 
                details: '必须提供startDate和endDate参数'
            });
        }
        
        // 获取交易活动数据
        const activityData = await getTransactionActivityData(startDate, endDate, operation);
        
        // 获取Gas消耗数据
        const gasData = await getGasConsumptionData(startDate, endDate, operation);
        
        // 获取用户活跃度数据
        const userActivityData = await getUserActivityData(startDate, endDate, operation);
        
        res.json({
            activityData,
            gasData,
            userActivityData
        });
    } catch (error) {
        console.error('获取分析数据失败:', error);
        res.status(500).json({ 
            error: '获取分析数据失败', 
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

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

// API路由 - 获取所有交易记录（保留原有路径）
app.get('/getBlockchainTransactions', async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 100;
        
        // 先确保表存在
        await ensureBlockchainTables();
        
        const transactions = await getAllTransactions(limit);
        res.json(transactions);
    } catch (error) {
        console.error('获取区块链交易记录失败:', error);
        res.status(500).json({ error: '获取区块链交易记录失败', details: error.message });
    }
});

// API路由 - 获取所有交易记录（新路径格式）
app.get('/api/blockchain/transactions', async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 100;
        
        // 先确保表存在
        await ensureBlockchainTables();
        
        const transactions = await getAllTransactions(limit);
        res.json(transactions);
    } catch (error) {
        console.error('获取区块链交易记录失败:', error);
        res.status(500).json({ error: '获取区块链交易记录失败', details: error.message });
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

// API路由 - 获取交易详情
app.get('/api/blockchain/transactions', async (req, res) => {
    try {
        const { startDate, endDate, operation, search, page, limit } = req.query;
        
        // 获取交易活动数据
        const activityData = await getTransactionActivityData(startDate, endDate, operation);
        
        // 获取Gas消耗数据
        const gasData = await getGasConsumptionData(startDate, endDate, operation);
        
        // 获取用户活跃度数据
        const userActivityData = await getUserActivityData(startDate, endDate, operation);
        
        res.json({
            activityData,
            gasData,
            userActivityData
        });
    } catch (error) {
        console.error('获取交易详情失败:', error);
        res.status(500).json({ error: '获取交易详情失败' });
    }
});

// API路由 - 导出数据
app.get('/api/blockchain/export', async (req, res) => {
    try {
        const { format, startDate, endDate, operation } = req.query;
        
        // 获取要导出的数据
        let query = `
            SELECT 
                block_number,
                FROM_UNIXTIME(block_timestamp) as block_time,
                transaction_hash,
                from_address,
                to_address,
                gas,
                status,
                operation_description,
                created_at
            FROM 
                blockchain_data
            WHERE 1=1
        `;
        
        const params = [];
        
        if (startDate && endDate) {
            query += ` AND block_timestamp BETWEEN UNIX_TIMESTAMP(?) AND UNIX_TIMESTAMP(?)`;
            params.push(startDate, endDate);
        }
        
        if (operation && operation !== 'all') {
            query += ` AND operation_description = ?`;
            params.push(operation);
        }
        
        query += ` ORDER BY block_timestamp DESC`;
        
        // 使用execute方法执行带参数的查询，不使用LIMIT
        const [rows] = await pool.execute(query, params);
        
        // 限制最大导出记录数为1000条
        const limitedRows = rows.slice(0, 1000);
        
        if (format === 'csv') {
            // 设置CSV响应头
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=blockchain_data.csv');
            
            // 写入CSV头
            res.write('区块号,区块时间,交易哈希,发送地址,接收地址,Gas消耗,状态,操作描述,创建时间\n');
            
            // 写入数据行
            limitedRows.forEach(row => {
                const csvLine = [
                    row.block_number,
                    row.block_time,
                    row.transaction_hash,
                    row.from_address,
                    row.to_address,
                    row.gas,
                    row.status,
                    row.operation_description,
                    row.created_at
                ].join(',');
                
                res.write(csvLine + '\n');
            });
            
            res.end();
        } else {
            // 如果不是CSV格式，返回JSON
            res.json(limitedRows);
        }
    } catch (error) {
        console.error('导出数据失败:', error);
        res.status(500).json({ error: '导出数据失败', details: error.message });
    }
});

// API路由 - 生成模拟交易数据（仅供测试）
app.post('/api/blockchain/generateTestData', async (req, res) => {
    try {
        // 确保表存在
        await ensureBlockchainTables();
        
        const count = req.body.count || 5;
        const results = [];
        
        // 生成一些测试交易数据
        for (let i = 0; i < count; i++) {
            const now = Math.floor(Date.now() / 1000);
            const blockNumber = 10000000 + i;
            const blockTimestamp = now - (i * 86400); // 每条记录相差一天
            const hash = `0x${Math.random().toString(16).substring(2).padEnd(64, '0')}`;
            const fromAddress = '0x1234567890123456789012345678901234567890';
            const toAddress = '0x0987654321098765432109876543210987654321';
            const gas = Math.floor(Math.random() * 1000000).toString();
            
            const transactionData = {
                blockNumber,
                blockTimestamp,
                transactionHash: hash,
                fromAddress,
                toAddress,
                gas,
                operationDescription: i % 2 === 0 ? "创建教育资源NFT" : "购买教育资源"
            };
            
            const result = await saveTransactionFromClient(transactionData);
            results.push(result);
        }
        
        res.json({ success: true, message: `已生成${count}条测试数据`, results });
    } catch (error) {
        console.error('生成测试数据失败:', error);
        res.status(500).json({ success: false, message: '生成测试数据失败', error: error.message });
    }
});

// 测试数据库连接
async function testDatabaseConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('数据库连接测试成功');
        connection.release();
        return true;
    } catch (error) {
        console.error('数据库连接测试失败:', error);
        return false;
    }
}

// 确保数据库表和结构正确
async function ensureDatabaseStructure() {
    console.log('检查数据库结构...');
    
    try {
        // 测试数据库连接
        await testDatabaseConnection();
        
        // 确保区块链数据表存在
        await ensureBlockchainTables();
        
        // 检查系统状态
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT VERSION() as version');
        connection.release();
        
        console.log(`数据库结构检查完成，MySQL版本: ${rows[0].version}`);
        return true;
    } catch (error) {
        console.error('数据库结构检查失败:', error);
        return false;
    }
}

// 启动服务器
app.listen(port, async () => {
    console.log(`服务器运行在端口${port}`);
    
    // 检查数据库结构
    const dbStructureOk = await ensureDatabaseStructure();
    
    if (dbStructureOk) {
        console.log('区块链数据记录服务器启动成功');
    } else {
        console.error('数据库结构检查失败，服务可能无法正常工作');
    }
});