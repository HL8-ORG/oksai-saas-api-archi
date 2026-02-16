#!/bin/bash
curl -s http://localhost:3000/ &
sleep 1
kill %!
