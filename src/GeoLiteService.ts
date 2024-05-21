import * as geoip from 'geoip-lite';

export class GeoLiteService {

    ipToGeo(ip: string): number[]|null {
        return geoip.lookup(ip)?.ll?? null;
    } 

}
