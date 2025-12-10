#!/bin/bash

# Supertonic TTS Demo Setup Script
# This script downloads the required ONNX models from Hugging Face

set -e

echo "==================================="
echo "Supertonic TTS Demo Setup"
echo "==================================="
echo ""

# Check if git-lfs is installed
if ! command -v git-lfs &> /dev/null; then
    echo "Warning: git-lfs is not installed."
    echo "Install it with: brew install git-lfs (macOS) or apt install git-lfs (Linux)"
    echo ""
fi

# Check if assets directory exists
if [ -d "assets" ]; then
    echo "Assets directory already exists."
    read -p "Do you want to re-download? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping download. Run 'npm run dev' to start the server."
        exit 0
    fi
    rm -rf assets
fi

echo "Cloning Supertonic models from Hugging Face..."
echo "(This may take a while - models are ~200MB)"
echo ""

git clone https://huggingface.co/Supertone/supertonic assets

echo ""
echo "==================================="
echo "Setup complete!"
echo "==================================="
echo ""
echo "To run the demo:"
echo "  1. npm install"
echo "  2. npm run dev"
echo ""
echo "Then open http://localhost:5173 in your browser"
