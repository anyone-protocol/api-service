job "api-service-live" {
  datacenters = ["ator-fin"]
  type = "service"
  namespace = "ator-network"

  group "api-service-live-group" {
    count = 1

    network {
      mode = "bridge"
      port "http-port" {
        host_network = "wireguard"
      }
    }

    volume "api-service-live" {
      type      = "host"
      read_only = false
      source    = "api-service-live"
    }

    task "api-service-live-task" {
      driver = "docker"

      template {
        data = <<EOH
	{{- range nomadService "victoriametrics-db" }}
  	    VICTORIA_METRICS_ADDRESS="http://{{ .Address }}:{{ .Port }}"
	{{ end -}}
        ONIONOO_INSTANCE="10.1.244.1:9290"
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
        volume      = "api-service-live"
        destination = "/usr/src/app/data"
        read_only   = false
      }

      config {
        image = "ghcr.io/anyone-protocol/api-service:DEPLOY_TAG"
        force_pull = true
      }

      service {
        name = "api-service-live"
        tags = [ "logging" ]
      }

      resources {
        cpu = 256
        memory = 4096
      }

    }

    task "varnish-cache-live-task" {
      driver = "docker"

      template {
        data = <<EOH
      	  VARNISH_HTTP_PORT="{{ env `NOMAD_PORT_http_port` }}"
        EOH
        destination = "local/file.env"
        env = true
      }

      config {
        image = "varnish"
        volumes = [
          "local/default.vcl:/etc/varnish/default.vcl:ro"
        ]
        ports = ["http-port"]
      }

      resources {
        cpu = 256
        memory = 1024
      }

      service {
        name = "api-service-live"
        port = "http-port"
        tags = [
          "logging",
          "traefik.enable=true",
          "traefik.http.routers.api-live.rule=Host(`api-live.dmz.ator.dev`)",
          "traefik.http.routers.api-live.entrypoints=https",
          "traefik.http.routers.api-live.tls=true",
          "traefik.http.routers.api-live.tls.certresolver=atorresolver",
          "traefik.http.routers.api-live.middlewares=api-live-ratelimit",
          "traefik.http.middlewares.api-live-ratelimit.ratelimit.average=1000",
          
          "traefik-ec.enable=true",
          "traefik-ec.http.routers.api-live.rule=Host(`api.ec.anyone.tech`)",
          "traefik-ec.http.routers.api-live.entrypoints=https",
          "traefik-ec.http.routers.api-live.tls=true",
          "traefik-ec.http.routers.api-live.tls.certresolver=anyoneresolver",
          "traefik-ec.http.routers.api-live.middlewares=api-live-ratelimit",
          "traefik-ec.http.middlewares.api-live-ratelimit.ratelimit.average=1000",
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
