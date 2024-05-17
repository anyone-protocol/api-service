import * as geoip from 'geoip-lite';

export class GeoLiteService {

    // https://github.com/geoip-lite/node-geoip
    ipToGeo(ip: string): number[]|null {
        return geoip.lookup(ip)?.ll?? null;
    } 

}
