job "resolve-anyone-domain-owners-stage" {
  datacenters = ["ator-fin"]
  type = "batch"
  namespace = "stage-services"
  
  reschedule { attempts = 0 }

  constraint {
    attribute = "${meta.pool}"
    value = "stage"
  }

  periodic {
    crons            = [ "@hourly" ]
    prohibit_overlap = true
  }

  group "resolve-anyone-domain-owners-stage-group" {
  	count = 1

    task "resolve-anyone-domain-owners-stage-task" {
      driver = "docker"

      config {
        image = "ghcr.io/anyone-protocol/api-service:${VERSION}"
        entrypoint = [ "npx" ]
        command = "tsx"
        args = [ "resolve-anyone-domain-owners.ts" ]
      }

      vault {
        role = "any1-nomad-workloads-controller"
      }

      identity {
        name = "vault_default"
        aud  = ["any1-infra"]
        ttl  = "1h"
      }

      env {
        VERSION="DEPLOY_TAG"
        UNS_START_BLOCK=32615764
        UNS_REGISTRY_ADDRESS="0xF6c1b83977DE3dEffC476f5048A0a84d3375d498"
        UNS_METADATA_URL="https://api.unstoppabledomains.com/metadata"
        UNS_TLD="anyone"
      }

      template {
        data = <<-EOH
        {{ with secret "kv/stage-services/resolve-anyone-domain-owners-stage" }}
        JSON_RPC_URL="https://base-mainnet.infura.io/v3/{{ .Data.data.INFURA_API_KEY_0 }}"
        {{ end }}
        EOH
        destination = "secrets/keys.env"
        env         = true
      }

      template {
        data = <<-EOH
        MONGO_URI="mongodb://10.1.5.1:37002/api-service-stage"
        # {{- range service "validator-stage-mongo" }}
        # MONGO_URI="mongodb://{{ .Address }}:{{ .Port }}/api-service-stage"
        # {{- end }}
        EOH
        destination = "local/config.env"
        env         = true
      }

      restart {
        attempts = 0
        mode     = "fail"
      }

      resources {
        cpu    = 1024
        memory = 1024
      }
    }
  }
}
