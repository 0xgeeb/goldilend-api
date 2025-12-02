#!/bin/bash

# Test live Goldilend API endpoints

# Test with a sample address (update YOUR_DOMAIN_HERE)
curl -X GET "http://98.81.96.90:3001/ownedBeras/0x8FE7E03B5b2E49E3386BE79f0834B4B6D08E095c" | jq '.'

# Test with another address (uncomment to use)
# curl -X GET "http://98.81.96.90:3001/ownedBeras/0xAnotherAddress" | jq '.'
