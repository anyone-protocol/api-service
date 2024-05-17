import * as geoip from 'geoip-lite';

export class GeoLiteService {

    // https://github.com/geoip-lite/node-geoip
    ipToGeo(ip: string): number[] {
        return geoip.lookup(ip).ll;
    } 

}
