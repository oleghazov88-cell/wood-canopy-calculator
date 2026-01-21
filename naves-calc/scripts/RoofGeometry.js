class RoofGeometry {
    constructor() {
        // Initialize roof geometry logic
    }

    static calculateSlope(run, rise) {
        if (run === 0) return 0;
        return Math.atan(rise / run);
    }
}

if (typeof window !== 'undefined') {
    window.RoofGeometry = RoofGeometry;
}
