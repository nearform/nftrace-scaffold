
#undef TRACEPOINT_PROVIDER
#define TRACEPOINT_PROVIDER <PROVIDER>

#undef TRACEPOINT_INCLUDE
#define TRACEPOINT_INCLUDE <GENERATED-TP.H>

#if !defined(<PROVIDER_TP_H>) || defined(TRACEPOINT_HEADER_MULTI_READ)
#define <PROVIDER_TP_H>

#include <lttng/tracepoint.h>

<TRACEPOINT_EVENTS>

#endif /* LTTNG_TP_H */

#include <lttng/tracepoint-event.h>
