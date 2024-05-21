job "api-service-stage" {
  datacenters = ["ator-fin"]
  type = "service"
  namespace = "ator-network"

  group "api-service-stage-group" {
    count = 1

    network {
      mode = "bridge"
      port "http-port" {
        static = 9133
        to = 80
        host_network = "wireguard"
      }
    }

    task "api-service-stage-task" {
      driver = "docker"

      template {
        data = <<EOH
	{{- range nomadService "victoriametrics-db" }}
  	    VICTORIA_METRICS_ADDRESS="http://{{ .Address }}:{{ .Port }}"
	{{ end -}}
        ONIONOO_INSTANCE="10.1.244.1:9190"
        ONIONOO_PROTOCOL="http://"
        CLUSTER="local"
        ENV="main"
        JOB="consulagentonionoo"
        HEXAGON_RESOLUTION="4"
        GEODATADIR="/usr/src/app/data/node_modules/geoip-lite/data"
      	GEOTMPDIR="/usr/src/app/data/node_modules/geoip-lite/tmp"
            EOH
        destination = "secrets/file.env"
        env = true
      }

      config {
        image = "svforte/api-service:latest-stage"
        force_pull = true
      }

      resources {
        cpu = 256
        memory = 256
      }

    }

    task "varnish-cache-stage-task" {
      driver = "docker"

      env {
        VARNISH_HTTP_PORT = "80"
      }

      config {
        image = "varnish"
        force_pull = true
        volumes = [
          "local/default.vcl:/etc/varnish/default.vcl:ro"
        ]
        ports = ["http-port"]
      }

      resources {
        cpu = 256
        memory = 256
      }

      service {
        name = "api-service-stage"
        port = "http-port"
        tags = [
          "traefik.enable=true",
          "traefik.http.routers.api-stage.rule=Host(`api-stage.dmz.ator.dev`)",
          "traefik.http.routers.api-stage.entrypoints=https",
          "traefik.http.routers.api-stage.tls=true",
          "traefik.http.routers.api-stage.tls.certresolver=atorresolver",
          "traefik.http.routers.api-stage.middlewares=api-stage-ratelimit",
          "traefik.http.middlewares.api-stage-ratelimit.ratelimit.average=300",
          "traefik.http.middlewares.api-stage-ratelimit.ratelimit.period=1m",
        ]
        check {
          name = "Api service check"
          type = "tcp"
          port = "http-port"
          path = "/"
          interval = "10s"
          timeout = "10s"
          check_restart {
            limit = 10
            grace = "30s"
          }
        }
      }

      template {
        change_mode = "noop"
        data        = <<EOH
        vcl 4.0;

        backend default {
            .host = "127.0.0.1";
            .port = "3000";
        }

        sub vcl_backend_response {
            set beresp.ttl = 1h;
        }
        EOH
        destination = "local/default.vcl"
      }
    }
  }
}
