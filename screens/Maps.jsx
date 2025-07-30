import React, { useState, useRef } from "react";
import { View, TextInput, StyleSheet, FlatList, TouchableOpacity, Text } from "react-native";
import MapView, { Marker, UrlTile, Polyline } from "react-native-maps";

export default function MapScreen() {
  const [startLocation, setStartLocation] = useState("");
  const [destination, setDestination] = useState("");
  const [startMarker, setStartMarker] = useState(null);
  const [destinationMarker, setDestinationMarker] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [activeSearch, setActiveSearch] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [distance, setDistance] = useState(null);
  const mapRef = useRef(null);

  // Function to calculate the distance using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 6371; // Radius of Earth in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(2);
  };

  const fetchSuggestions = async (query) => {
    if (query.length < 2) return;
    try {
      const response = await fetch(`https://photon.komoot.io/api/?q=${query}`);
      const data = await response.json();
      if (data.features) setSuggestions(data.features);
    } catch (error) {
      console.error("Error fetching location suggestions:", error);
    }
  };

  const handleLocationSelect = async (place) => {
    setSuggestions([]);
    const { coordinates } = place.geometry;
    const newRegion = {
      latitude: coordinates[1],
      longitude: coordinates[0],
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    };

    if (mapRef.current) {
      mapRef.current.animateToRegion(newRegion, 1000);
    }

    if (activeSearch === "start") {
      setStartLocation(place.properties.name);
      setStartMarker({ latitude: coordinates[1], longitude: coordinates[0] });
    } else {
      setDestination(place.properties.name);
      setDestinationMarker({ latitude: coordinates[1], longitude: coordinates[0] });
    }

    // if (startMarker && destinationMarker) {
    //     fetchRoute({ 
    //       start: { latitude: startMarker.latitude, longitude: startMarker.longitude }, 
    //       end: { latitude: coordinates[1], longitude: coordinates[0] } 
    //     });
    //   }
  };

  const fetchRoute = async () => {
    if (!startLocation || !destination) return;

    try {
        const url = `https://router.project-osrm.org/route/v1/driving/${startMarker.longitude},${startMarker.latitude};${destinationMarker.longitude},${destinationMarker.latitude}?overview=full&geometries=geojson`;
        const response = await fetch(url);
      const data = await response.json();

      if (data?.routes?.length > 0) {
        // Extract coordinates from GeoJSON
        const coords = data.routes[0].geometry.coordinates.map(([lon, lat]) => ({
          latitude: lat,
          longitude: lon,
        }));
        setRouteCoords(coords);
      }
    } catch (error) {
      console.error("Error fetching route:", error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Search Bar Container */}
      <View style={styles.searchContainer}>
        {/* Start Location Search */}
        <TextInput
          style={styles.searchBar}
          placeholder="Start Location"
          value={startLocation}
          onFocus={() => setActiveSearch("start")}
          onChangeText={(text) => {
            setStartLocation(text);
            fetchSuggestions(text);
          }}
        />
        
        {/* Destination Search */}
        <TextInput
          style={styles.searchBar}
          placeholder="Destination"
          value={destination}
          onFocus={() => setActiveSearch("destination")}
          onChangeText={(text) => {
            setDestination(text);
            fetchSuggestions(text);
            
          }}
        />
      </View>

      {/* Dropdown Suggestions */}
      {suggestions.length > 0 && (
        <FlatList
          data={suggestions}
          keyExtractor={(item, index) => `${item.properties.osm_id}-${index}`}
          style={styles.suggestionsList}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => {handleLocationSelect(item)}}
              style={styles.suggestionItem}
            >
              <Text>{item.properties.name}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: 37.7749,
          longitude: -122.4194,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
      >
        <UrlTile urlTemplate="https://a.tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} />

        {/* Start Marker */}
        {startMarker && <Marker coordinate={startMarker} title="Start Location" pinColor="blue" />}

        {/* Destination Marker */}
        {destinationMarker && <Marker coordinate={destinationMarker} title="Destination" pinColor="red" />}

        {/* Draw Route */}
        {routeCoords.length > 0 && <Polyline coordinates={routeCoords} strokeWidth={10} strokeColor="blue" />}
      </MapView>

     <TouchableOpacity style = {styles.button} onPress={fetchRoute} ><Text style = {{color: 'white'}}>fetch route</Text></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchContainer: {
    position: "absolute",
    top: 40,
    left: 10,
    right: 10,
    zIndex: 1,
    elevation: 5,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  searchBar: {
    backgroundColor: "white",
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
  },
  suggestionsList: {
    backgroundColor: "white",
    borderRadius: 5,
    maxHeight: 200,
    marginTop: 5,
    position: "absolute",
    top: 90,
    left: 10,
    right: 10,
    zIndex: 2,
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  map: { flex: 1 },
  distanceContainer: {
    position: "absolute",
    bottom: 50,
    left: "30%",
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 10,
    borderRadius: 8,
    zIndex: 1
  },
  distanceText: {
    color: "white",
    fontSize: 16,
  },
  button:{
    zIndex: 3 ,backgroundColor: "rgba(0, 0, 0, 0.54)" , color: 'white' , position: 'absolute' , top: "80%" , left: "4  0%", padding: 10 , borderRadius: 10 , opacity: "10%"
  }
});

