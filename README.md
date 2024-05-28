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

# Hardware relay info

This endpoint receives the data from hardware relay and send it to Onionoo in order to persist and expose throught the details endpoint.

POST - /hardware

Example of request body:

```
{
    "id": "HWrelay",
    "company": "anyone.io",
    "format": "broadcast-type:1",
    "wallet": "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF",
    "fingerprint": "251B4B50E915561C3F168FCA1731BB3BCE826256",
    "serNums": [
        {
            "type": "DEVICE",
            "number": "c2eeef8a42a50073"
        },
        {
            "type": "ATEC",
            "number": "0123d4fb782ded6101"
        }
    ],
    "pubKeys": [
        {
            "type": "DEVICE",
            "number": "3a4a8debb486d32d438f38cf24f8b723326fb85cf9c15a2a7f9bc80916dd8d7de8b9990a8fc0a12e72fd990b3569bbbf24970b07a024a03fa51e5b719fe921bf"
        },
        {
            "type": "SIGNER",
            "number": "4aa155e5c04759c5a82cafa7657bc32cc2fecd8eba5f06d0bb2b6709901108e0958ce41737cd4fbf473f5862a81e95a23979bd9083d1c5fe4cc9ceb1ef9c3735"
        }
    ],
    "certs": [
        {
            "type": "DEVICE",
            "certificate": "3082018930820130a003020102020a400123d4fb782ded6101300a06082a8648ce3d040302303a3110300e060355040a0c0761746f722e696f3126302406035504030c1d6332656565663861343261353030373320205369676e65722043343842301e170d3234303530333231303030305a170d3434303530333231303030305a30353110300e060355040a0c0761746f722e696f3121301f06035504030c18485772656c617920415445434336303842204465766963653059301306072a8648ce3d020106082a8648ce3d030107034200043a4a8debb486d32d438f38cf24f8b723326fb85cf9c15a2a7f9bc80916dd8d7de8b9990a8fc0a12e72fd990b3569bbbf24970b07a024a03fa51e5b719fe921bfa3233021301f0603551d23041830168014e4bdb6983417cbdd1e1dd27d67c2287f7e8acc56300a06082a8648ce3d040302034700304402207f7852a552147ed6935d078806485b995acde4f7380faa5de1697b8907c567e702202bb136ecc14bceecd3f363ef3ebc8fdde2da98a3b1f3964a27e69cf532e47163"
        }
    ]
}
```