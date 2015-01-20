# nftrace-scaffold

A nice module to use to generate, and compile your lttng tracepoints into a usable module in your node.js application!

To use, download this module and place in a directory of your choice, eg ~/dir.

within this directory, you can write a script like the following:

```javascript
var Nftrace = require('./nftrace-scaffold');

var nftrace = new Nftrace();

nftrace.setProvider('nearform');
nftrace.createProbe('betterNameForProbe', ['string: msg', 'int: number', 'string: extra'], ['msg', 'number', 'extra']);
nftrace.createProbe('anotherProbeName', ['int: number', 'string: msg'], ['number', 'msg']);

nftrace.finaliseProbes();
```
you can then run this script using ``node script.js`` and an output directory/module is generated for you to use! The output module will be in the directory nftrace-output. eg ~/dir/nftrace-output

To use this output in your application, copy the output directory to your application, require it in your application, instaniate your controller and fire some probes!

```javascript
var ProbeController = require('./nftrace-output');
var probeController = new ProbeController();

probeController.fire('betterNameForProbe', ['this is a message', 1234, 'addional information']);
probeController.fire('anotherProbeName', [1234, 'addional information']);
```

##creating your module and tracepoints!
The constructor for Nftrace-scaffold is able to take a provider as an arguement, if none is supplied the provider defaults to nearform. *setProvider(provider)* also takes provider as an argument, if you want to set the provider later.

*createProbe(probeName, argArray, fieldArray)* corresponds to the output TRACEPOINT_EVENT macro for lttng.

the argArray must be an array of Strings in the format "arguementType: arguementName". The space is optional.
the currently accepted arguementTypes are string and int. Anything else will make your computer cry.
arguementName's are used in the fieldArr later, so you can make the tracepoint output easy to read. lttng supports the ability to place constants in the field output. currently, this not supported.

*finaliseprobes()* **must** be called to generate the output and compile it. This script uses `node-gyp`, so make sure you meet all of its requirements. 

######Note on lttng
`in lttng, to create a tracepoint, you must compile a TRACEPOINT_EVENT.
TRACEPOINT_EVENT takes four arguments,
TRACEPOINT_EVENT(provider,probeName, args, fields).`

`provider is the provider you will search for when you want to trace your application, probe_name is the name of the probe which you would want to enable at runtime, args are the arguements it will take at runtime and fields are the output when the tracepoint is called at runtime(fields are what you see, arguements are what you input).`

###Using the output to trace your application
You must first instantiate a probe-controller object, like in the example at the begining.
When you want to fire the probe you created, you can call
*fire(probeName, argArr)*.
The probeName corresponds to the name which you supplied in the scaffold, the argArr should correspond to an array of arguements who types match the type which you created in the scaffold. 
more examples are below.

#####generation script saved in ~/dir/gen.js, which has this module in the directory.
```javascript
var Nftrace = require('./nftrace-scaffold');

var nftrace = new Nftrace();

nftrace.setProvider('nearform');

nftrace.createProbe('httpReq', ['string: request', 'string: reply'], ['request', 'reply']);

nftrace.finaliseProbes();
```

This will then generate your nftrace-output, to be copied to your application directory, e.g. ~/app

#####Example app.js using this generated module. saved at ~/app/app.js
```javascript
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
```
##Additional notes:
This will only work on linux.

This will not be pushed on NPM for now, so you must add this repo to your project manually to require it, some time in the future it will be able to be installed from npm and required as a simple module, instead of requiring the directory.

###TODO
Allow the use of constants and variables in the fields of the tracepoint.

Add more acceptable arguements to the tracepoint(the ability to put an object in here would be nice).
