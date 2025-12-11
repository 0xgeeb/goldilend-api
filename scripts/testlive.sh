#!/bin/bash

# Test live Goldilend API endpoints

# curl -X GET "http://98.81.96.90:3001/ownedBeras/0x8FE7E03B5b2E49E3386BE79f0834B4B6D08E095c" | jq '.'
curl -X GET "http://98.81.96.90:3001/loans/0x8FE7E03B5b2E49E3386BE79f0834B4B6D08E095c" | jq '.'
# curl -X GET "http://98.81.96.90:3001/liquidatable-loans" | jq '.'

# curl -X GET "http://98.81.96.90:3001/ownedBeras/0x6c66a02ee819de7bbb9325f1c65a1c0417df5fd9" | jq '.'
# curl -X GET "http://98.81.96.90:3001/ownedBeras/0x6c66a02ee819de7bbb9325f1c65a1c0417df5fd9" | jq '.'
# curl -X GET "http://98.81.96.90:3001/liquidatable-loans" | jq '.'