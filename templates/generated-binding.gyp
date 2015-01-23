{

	'conditions': [
        ['OS=="linux"', {
            "targets": [
    			{
      				"target_name": "nftracepoints",
      				"sources": [ "./src/nftracepoints.cc", "./src/<PROVIDER>-tp.cc"],
      				"include_dirs": [ "<!(node -e \"require('nan')\")", "./src" ],
      				"libraries": [ "-llttng-ust" ]
    			}
  			]
        },
        {
            'targets': [ 
                {
                    'target_name': 'lttngStub',
                    'type': 'none'
                }
            ]
        }]
    ]

  
}