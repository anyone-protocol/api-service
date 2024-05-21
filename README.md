# api-service

One of responsibility of this service is to provide metrics from a Victoria Metrics instance. 
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

# Relay map

This endpoint returns the list of hexagon cells:

- /relay-map

Each cell contains the next information:

- index (Unique hex id)
- relayCount (Number of relays situated in the area of this cell)
- geo (Cell center coordinates)
- boundary (Cell boundaries coordinates)

Default resolution is set to 4. (~ 1,770 km2)

Example:

```
[
    {
        "index": "8426e3dffffffff",
        "relayCount": 3,
        "geo": [
            37.76842673518504,
            -97.56336829110103
        ],
        "boundary": [
            [
                37.526546198152595,
                -97.54660533413032
            ],
            [
                37.65062141667647,
                -97.28829260137934
            ],
            [
                37.89215157242739,
                -97.30445917498328
            ],
            [
                38.0098575245317,
                -97.58020995813281
            ],
            [
                37.885636518843214,
                -97.83942795985186
            ],
            [
                37.64385750929758,
                -97.8219892274576
            ]
        ]
    },
    ...
]
```