const addMarkersToMap = (locations) => {
    locations.forEach(loc => {
        new mapboxgl.Marker({ color: '#EB5424', scale: 1.2 })
            .setLngLat([loc.longitude, loc.latitude])
            .setPopup(new mapboxgl.Popup().setHTML(loc.name))
            .addTo(mapRef.current);
    });
};
useEffect(() => {
    const loadMarkers = async () => {
        const locations = await PartnerMapService.fetchPartnerLocations();
        addMarkersToMap(locations);  // Special markers added here
    };
    loadMarkers();
}, []);