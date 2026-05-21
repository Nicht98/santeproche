#!/bin/bash
set -e

PROFILE="${OSRM_PROFILE:-/opt/car.lua}"
DATA_DIR="${OSRM_DATA_DIR:-/data}"
REGION="${OSRM_REGION:-cameroon}"
OSM_URL="${OSRM_OSM_URL:-https://download.geofabrik.de/africa/cameroon-latest.osm.pbf}"

OSRM_FILE="$DATA_DIR/$REGION.osrm"
OSM_FILE="$DATA_DIR/$REGION.osm.pbf"

if [ ! -f "$OSRM_FILE" ]; then
    echo "[OSRM] Data not found. Downloading..."
    if [ ! -f "$OSM_FILE" ]; then
        echo "[OSRM] Downloading OSM data from $OSM_URL"
        wget -q --show-progress -O "$OSM_FILE" "$OSM_URL"
    fi
    echo "[OSRM] Extracting..."
    osrm-extract -p "$PROFILE" "$OSM_FILE"
    echo "[OSRM] Partitioning..."
    osrm-partition "$OSRM_FILE"
    echo "[OSRM] Customizing..."
    osrm-customize "$OSRM_FILE"
    echo "[OSRM] Cleaning up OSM file..."
    rm -f "$OSM_FILE"
fi

echo "[OSRM] Starting routed server on port 5000..."
exec osrm-routed --algorithm mld --port 5000 "$OSRM_FILE"
