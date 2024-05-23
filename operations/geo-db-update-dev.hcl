job "api-service-geoip-db-update-job-dev" {
  datacenters = ["ator-fin"]
  type = "batch"
  namespace = "ator-network"
  
  periodic {
    crons            = [ "0 3 * * 3,6" ] # every Wed and Sat at 3am
    prohibit_overlap = true
  }
  
  group "api-service-geoip-db-update-job-dev" {
  	
    volume "api-service-dev" {
      type      = "host"
      read_only = false
      source    = "api-service-dev"
    }
    
    vault {
      policies = ["geo-ip-maxmind"]
    }
  
    task "geoip-db-update-script" {
      driver = "docker"
      
      volume_mount {
        volume      = "api-service-dev"
        destination = "/data"
        read_only   = false
      }

      template {
        data = <<EOH
          {{with secret "kv/geo-ip-maxmind"}}
            LICENSE_KEY="{{.Data.data.SECRET_KEY}}"
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