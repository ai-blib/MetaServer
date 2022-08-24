const express = require('express');
const app = express();
const http = require('http');
const socket = require('socket.io');

const port = 3007;
app.all('*', function (req, res, next) {
    if (!req.get('Origin')) return next();
    // use "*" here to accept any origin
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
    // res.set('Access-Control-Allow-Max-Age', 3600);
    if ('OPTIONS' == req.method) return res.send(200);
    next();
});

app.get('/hs', (req, res) => {
    res.send('<p style="color:red">服务已启动</p>');
})
const httpServer = app.listen(3000, () => {
    console.log('listen:30001');
})
const options = {
    ioOptions: {
        pingTimeout: 10000,
        pingInterval: 5000,
    },
    origins:["127.0.0.1:8000",'localhost:3003'],
    serveClient: false,
    // below are engine.IO options
    pingInterval: 20000,
    pingTimeout: 5000,
    cookie: false
};
const httpIo = socket(httpServer, {cors:true});
const rooms = {};
const socks = {};
const httpConnectIoCallBack = (sock) => {
    console.log(`sockId:${sock.id}连接成功!!!`);
    sock.emit('connectionSuccess', sock.id);
    // 用户断开连接
    sock.on('userLeave', ({userName, galleryId, sockId} = user) => {
        console.log(`userName:${userName}, galleryId:${galleryId}, sockId:${sockId} 断开了连接...`);
        if (galleryId && rooms[galleryId] && rooms[galleryId].length) {
            rooms[galleryId] = rooms[galleryId].filter(item => item.sockId !== sockId);
            httpIo.in(galleryId).emit('userLeave', rooms[galleryId]);
            console.log(`userName:${userName}, galleryId:${galleryId}, sockId:${sockId} 离开了房间...`);
        }
    });
    // 用户加入房间
    sock.on('join', ({userName, galleryId, sockId, point}) => {
        rooms[galleryId] = rooms[galleryId] || [];
        if (rooms[galleryId].some((user) => user.userName === userName)) {
            return;
        }
        rooms[galleryId].push({userName, galleryId, sockId, point:[point,point]});
        sock.join(galleryId);
        httpIo.in(galleryId).emit('joinGallerySuccess', rooms[galleryId]);
        socks[sockId] = sock;
        console.log(`userName:${userName}, galleryId:${galleryId}, sockId:${sockId} 成功加入房间!!!`);
    });
    sock.on('sendPosition', ({galleryId, point, userName}) => {
        const currentUser = rooms[galleryId].find((user) => user.userName === userName);
        if (!currentUser) return;
        currentUser.point.shift()
        currentUser.point.push(point)
        httpIo.in(galleryId).emit('userPosition', rooms[galleryId]);
    });

};
httpIo.on('connection', httpConnectIoCallBack);



