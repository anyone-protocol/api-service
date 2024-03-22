job "metrics-service" {
  datacenters = ["ator-fin"]
  type        = "service"
  namespace   = "ator-network"

  group "metrics-service-group" {
    count = 1

    network {
      mode = "bridge"
      port "http-port" {
        static       = 9033
        to           = 3000
        #host_network = "wireguard"
      }
    }

    task "metrics-service-task" {
      driver = "docker"

      template {
        data        = <<EOH
	{{- range nomadService "victoriametrics-db" }}
  	    VICTORIA_METRICS_ADDRESS="http://{{ .Address }}:{{ .Port }}"
	{{ end -}}
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
        name = "metrics-service"
        port = "http-port"
        check {
          name     = "Metrics service check"
          type     = "http"
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
