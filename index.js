var fs = require('fs');
var path = require('path');

function NftraceGen(providerName, outputLoc) {
  var exec = require('child_process').exec;
  var provider = "nearform"
  var outputLocation = path.normalize(path.dirname(process.argv[1]) + "/");
  var probes = [];
  var args = {};
  var fields = {};
  
  if (providerName !== 'undefined') {
    provider = provider;
  }
  if (outputLoc !== 'undefined') {
    outputLocation = path.normalize(path.dirname(process.argv[1]) + "/" + outputLoc);
  }

  this.setProvider = function (name) {
    provider = name;
  };

  this.setOutputLocation = function (name) {
    outputLocation = path.normalize(path.dirname(process.argv[1]) + name);
  };


  this.createProbe = function (probeName, arg, field) {
    probes.push(probeName);
    args[probeName] = arg;
    fields[probeName] = field;
  };

  var generateOutputDir = function () {
    if(!fs.existsSync(outputLocation)){
      fs.mkdirSync(outputLocation);
    }
    fs.mkdirSync(outputLocation + "/nftrace-output");
    fs.mkdirSync(outputLocation + "/nftrace-output/src");
    fs.mkdirSync(outputLocation + "/nftrace-output/lib");
  };

  var generateTpHeader = function (headerTracepoints) {
    var path = __dirname + "/templates/generated-tp-template.h";
    var contents = fs.readFileSync(path, 'utf8');
    contents = contents.replace("<PROVIDER>", provider);
    contents = contents.replace("<GENERATED-TP.H>", "\"" + provider + "-tp.h\"");
    contents = contents.replace("<PROVIDER_TP_H>", provider.toUpperCase() +"_TP_H");
    contents = contents.replace("<PROVIDER_TP_H>", provider.toUpperCase() +"_TP_H");
    var tracepoints = "";
    headerTracepoints.forEach(function (tracepoint) {
      tracepoints += tracepoint;
    });
    contents = contents.replace("<TRACEPOINT_EVENTS>", tracepoints);
    fs.writeFileSync(outputLocation + "/nftrace-output/src/" + provider + "-tp.h", contents);


    path = __dirname + "/templates/generated-tp-template.cc";

    contents = fs.readFileSync(path, 'utf8');
    contents = contents.replace("<PROVIDER>", provider);
    fs.writeFileSync(outputLocation + "/nftrace-output/src/" + provider + "-tp.cc", contents);
    console.log("Tracepoints generated.");
  };

  var generateTpNativeCaller = function (nanTracepoints) {
    var path = __dirname + "/templates/nftracepoints-template.cc";
    var contents = fs.readFileSync(path, 'utf8');
    var re = "\"" + provider + "-tp.h\"";
    contents = contents.replace("<GENERATED-TP.H>", re);
    var tracepoints = "";
    nanTracepoints.forEach(function (tracepoint) {
      tracepoints += tracepoint;
    });
    contents = contents.replace("<NAN_METHODS>", tracepoints);
    var exports = "";
    probes.forEach(function (probeName) {
      exports += "exports->Set(NanNew(\"fire" + probeName + "\"), NanNew<FunctionTemplate>(Fire" + probeName + ")->GetFunction());\n";
    });
    contents = contents.replace("<INIT_EXPORTS>", exports);
    fs.writeFileSync(outputLocation + "/nftrace-output/src/nftracepoints.cc", contents);
    console.log("native link to tracepoints generated.");
  };

  var generateTpJSControllers = function () {
    var path = __dirname + "/templates/nfprobeController-template.js";
    var contents = fs.readFileSync(path, 'utf8');
    var fireMethodLogic = "switch (probeName){";
    probes.forEach(function (probeName) {
      fireMethodLogic += "\n\t\tcase (\"" + probeName + "\"):\n\t\t\t";
      var fireProbeCall = "probeController.fire" + probeName + "(";
      args[probeName].forEach(function (arg, index) {
        if (index !== 0) {
          fireProbeCall += ",";
        }
        fireProbeCall += "args[" + index+"]";
      });
      fireMethodLogic += fireProbeCall + ");\n\t\t\tbreak;";
    });
    fireMethodLogic += "\n\t\tdefault:\n\t\t\tbreak;\n\t}";
    contents = contents.replace("<FIRE_LOGIC>", fireMethodLogic);
    fs.writeFileSync(outputLocation + "/nftrace-output/lib/nfprobeController.js", contents);
    //javascript created.
  };

  var generateAdditionalFiles = function () {
    var path = __dirname + "/templates/package.json";
    var contents = fs.readFileSync(path, 'utf8');
    fs.writeFileSync(outputLocation + "/nftrace-output/package.json", contents);
    
    path = __dirname + "/templates/generated-binding.gyp";
    contents = fs.readFileSync(path, 'utf8');
    contents = contents.replace("<PROVIDER>", provider);
    fs.writeFileSync(outputLocation + "/nftrace-output/binding.gyp", contents);
    console.log("Scaffolding is finished... now to try to build!");
  };

  var compileGeneratedFiles = function () {
    exec('cd ' + outputLocation + '/nftrace-output && npm install && cd ..' , function (error, stdout, stderr) {
      console.log(stdout);
      console.error(stderr);
      console.log("finished!");
    });
  };

  //finaliseProbes must create 4 files, 
  //the .cc, the .h probes, and the .js files.
  //.cc is the native code for firing tracepoints
  //.h is the tracepoints to be compiled
  //.js is the wrapper around the .cc compiled output.
  this.finaliseProbes = function () {
    
    exec('rm -rf ' + outputLocation + '/nftrace-output');
    var headerTracepoints = [];
    var nanTracepoints = [];

    probes.forEach(function (probeName) {
      var headerTracepoint = "TRACEPOINT_EVENT(\n\t" + provider + ", " + probeName + ",\n\tTP_ARGS(\n\t\t";
      var nanTracepoint = "NAN_METHOD(Fire" + probeName + "){\n\tNanScope();\n\n\t";
      var nanCallTracepointSignature  = "tracepoint(" + provider + "," + probeName + ",";
      //run through args, do some magic.
      args[probeName].forEach(function (arg, index) {
        var niceities = arg.split(":");
        niceities[1] = niceities[1].replace(/\s/g, '');
        if (index !== 0) {
          headerTracepoint += ",\n\t\t";
          nanTracepoint += "\n\t";
          nanCallTracepointSignature += ",";
        }
        switch (niceities[0]) {
        case ("string"):
          headerTracepoint += "const char*, " + niceities[1];
          nanTracepoint += "String::AsciiValue arg" + index + "(args[" + index + "]);";
          nanCallTracepointSignature += "*arg" + index;
          break;
        case ("int"):
          headerTracepoint += "int, " + niceities[1];
          nanTracepoint += "int arg" + index + " = args[" + index + "].As<Number>()->IntegerValue();";
          nanCallTracepointSignature += "arg" + index;
          break;
        default:
          break;
        }
      });
      headerTracepoint += "\n\t),\n\tTP_FIELDS(";
      nanTracepoint += "\n\t" + nanCallTracepointSignature + ");\n\n\tNanReturnUndefined();\n}\n";

      nanTracepoints.push(nanTracepoint);

      //Below makes a tracepoint have a string for each field. Not very dynamic. 
      //Proof of concept working code! 
      fields[probeName].forEach(function (field, index) {
        //get corresponding field to see its type!
        var niceities = args[probeName][index].split(":");
        headerTracepoint += "\n\t\t";
        switch (niceities[0].toLowerCase()) {
        case ("string"):
          headerTracepoint += "ctf_string(" + field + ", " + field + ")";
          break;
        case ("int"):
          headerTracepoint += "ctf_integer(int, " + field + ", " + field + ")";
          break;
        default:
          break;
        }
      });
      headerTracepoint += "\n\t)\n)";
      headerTracepoints.push(headerTracepoint);
    });

    build = true;
    if(build){
      generateOutputDir();
      generateTpHeader(headerTracepoints);
      generateTpNativeCaller(nanTracepoints);
      generateTpJSControllers();
      generateAdditionalFiles();

      compileGeneratedFiles();
    }
  };
};

module.exports = NftraceGen;