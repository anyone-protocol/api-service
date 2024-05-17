import { latLngToCell, cellToLatLng, cellToBoundary } from "h3-js";

export class H3Service {

    geoToHex(lat: number, lng: number): string {
        return latLngToCell(lat, lng, 4);
    }

    hexToGeo(hex: string): number[] {
        return cellToLatLng(hex);
    }

    hexToBoundary(hex: string): number[][] {
        return cellToBoundary(hex);
    }

}
