#!/bin/bash

# Create models directory if it doesn't exist
mkdir -p public/models

# Base URL for model files
BASE_URL="https://raw.githubusercontent.com/vladmandic/face-api/master/model"

# List of files to download
FILES=(
    "tiny_face_detector_model-shard1"
    "tiny_face_detector_model-weights_manifest.json"
    "face_landmark_68_model-shard1"
    "face_landmark_68_model-weights_manifest.json"
    "face_expression_model-shard1"
    "face_expression_model-weights_manifest.json"
)

# Download each file
for file in "${FILES[@]}"; do
    echo "Downloading $file..."
    curl -L -o "public/models/$file" "$BASE_URL/$file"
    echo "Downloaded $file"
done

echo "All model files downloaded successfully!"