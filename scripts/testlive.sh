#!/bin/bash

# Test live Goldilend API endpoints

# Test with a sample address (update YOUR_DOMAIN_HERE)
curl -X GET "https://YOUR_DOMAIN_HERE/ownedBeras/0xYourAddressHere" | jq '.'

# Test with another address (uncomment to use)
# curl -X GET "https://YOUR_DOMAIN_HERE/ownedBeras/0xAnotherAddress" | jq '.'
