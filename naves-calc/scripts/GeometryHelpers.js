const GeometryHelpers = {
    degToRad: function (degrees) {
        return degrees * Math.PI / 180;
    },
    radToDeg: function (radians) {
        return radians * 180 / Math.PI;
    },
    // Add more helpers as needed
};

if (typeof window !== 'undefined') {
    window.GeometryHelpers = GeometryHelpers;
}
