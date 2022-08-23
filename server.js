const Koa = require('koa');
const koaSend = require('koa-send');
const statics = require('koa-static');
const socket = require('socket.io');

const path = require('path');
const http = require('http');

const port = 3007;
const app = new Koa();

const httpServer = http.createServer().listen(port, () => {
    console.log('httpServer app started at port ...' + port);
});
const options = {
    ioOptions: {
        pingTimeout: 10000,
        pingInterval: 5000,
    }
};
const httpIo = socket(httpServer, options);
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



