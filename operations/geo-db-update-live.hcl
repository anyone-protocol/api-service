job "geo-db-update-live" {
  datacenters = ["ator-fin"]
  type = "batch"
  namespace = "live-services"
  
  constraint {
    attribute = "${meta.pool}"
    value = "live-services"
  }
  
  periodic {
    crons            = [ "0 3 * * 3,6" ] # every Wed and Sat at 3am
    prohibit_overlap = true
  }
  
  group "api-service-geoip-db-update-job-live" {
  	
    volume "api-service-live" {
      type      = "host"
      read_only = false
      source    = "api-service-live"
    }
  
    task "geoip-db-update-script" {
      driver = "docker"
      
      volume_mount {
        volume      = "api-service-live"
        destination = "/data"
        read_only   = false
      }

      vault {
        role = "any1-nomad-workloads-controller"
      }

      identity {
        name = "vault_default"
        aud  = ["any1-infra"]
        ttl  = "1h"
      }
      
      template {
        data = <<EOH
          {{with secret "kv/live-services/geo-db-update-live"}}
            LICENSE_KEY="{{.Data.data.LICENSE_KEY}}"
          {{end}}
        EOH
        destination = "secrets/keys.env"
        env         = true
      }
      
      config {
        image = "node:14-alpine"
        args = [
          "/bin/sh",
          "-c",
          "cd /data/node_modules/geoip-lite && npm run-script updatedb license_key=$LICENSE_KEY"
        ]
      }
    }
  }
}