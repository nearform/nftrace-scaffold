var fs = require('fs');

function NftraceGen(provider) {
  if (provider === 'undefined') {
    this.provider = "nearform";
  } else {
    this.provider = provider;
  }
  this.probes = [];
  this.args = {};
  this.fields = {};

  this.setProvider = function (name) {
    this.provider = name;
  };

  this.createProbe = function (probeName, args, fields) {
    this.probes.push(probeName);
    this.args[probeName] = args;
    this.fields[probeName] = fields;
  };

  this.generateOutputDir = function () {
    fs.mkdirSync("./nftrace-output");
    fs.mkdirSync("./nftrace-output/src");
    fs.mkdirSync("./nftrace-output/lib");
  };

  this.generateTpHeader = function (headerTracepoints) {
    var path = "./nftrace/templates/generated-tp-template.h";
    var contents = fs.readFileSync(path, 'utf8');
    contents = contents.replace("<PROVIDER>", this.provider);
    var re = "\"" + this.provider + "-tp.h\"";
    contents = contents.replace("<GENERATED-TP.H>", re);
    contents = contents.replace("<PROVIDER_TP_H>", this.provider.toUpperCase() +"_TP_H");
    contents = contents.replace("<PROVIDER_TP_H>", this.provider.toUpperCase() +"_TP_H");
    var tracepoints = "";
    headerTracepoints.forEach(function (tracepoint) {
      tracepoints += tracepoint;
    });
    contents = contents.replace("<TRACEPOINT_EVENTS>", tracepoints);
    fs.writeFileSync("./nftrace-output/src/" + this.provider + "-tp.h", contents);


    path = "./nftrace/templates/generated-tp-template.cc";

    contents = fs.readFileSync(path, 'utf8');
    contents = contents.replace("<PROVIDER>", this.provider);
    fs.writeFileSync("./nftrace-output/src/" + this.provider + "-tp.cc", contents);
    console.log("Tracepoints generated.");
  };

  this.generateTpNativeCaller = function (nanTracepoints) {
    var path = "./nftrace/templates/nftracepoints-template.cc";
    var contents = fs.readFileSync(path, 'utf8');
    var re = "\"" + this.provider + "-tp.h\"";
    contents = contents.replace("<GENERATED-TP.H>", re);
    var tracepoints = "";
    nanTracepoints.forEach(function (tracepoint) {
      tracepoints += tracepoint;
    });
    contents = contents.replace("<NAN_METHODS>", tracepoints);
    var exports = "";
    this.probes.forEach(function (probeName) {
      exports += "exports->Set(NanNew(\"fire" + probeName + "\"), NanNew<FunctionTemplate>(Fire" + probeName + ")->GetFunction());\n";
    });
    contents = contents.replace("<INIT_EXPORTS>", exports);
    fs.writeFileSync("./nftrace-output/src/nftracepoints.cc", contents);
    console.log("native link to tracepoints generated.");
  };

  this.generateTpJSControllers = function () {
    var path = "./nftrace/templates/nfprobeController-template.js";
    var contents = fs.readFileSync(path, 'utf8');
    var fireMethodLogic = "switch (probeName){";
    var args = this.args;
    this.probes.forEach(function (probeName) {
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
    fs.writeFileSync("./nftrace-output/lib/nfprobeController.js", contents);
    //javascript created.
  };

  this.generateAdditionalFiles = function () {
    var path = "./nftrace/templates/package.json";
    var contents = fs.readFileSync(path, 'utf8');
    fs.writeFileSync("./nftrace-output/package.json", contents);
    path = "./nftrace/templates/generated-binding.gyp";
    contents = fs.readFileSync(path, 'utf8');
    contents = contents.replace("<PROVIDER>", this.provider);
    fs.writeFileSync("./nftrace-output/binding.gyp", contents);
    console.log("Scaffolding is finished... now to try to build!");
  };

  this.compileGeneratedFiles = function () {
    var exec = require('child_process').exec;
    
    exec('cd ./nftrace-output && npm install && cd ..', function (error, stdout, stderr) {
      console.log(stdout);
      console.error(stderr);
      console.log("\n\n\nfinished!");
    });
  };

  //finaliseProbes must create 4 files, 
  //the .cc, the .h probes, and the .js files.
  //.cc is the native code for firing tracepoints
  //.h is the tracepoints to be compiled
  //.js is the wrapper around the .cc compiled output.
  this.finaliseProbes = function () {
    var headerTracepoints = [];
    var nanTracepoints = [];
    var args = this.args;
    var fields = this.fields;
    var provider = this.provider;
    this.probes.forEach(function (probeName) {
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
      nanTracepoint += "\n\t" + nanCallTracepointSignature + ");\n\nNanReturnUndefined();\n}\n";

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
      this.generateOutputDir();
      this.generateTpHeader(headerTracepoints);
      this.generateTpNativeCaller(nanTracepoints);
      this.generateTpJSControllers();
      this.generateAdditionalFiles();

      this.compileGeneratedFiles();
    }
  };
};

module.exports = NftraceGen;