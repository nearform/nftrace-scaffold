#include <nan.h>
#include <GENERATED-TP.H>

using namespace v8;

<NAN_METHODS>

void Init(Handle<Object> exports) {
	<INIT_EXPORTS>
}

NODE_MODULE(nftracepoints, Init);

