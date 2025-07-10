job "api-service-stage" {
  datacenters = ["ator-fin"]
  type = "service"
  namespace = "stage-services"
  
  constraint {
    attribute = "${meta.pool}"
    value = "stage"
  }

  group "api-service-stage-group" {
    count = 1

    update {
      max_parallel     = 1
      canary           = 1
      min_healthy_time = "30s"
      healthy_deadline = "5m"
      auto_revert      = true
      auto_promote     = true
    }

    network {
      mode = "bridge"
      port "http-port" {
        host_network = "wireguard"
      }
    }

    volume "api-service-stage" {
      type      = "host"
      read_only = false
      source    = "api-service-stage"
    }

    service {
      name = "api-service-stage"
      port = "http-port"
      tags = [
        "logging",
        "traefik-ec.enable=true",
        "traefik-ec.http.routers.api-stage.rule=Host(`api-stage.ec.anyone.tech`)",
        "traefik-ec.http.routers.api-stage.entrypoints=https",
        "traefik-ec.http.routers.api-stage.tls=true",
        "traefik-ec.http.routers.api-stage.tls.certresolver=anyoneresolver",
        "traefik-ec.http.routers.api-stage.middlewares=api-stage-ratelimit",
        "traefik-ec.http.middlewares.api-stage-ratelimit.ratelimit.average=1000"
      ]
      check {
        name = "Api service check"
        type = "tcp"
        port = "http-port"
        path = "/"
        interval = "10s"
        timeout = "10s"
        address_mode = "alloc"
        check_restart {
          limit = 10
          grace = "30s"
        }
      }
    }

    task "api-service-stage-task" {
      driver = "docker"

      template {
        data = <<-EOH
	      {{- range service "victoriametrics-db" }}
  	    VICTORIA_METRICS_ADDRESS="http://{{ .Address }}:{{ .Port }}"
	      {{- end }}
  
        {{- range service "onionoo-war-live" }}
        ONIONOO_INSTANCE="{{ .Address }}:{{ .Port }}"
        {{- end }}
        ONIONOO_PROTOCOL="http://"
        CLUSTER="local"
        ENV="main"
        JOB="consulagentonionoo"
        HEXAGON_RESOLUTION="4"
        GEODATADIR="/api-service-stage/geo-ip-db/data"
        GEOTMPDIR="/api-service-stage/tmp"
        EOH
        destination = "local/config.env"
        env = true
      }

      volume_mount {
        volume      = "api-service-stage"
        destination = "/api-service-stage"
        read_only   = false
      }

      config {
        image = "ghcr.io/anyone-protocol/api-service:DEPLOY_TAG"
        force_pull = true
      }

      service {
        name = "api-service-stage"
        tags = [ "logging" ]
      }

      resources {
        cpu = 256
        memory = 1024
      }

    }

    task "varnish-cache-stage-task" {
      driver = "docker"

      template {
        data = <<-EOH
        VARNISH_HTTP_PORT="{{ env `NOMAD_PORT_http_port` }}"
        EOH
        destination = "local/file.env"
        env = true
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
