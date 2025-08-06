#!/bin/bash

# test rawdog addy
curl -X GET "http://localhost:3001/ownedBeras/0x8FE7E03B5b2E49E3386BE79f0834B4B6D08E095c" | jq '.'
# curl -X GET "http://ec2-98-81-96-90.compute-1.amazonaws.com" | jq '.'