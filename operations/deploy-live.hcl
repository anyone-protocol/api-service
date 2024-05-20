job "metrics-service-live" {
  datacenters = ["ator-fin"]
  type = "service"
  namespace = "ator-network"

  group "metrics-service-live-group" {
    count = 1

    network {
      mode = "bridge"
      port "http-port" {
        static = 9233
        to = 80
        host_network = "wireguard"
      }
    }

    task "metrics-service-live-task" {
      driver = "docker"

      template {
        data = <<EOH
	{{- range nomadService "victoriametrics-db" }}
  	    VICTORIA_METRICS_ADDRESS="http://{{ .Address }}:{{ .Port }}"
	{{ end -}}
        HEXAGON_RESOLUTION="4"
        ONIONOO_INSTANCE="10.1.244.1:9290"
        ONIONOO_PROTOCOL="http://"
        CLUSTER="local"
        ENV="main"
        JOB="consulagentonionoo"
            EOH
        destination = "secrets/file.env"
        env = true
      }

      config {
        image = "svforte/metrics-service:latest"
        force_pull = true
      }

      resources {
        cpu = 256
        memory = 256
      }

    }

    task "varnish-cache-live-task" {
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
        name = "metrics-service-live"
        port = "http-port"
        tags = [
          "traefik.enable=true",
          "traefik.http.routers.api-live.rule=Host(`api-live.dmz.ator.dev`)",
          "traefik.http.routers.api-live.entrypoints=https",
          "traefik.http.routers.api-live.tls=true",
          "traefik.http.routers.api-live.tls.certresolver=atorresolver",
          "traefik.http.routers.api-live.middlewares=api-live-ratelimit",
          "traefik.http.middlewares.api-live-ratelimit.ratelimit.average=300",
          "traefik.http.middlewares.api-live-ratelimit.ratelimit.period=1m",
        ]
        check {
          name = "Metrics service check"
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
