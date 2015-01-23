var http = require('http');
var Nftrace = require('./nftrace-output');

var nftrace = new Nftrace();
var fruit = ['apple', 'orange', 'pear', 'banana', 'plum', 'lemon'];

var server = http.createServer(function (req, res) {
  if(req.url == '/'){
    message = fruit[Math.floor(Math.random() * fruit.length)];
    res.writeHead(200, {"Content-Type": "text/plain"});
    res.write(message);
    res.end();
    nftrace.fire('httpReq', [req.url, message]);
  } else{
    res.writeHead(404, {"Content-Type": "text/plain"});
    res.write("404 Not Found\n");
    res.end();
    nftrace.fire('httpReq', [req.url, "404"]);
  }
});



server.listen(8000);
console.log("Server running at http://127.0.0.1:8000/");