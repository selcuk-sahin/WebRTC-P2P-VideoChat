## About

A simple application built with express.js, hosting videochat/screen-sharing ability via WebRTC and sockets.
This was a school project and completed in 2 weeks.

## Requirements

For node js : install node.js  
-npm install -i  
-npm i -g peer (if you need to run peer js locally)  

## Running 

-npm run devstart (will run at port 3000 statically defined)  

for local peerJs:  
-peerjs --port 3001  
  
set the variable on script.js with a host key. more info at : https://peerjs.com/peerserver.html  
const myPeer = new Peer(undefined, {});  

App will run at localhost:3000  
Try connecting from a different browser tab
