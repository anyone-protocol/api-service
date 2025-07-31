job "api-service-live" {
  datacenters = ["ator-fin"]
  type = "service"
  namespace = "live-services"
  
  constraint {
    attribute = "${meta.pool}"
    value = "live-services"
  }

  group "api-service-live-group" {
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

    volume "api-service-live" {
      type      = "host"
      read_only = false
      source    = "api-service-live"
    }

    service {
      name = "api-service-live"
      port = "http-port"
      tags = [
        "logging",          
        "traefik-ec.enable=true",
        "traefik-ec.http.routers.api-live.rule=Host(`api.ec.anyone.tech`)",
        "traefik-ec.http.routers.api-live.entrypoints=https",
        "traefik-ec.http.routers.api-live.tls=true",
        "traefik-ec.http.routers.api-live.tls.certresolver=anyoneresolver",
        "traefik-ec.http.routers.api-live.middlewares=api-live-ratelimit",
        "traefik-ec.http.middlewares.api-live-ratelimit.ratelimit.average=1000"
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

    task "api-service-live-task" {
      driver = "docker"

      config {
        image = "ghcr.io/anyone-protocol/api-service:DEPLOY_TAG"
        force_pull = true
        command = "node"
        args = [
          "--max-http-header-size", "80000",
          "dist/src/app.js"
        ]
      }

      volume_mount {
        volume      = "api-service-live"
        destination = "/api-service-live"
        read_only   = false
      }

      env {
        VERSION="DEPLOY_TAG"
        ONIONOO_PROTOCOL="http://"
        CLUSTER="local"
        ENV="main"
        JOB="consulagentonionoo"
        HEXAGON_RESOLUTION="4"
        GEODATADIR="/api-service-live/geo-ip-db/data"
        GEOTMPDIR="/api-service-live/tmp"
        UNS_START_BLOCK=32615764
        UNS_REGISTRY_ADDRESS="0xF6c1b83977DE3dEffC476f5048A0a84d3375d498"
        UNS_METADATA_URL="https://api.unstoppabledomains.com/metadata"
        UNS_TLD="anyone"
      }

      consul {}

      template {
        data = <<-EOH
        OPERATOR_REGISTRY_PROCESS_ID="{{ key "smart-contracts/live/operator-registry-address" }}"

        {{- range service "victoriametrics-db" }}
  	    VICTORIA_METRICS_ADDRESS="http://{{ .Address }}:{{ .Port }}"
	      {{- end }}

        {{- range service "onionoo-war-live" }}
        ONIONOO_INSTANCE="{{ .Address }}:{{ .Port }}"
        {{- end }}

        {{- range service "validator-live-mongo" }}
        MONGO_URI="mongodb://{{ .Address }}:{{ .Port }}/api-service-live"
        {{- end }}
        EOH
        destination = "local/config.env"
        env = true
      }

      service {
        name = "api-service-live"
        tags = [ "logging" ]
      }

      resources {
        cpu = 256
        memory = 8192
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
