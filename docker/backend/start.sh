#!/bin/bash

redis-server /etc/redis/redis.conf &

sleep 5

node /root/backend/app.js

