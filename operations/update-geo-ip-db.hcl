job "update-geo-ip-db" {
  datacenters = ["ator-fin"]
  type = "batch"
  namespace = "live-services"

  constraint {
    attribute = "${meta.pool}"
    value = "live-services"
  }

  periodic {
    crons            = [ "@weekly" ]
    prohibit_overlap = true
  }

  group "update-geo-ip-db-group" {
    count = 1
  	
    volume "api-service-live" {
      type      = "host"
      read_only = false
      source    = "api-service-live"
    }

    task "update-geo-ip-db-task" {
      driver = "docker"

      config {
        image = "ghcr.io/anyone-protocol/api-service:0aa5a3d035627898612c08225aff95720edcafef"
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
        volume      = "api-service-live"
        destination = "/api-service-live"
        read_only   = false
      }

      env {
        GEODATADIR="/api-service-live/geo-ip-db/data"
        GEOTMPDIR="/api-service-live/tmp"
      }

      template {
        data = <<-EOH
        {{ with secret "kv/live-services/update-geo-ip-db" }}
        LICENSE_KEY="{{ .Data.data.LICENSE_KEY }}"
        {{ end }}
        EOH
        destination = "secrets/keys.env"
        env         = true
      }
    }
  }
}
