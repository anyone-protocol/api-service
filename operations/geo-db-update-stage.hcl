job "geo-db-update-stage" {
  datacenters = ["ator-fin"]
  type = "batch"
  namespace = "stage-services"
  
  periodic {
    crons            = [ "0 3 * * 3,6" ] # every Wed and Sat at 3am
    prohibit_overlap = true
  }
  
  group "api-service-geoip-db-update-job-stage" {
  	
    volume "api-service-stage" {
      type      = "host"
      read_only = false
      source    = "api-service-stage"
    }
  
    task "geoip-db-update-script" {
      driver = "docker"
      
      volume_mount {
        volume      = "api-service-stage"
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
          {{with secret "kv/stage-services/geo-db-update-stage"}}
            LICENSE_KEY="{{.Data.data.LICENSE_KEY}}"
          {{end}}
        EOH
        destination = "secrets/file.env"
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