import { Reader } from '@maxmind/geoip2-node';
import * as fs from 'fs';
import * as path from 'path';

export interface GeoData {
    coordinates: number[];
    countryCode?: string;
    countryName?: string;
    regionName?: string;
    cityName?: string;
    timezone?: string;
    asNumber?: string;
    asName?: string;
}

export class GeoLiteService {
    private cityReader: any = null; // ReaderModel
    private asnReader: any = null;  // ReaderModel

    constructor() {
        this.initializeReaders();
    }

    private async initializeReaders() {
        try {
            // Get base directory from environment or use default
            const baseDir = process.env.GEODATADIR || '/usr/local/share/GeoIP';
            
            // Try to load GeoLite2 City database
            const cityDbPath = process.env.GEOLITE2_CITY_DB || path.join(baseDir, 'GeoLite2-City.mmdb');
            if (fs.existsSync(cityDbPath)) {
                this.cityReader = await Reader.open(cityDbPath);
                console.log('GeoLite2 City database loaded successfully from:', cityDbPath);
            } else {
                console.warn('GeoLite2 City database not found at:', cityDbPath);
            }

            // Try to load GeoLite2 ASN database
            const asnDbPath = process.env.GEOLITE2_ASN_DB || path.join(baseDir, 'GeoLite2-ASN.mmdb');
            if (fs.existsSync(asnDbPath)) {
                this.asnReader = await Reader.open(asnDbPath);
                console.log('GeoLite2 ASN database loaded successfully from:', asnDbPath);
            } else {
                console.warn('GeoLite2 ASN database not found at:', asnDbPath);
            }
        } catch (error) {
            console.error('Error initializing GeoLite2 readers:', error);
        }
    }

    ipToGeo(ip: string): number[] | null {
        try {
            if (!this.cityReader) {
                return null;
            }
            
            const response = this.cityReader.city(ip);
            if (response.location?.latitude && response.location?.longitude) {
                return [response.location.latitude, response.location.longitude];
            }
            return null;
        } catch (error) {
            console.error('Error looking up IP coordinates:', error);
            return null;
        }
    }

    ipToGeoData(ip: string): GeoData | null {
        try {
            const coordinates = this.ipToGeo(ip);
            if (!coordinates) {
                return null;
            }

            const geoData: GeoData = {
                coordinates
            };

            // Get detailed city/country information
            if (this.cityReader) {
                try {
                    const cityResponse = this.cityReader.city(ip);
                    
                    geoData.countryCode = cityResponse.country?.isoCode;
                    geoData.countryName = cityResponse.country?.names?.en;
                    geoData.regionName = cityResponse.subdivisions?.[0]?.names?.en;
                    geoData.cityName = cityResponse.city?.names?.en;
                    geoData.timezone = cityResponse.location?.timeZone;
                } catch (error) {
                    console.error('Error getting city data:', error);
                }
            }

            // Get ASN information
            if (this.asnReader) {
                try {
                    const asnResponse = this.asnReader.asn(ip);
                    geoData.asNumber = asnResponse.autonomousSystemNumber?.toString();
                    geoData.asName = asnResponse.autonomousSystemOrganization;
                } catch (error) {
                    console.error('Error getting ASN data:', error);
                }
            }

            return geoData;
        } catch (error) {
            console.error('Error in ipToGeoData:', error);
            return null;
        }
    }

    close() {
        if (this.cityReader) {
            this.cityReader = null;
        }
        if (this.asnReader) {
            this.asnReader = null;
        }
    }
}
