var Nftrace = require('..');

var nftrace = new Nftrace('nearform', './node_modules');

nftrace.createProbe('httpReq', ['string: request', 'string: reply'], ['request', 'reply']);

nftrace.finaliseProbes();