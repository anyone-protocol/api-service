job "metrics-service-dev" {
  datacenters = [
    "ator-fin"]
  type = "service"
  namespace = "ator-network"

  group "metrics-service-dev-group" {
    count = 1

    network {
      mode = "bridge"
      port "http-port" {
        static = 9033
        to = 3000
        #host_network = "wireguard"
      }
    }

    task "metrics-service-dev-task" {
      driver = "docker"

      template {
        data = <<EOH
	{{- range nomadService "victoriametrics-db" }}
  	    VICTORIA_METRICS_ADDRESS="http://{{ .Address }}:{{ .Port }}"
	{{ end -}}
        INSTANCE="10.1.244.1:9090"
        CLUSTER="local"
        ENV="main"
        JOB="consulagentonionoo"
            EOH
        destination = "secrets/file.env"
        env = true
      }

      config {
        image = "svforte/metrics-service:latest-dev"
        force_pull = true
        ports = [
          "http-port"]
      }

      resources {
        cpu = 256
        memory = 256
      }

      service {
        name = "metrics-service-dev"
        port = "http-port"
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
    }

  }
}
