job "metrics-service-live" {
  datacenters = ["ator-fin"]
  type        = "service"
  namespace   = "ator-network"

  group "metrics-service-live-group" {
    count = 1

    network {
      mode = "bridge"
      port "http-port" {
        static       = 9233
        to           = 3000
        #host_network = "wireguard"
      }
    }

    task "metrics-service-live-task" {
      driver = "docker"

      template {
        data        = <<EOH
	{{- range nomadService "victoriametrics-db" }}
  	    VICTORIA_METRICS_ADDRESS="http://{{ .Address }}:{{ .Port }}"
	{{ end -}}
    {{- range nomadService "onionoo-live" }}
        INSTANCE="{{ .Address }}:{{ .Port }}"
    {{ end -}}
        CLUSTER="local"
        ENV="main"
        JOB="consulagentonionoo"
            EOH
        destination = "secrets/file.env"
        env         = true
      }

      config {
        image      = "svforte/metrics-service:latest"
        force_pull = true
        ports      = ["http-port"]
      }

      resources {
        cpu    = 256
        memory = 256
      }

      service {
        name = "metrics-service-live"
        port = "http-port"
        check {
          name     = "Metrics service check"
          type     = "tcp"
          port     = "http-port"
          path     = "/"
          interval = "10s"
          timeout  = "10s"
          check_restart {
            limit = 10
            grace = "30s"
          }
        }
      }
    }

  }
}
