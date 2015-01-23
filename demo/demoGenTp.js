var Nftrace = require('..');

var nftrace = new Nftrace('nearform');

nftrace.createProbe('httpReq', ['string: request', 'string: reply'], ['request', 'reply']);

nftrace.finaliseProbes();