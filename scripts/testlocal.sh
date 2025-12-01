#!/bin/bash

# Test local Goldilend API endpoints

# Test with a sample address
curl -X GET "http://localhost:3001/ownedBeras/0xYourAddressHere" | jq '.'

# Test with another address (uncomment to use)
# curl -X GET "http://localhost:3001/ownedBeras/0xAnotherAddress" | jq '.'
