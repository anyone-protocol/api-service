job "geo-db-update-stage" {
  datacenters = ["ator-fin"]
  type = "batch"
  namespace = "stage-services"
  
  constraint {
    attribute = "${meta.pool}"
    value = "stage"
  }
  
  periodic {
    crons            = [ "@weekly" ]
    prohibit_overlap = true
  }
  
  group "geo-db-update-stage-group" {
  	count = 1

    volume "api-service-stage" {
      type      = "host"
      read_only = false
      source    = "api-service-stage"
    }

    task "geo-db-update-stage-task" {
      driver = "docker"

      config {
        image = "ghcr.io/anyone-protocol/api-service:[[.image_tag]]"
        command = "npm"
        args = [
          "run",
          "update-geo-ip-db",
          "license_key=$LICENSE_KEY"
        ]
      }

      vault {
        role = "any1-nomad-workloads-controller"
      }

      identity {
        name = "vault_default"
        aud  = ["any1-infra"]
        ttl  = "1h"
      }

      volume_mount {
        volume      = "api-service-stage"
        destination = "/api-service-stage"
        read_only   = false
      }

      env {
        GEODATADIR="/api-service-stage/geo-ip-db/data"
        GEOTMPDIR="/api-service-stage/tmp"
      }

      template {
        data = <<-EOH
        {{ with secret "kv/stage-services/update-geo-ip-db" }}
        LICENSE_KEY="{{ .Data.data.LICENSE_KEY }}"
        {{ end }}
        EOH
        destination = "secrets/keys.env"
        env         = true
      }
    }
  }
}
