const express = require('express');
const path = require('path');
const { Connection, Request } = require('tedious'); // Thư viện kết nối SQL Server

const app = express();
app.use(express.json());

// Phục vụ các file tĩnh sau khi React build xong
app.use(express.static(path.join(__dirname, 'build')));

// API 1: Kiểm tra sức khỏe hệ thống
app.get('/api/health', (req, res) => {
    res.json({ status: 'Healthy', timestamp: new Date() });
});

// API 2: Lấy thông tin orders từ Azure SQL
app.get('/api/orders', (req, res) => {
    const config = {
        server: process.env.DB_SERVER, 
        authentication: {
            type: 'default',
            options: {
                userName: process.env.DB_USER,
                password: process.env.DB_PASSWORD
            }
        },
        options: {
            database: process.env.DB_NAME,
            encrypt: true,
            trustServerCertificate: false
        }
    };

    const connection = new Connection(config);
    connection.on('connect', err => {
        if (err) return res.status(500).json({ error: err.message });

        let results = [];
        const request = new Request("SELECT * FROM Orders FOR JSON PATH", (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        });

        request.on('row', columns => {
            columns.forEach(column => { results.push(column.value); });
        });

        connection.execSql(request);
    });
    connection.connect();
});

// Trả về giao diện React cho mọi request khác
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Server running on port ${port}`));