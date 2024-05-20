import { latLngToCell, cellToLatLng, cellToBoundary } from "h3-js";

export class H3Service {
    private resolution: number;

    constructor(resolution: number) {
        this.resolution = resolution;
    }

    geoToHex(lat: number, lng: number): string {
        return latLngToCell(lat, lng, this.resolution);
    }

    hexToGeo(hex: string): number[] {
        return cellToLatLng(hex);
    }

    hexToBoundary(hex: string): number[][] {
        return cellToBoundary(hex);
    }

}
