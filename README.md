# metrics-service

This is a service that provides metrics from a Victoria Metrics instance. 
Not all metrics are available, only specific ones.

There are 3 different instances of the service running for each environment:

- https://api-dev.dmz.ator.dev
- https://api-stage.dmz.ator.dev
- https://api-live.dmz.ator.dev

For now there are only three metrics endpoints on each environment available:

- /total-relays
- /total-observed-bandwidth
- /average-bandwidth-rate

Each endpoint returns data grouped by status: 
- Online
- Offline
- All

By default, data is returned for the last 7 days with interval to 6 hours

In order to change time range and data points interval there are 3 query parameters available:

- from
- to
- interval

The format for the follows the format of Victoria Metrics query_range parameters. (https://docs.victoriametrics.com/keyconcepts/#range-query)

Name relation of this service to VM (from -> start, to -> end, interval -> step)

Example:

```https://api-dev.dmz.ator.dev/total-relays?from=3d&to=now&interval=12h```

Will return the total relays for the last 3 days with interval of 12 hours.

## Relay search

There is also a relay search endpoint available on each environment:

- /relays/{fingerprint}

It allows seeing for a specific relay by its fingerprint. The fingerprint is the unique identifier of a relay.

Example:

```https://api-dev.dmz.ator.dev/relays/54FC95706E969D4FC46974439D1D698AD1C84B64```   

Will return the data for the relay with the fingerprint:

```
{
    "fingerprint": "54FC95706E969D4FC46974439D1D698AD1C84B64",
    "running": true,
    "consensus_weight": 20
}
```