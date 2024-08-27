job "api-service-dev" {
  datacenters = ["ator-fin"]
  type = "service"
  namespace = "ator-network"

  group "api-service-dev-group" {
    count = 1

    network {
      mode = "bridge"
      port "http-port" {
        static = 9033
        to = 80
        host_network = "wireguard"
      }
    }

    volume "api-service-dev" {
      type      = "host"
      read_only = false
      source    = "api-service-dev"
    }

    task "api-service-dev-task" {
      driver = "docker"

      template {
        data = <<EOH
	{{- range nomadService "victoriametrics-db" }}
  	    VICTORIA_METRICS_ADDRESS="http://{{ .Address }}:{{ .Port }}"
	{{ end -}}
        ONIONOO_INSTANCE="10.1.244.1:9090"
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

      volume_mount {
        volume      = "api-service-dev"
        destination = "/usr/src/app/data"
        read_only   = false
      }

      service {
        name = "api-service-dev"
        tags = [ "logging" ]
      }

      config {
        image = "svforte/api-service:latest-dev"
        force_pull = true
      }

      resources {
        cpu = 256
        memory = 256
      }

    }

    task "varnish-cache-dev-task" {
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
        name = "api-service-dev"
        port = "http-port"
        tags = [
          "logging",
          "traefik.enable=true",
          "traefik.http.routers.api-dev.rule=Host(`api-dev.dmz.ator.dev`)",
          "traefik.http.routers.api-dev.entrypoints=https",
          "traefik.http.routers.api-dev.tls=true",
          "traefik.http.routers.api-dev.tls.certresolver=atorresolver",
          "traefik.http.routers.api-dev.middlewares=api-dev-ratelimit",
          "traefik.http.middlewares.api-dev-ratelimit.ratelimit.average=300",
          "traefik.http.middlewares.api-dev-ratelimit.ratelimit.period=1m",
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
            set beresp.ttl = 5m;
        }
        EOH
        destination = "local/default.vcl"
      }
    }
  }
}
