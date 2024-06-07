vcl 4.0;
import std;

backend default {
    .host = "api-service";
    .port = "3000";
}

sub vcl_backend_response {
    set beresp.ttl = 1m;
}
